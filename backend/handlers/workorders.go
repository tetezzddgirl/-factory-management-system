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

// ListWorkOrders คืนรายการใบสั่งผลิตทั้งหมด เรียงล่าสุดก่อน
func (h *WorkOrderHandler) ListWorkOrders(c *gin.Context) {
	out := []models.ProductionOrder{}
	if err := h.db.Order("timestamp DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateWorkOrder สร้างใบสั่งผลิตใหม่
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
	if err := h.db.Create(&o).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, o)
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
