package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WipHandler รวม dependency ของ endpoint ฝั่งสินค้าระหว่างผลิต (Work In Process)
type WipHandler struct {
	db *gorm.DB
}

// NewWipHandler สร้าง WipHandler ตัวใหม่
func NewWipHandler(db *gorm.DB) *WipHandler {
	return &WipHandler{db: db}
}

// ---- ยอดคงเหลือ WIP ----

// ListWorkInProcess คืนยอดคงเหลือสินค้าระหว่างผลิตทั้งหมด
func (h *WipHandler) ListWorkInProcess(c *gin.Context) {
	out := []models.WorkInProcess{}
	if err := h.db.Order("wip_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateWorkInProcess เพิ่ม/อัปเดตสินค้าระหว่างผลิต (รับเข้าใหม่)
func (h *WipHandler) CreateWorkInProcess(c *gin.Context) {
	var w models.WorkInProcess
	if err := c.ShouldBindJSON(&w); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Save(&w).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

// UpdateWorkInProcessAmount ปรับยอดคงเหลือของ WIP ตาม wipID (path param: /api/wip/:wipID)
func (h *WipHandler) UpdateWorkInProcessAmount(c *gin.Context) {
	wipID := c.Param("wipID")
	var body struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.WorkInProcess{}).Where("wip_id = ?", wipID).
		Update("amount", body.Amount).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---- ตำแหน่งจัดเก็บ WIP ----

// ListWipLocations คืนตำแหน่งจัดเก็บ WIP ทั้งหมด (กรองด้วย wipID ได้)
func (h *WipHandler) ListWipLocations(c *gin.Context) {
	out := []models.WIPLocation{}
	q := h.db.Order("wip_location_id")
	if wipID := c.Query("wipID"); wipID != "" {
		q = q.Where("wip_id = ?", wipID)
	}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateWipLocation สร้างตำแหน่งจัดเก็บ WIP ใหม่
func (h *WipHandler) CreateWipLocation(c *gin.Context) {
	var loc models.WIPLocation
	if err := c.ShouldBindJSON(&loc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if loc.WipLocationID == "" {
		loc.WipLocationID = fmt.Sprintf("WLO-%d", time.Now().UnixNano())
	}
	if err := h.db.Create(&loc).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loc)
}

// UpdateWipLocation อัปเดตตำแหน่งจัดเก็บหรือจำนวนคงเหลือตาม wipLocationID (path param: /api/wip-locations/:id)
func (h *WipHandler) UpdateWipLocation(c *gin.Context) {
	fmt.Println("🔥 HIT UpdateWipLocation! ID:", c.Param("id"))
	id := c.Param("id")
	var body struct {
		Location string `json:"location"`
		Amount   int    `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	updates := map[string]interface{}{}
	if body.Location != "" {
		updates["location"] = body.Location
	}
	if body.Amount >= 0 {
		updates["amount"] = body.Amount
	}

	if err := h.db.Model(&models.WIPLocation{}).Where("wip_location_id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ---- ประวัติรายการเคลื่อนไหว WIP ----

// ListWipRecords คืนประวัติรายการเคลื่อนไหวของ WIP เรียงล่าสุดก่อน (กรองด้วย wipID ได้)
func (h *WipHandler) ListWipRecords(c *gin.Context) {
	out := []models.WorkInProcessRecord{}
	q := h.db.Order("timestamp DESC")
	if wipID := c.Query("wipID"); wipID != "" {
		q = q.Where("wip_id = ?", wipID)
	}
	if err := q.Limit(50).Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateWipRecord บันทึกรายการเคลื่อนไหว WIP ใหม่ (รับเข้า/โอนย้าย/เบิกจ่าย/คืน)
func (h *WipHandler) CreateWipRecord(c *gin.Context) {
	var rec models.WorkInProcessRecord
	if err := c.ShouldBindJSON(&rec); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if rec.WipRecordID == "" {
		rec.WipRecordID = fmt.Sprintf("WR-%d", time.Now().UnixNano())
	}
	if rec.Timestamp.IsZero() {
		rec.Timestamp = time.Now()
	}
	if err := h.db.Create(&rec).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rec)
}

// ---- ใบเบิกจ่าย (Requisition Slips) ----

// ListRequisitionSlips คืนใบเบิกจ่ายทั้งหมด เรียงล่าสุดก่อน
func (h *WipHandler) ListRequisitionSlips(c *gin.Context) {
	out := []models.RequisitionSlip{}
	if err := h.db.Order("timestamp DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateRequisitionSlip สร้างใบเบิกจ่ายใหม่ (สถานะเริ่มต้น "รออนุมัติ")
func (h *WipHandler) CreateRequisitionSlip(c *gin.Context) {
	var slip models.RequisitionSlip
	if err := c.ShouldBindJSON(&slip); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if slip.SlipID == "" {
		slip.SlipID = fmt.Sprintf("SID-%d", time.Now().UnixNano())
	}
	if slip.Status == "" {
		slip.Status = "รออนุมัติ"
	}
	if slip.Timestamp.IsZero() {
		slip.Timestamp = time.Now()
	}
	if err := h.db.Create(&slip).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, slip)
}