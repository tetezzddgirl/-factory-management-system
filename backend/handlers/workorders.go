package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WorkOrderHandler รวม dependency ของ endpoint ฝั่งใบสั่งผลิต (Work Orders / Production Orders)
type WorkOrderHandler struct {
	db *gorm.DB
}

// NewWorkOrderHandler สร้าง WorkOrderHandler ตัวใหม่
func NewWorkOrderHandler(db *gorm.DB) *WorkOrderHandler {
	return &WorkOrderHandler{db: db}
}

// orderOut คือรูปร่าง JSON ของใบสั่งผลิต — เพิ่ม productID/bomID/refBomID (join จาก RefBOM) ต่อจาก
// field เดิมที่ frontend ใช้อยู่แล้ว (timestamp..planID) เพื่อไม่ให้ของเดิมกระทบ
type orderOut struct {
	Timestamp time.Time `json:"timestamp"`
	OrderID   string    `json:"orderID"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Amount    int       `json:"amount"`
	Machines  string    `json:"machines"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	PlanID    string    `json:"planID"`
	ProductID string    `json:"productID"`
	BomID     string    `json:"bomID"`
	RefBomID  string    `json:"refBomID"`
}

func toOrderOut(o models.ProductionOrder, refBOMs map[string]models.RefBOM) orderOut {
	rb := refBOMs[o.RefBomID]
	return orderOut{
		Timestamp: o.Timestamp,
		OrderID:   o.OrderID,
		Name:      o.Name,
		Status:    o.Status,
		Amount:    o.Amount,
		Machines:  o.Machines,
		StartDate: o.StartDate,
		EndDate:   o.EndDate,
		PlanID:    o.PlanID,
		ProductID: rb.ProductID,
		BomID:     rb.BomID,
		RefBomID:  o.RefBomID,
	}
}

// ListWorkOrders คืนรายการใบสั่งผลิตทั้งหมด เรียงล่าสุดก่อน
func (h *WorkOrderHandler) ListWorkOrders(c *gin.Context) {
	orders := []models.ProductionOrder{}
	if err := h.db.Order("timestamp DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	refBomIDs := make([]string, 0, len(orders))
	for _, o := range orders {
		refBomIDs = append(refBomIDs, o.RefBomID)
	}
	refBOMs, err := refBOMMap(h.db, refBomIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]orderOut, 0, len(orders))
	for _, o := range orders {
		out = append(out, toOrderOut(o, refBOMs))
	}
	c.JSON(http.StatusOK, out)
}

func (h *WorkOrderHandler) GetWorkOrder(c *gin.Context) {
	id := c.Param("id")
	var o models.ProductionOrder
	if err := h.db.
		Preload("Work").
		Preload("Resources").
		Preload("Issues").
		Preload("RawMaterialRecords").
		Preload("WorkInProcessRecords").
		Preload("RequisitionSlips").
		Where("order_id = ?", id).First(&o).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, o)
}

// CreateWorkOrder สร้างใบสั่งผลิตใหม่ — RefBomID ไม่ได้รับมาจาก frontend ตรงๆ (ApiWorkOrder ฝั่ง frontend
// ไม่มี field นี้) แต่สืบทอดมาจาก ProductionPlan ต้นทางผ่าน PlanID ที่ frontend ส่งมาอยู่แล้ว
func (h *WorkOrderHandler) CreateWorkOrder(c *gin.Context) {
	var o models.ProductionOrder
	if err := c.ShouldBindJSON(&o); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if o.OrderID == "" {
		o.OrderID = fmt.Sprintf("WO-%d", time.Now().UnixNano())
	}
	if o.Status == "" {
		o.Status = "รอมอบหมาย"
	}
	if o.Timestamp.IsZero() {
		o.Timestamp = time.Now()
	}
	if o.PlanID != "" {
		var plan models.ProductionPlan
		if err := h.db.Where("plan_id = ?", o.PlanID).First(&plan).Error; err == nil {
			o.RefBomID = plan.RefBomID
		}
	}
	if err := h.db.Create(&o).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	refBOMs, err := refBOMMap(h.db, []string{o.RefBomID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toOrderOut(o, refBOMs))
}

// UpdateWorkOrderStatus แก้ไขสถานะ/เครื่องจักรของใบสั่งผลิตตาม orderID (path param: /api/work-orders/:id)
func (h *WorkOrderHandler) UpdateWorkOrderStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status   string `json:"status"`
		Machines string `json:"machines"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.ProductionOrder{}).Where("order_id = ?", id).
		Updates(map[string]any{"status": body.Status, "machines": body.Machines}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---- งานที่มอบหมาย (Work) ผูกกับใบสั่งผลิต ----

// ListWork คืนงานที่มอบหมายทั้งหมด (กรองด้วย orderID ได้)
func (h *WorkOrderHandler) ListWork(c *gin.Context) {
	out := []models.Work{}
	q := h.db.Order("work_id")
	if orderID := c.Query("orderID"); orderID != "" {
		q = q.Where("order_id = ?", orderID)
	}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateWork มอบหมายงานใหม่ให้กับใบสั่งผลิต
func (h *WorkOrderHandler) CreateWork(c *gin.Context) {
	var w models.Work
	if err := c.ShouldBindJSON(&w); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if w.WorkID == "" {
		w.WorkID = fmt.Sprintf("WRK-%d", time.Now().UnixNano())
	}
	if err := h.db.Create(&w).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

// DeleteWork - ฟังก์ชันลบงานออกจาก Database ตาม work_id
func (h *WorkOrderHandler) DeleteWork(c *gin.Context) { // หรือใช้อย่างอื่นแทน gin ตาม framework ที่ใช้
	workID := c.Param("id")

	// ลบข้อมูลแถวนั้นออกจากตาราง works ในฐานข้อมูล
	if err := h.db.Where("work_id = ?", workID).Delete(&models.Work{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete work"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}

// UpdateWork - แก้ไขข้อมูลงานตาม work_id
func (h *WorkOrderHandler) UpdateWork(c *gin.Context) {
    workID := c.Param("id")
    var body struct {
        Work        string `json:"work"`
        Description string `json:"description"`
        StartDate   string `json:"startDate"`
        EndDate     string `json:"endDate"`
    }
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
        return
    }

    if err := h.db.Model(&models.Work{}).Where("work_id = ?", workID).
        Updates(map[string]any{
            "work":        body.Work,
            "description": body.Description,
            "start_date":  body.StartDate,
            "end_date":    body.EndDate,
        }).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"ok": true})
}
