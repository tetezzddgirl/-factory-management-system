package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WarehouseHandler รวม dependency ของ endpoint ฝั่งระบบคลังสินค้า/วัตถุดิบ (Warehouse & Inventory)
type WarehouseHandler struct {
	db *gorm.DB
}

// NewWarehouseHandler สร้าง WarehouseHandler ตัวใหม่
func NewWarehouseHandler(db *gorm.DB) *WarehouseHandler {
	return &WarehouseHandler{db: db}
}

// ListRawMaterials คืนรายการวัตถุดิบทั้งหมดในคลัง
func (h *WarehouseHandler) ListRawMaterials(c *gin.Context) {
	out := []models.RawMaterial{}
	if err := h.db.Order("rm_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetRawMaterial คืนวัตถุดิบ 1 ตัว พร้อม Locations/Records ที่ผูกอยู่ (path: /api/materials/:rmID/detail)
func (h *WarehouseHandler) GetRawMaterial(c *gin.Context) {
	rmID := c.Param("rmID")
	var rm models.RawMaterial
	if err := h.db.Preload("Locations").Preload("Records").
		Where("rm_id = ?", rmID).First(&rm).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, rm)
}

// CreateMaterial เพิ่มวัตถุดิบใหม่เข้าคลัง (รับเข้า) หรืออัปเดตถ้ามี rmID ซ้ำอยู่แล้ว
func (h *WarehouseHandler) CreateMaterial(c *gin.Context) {
	var rm models.RawMaterial
	if err := c.ShouldBindJSON(&rm); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Save(&rm).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rm)
}

// UpdateStock ปรับยอดคงเหลือของวัตถุดิบตาม rmID (path param: /api/materials/:rmID) — ใช้ตอนเบิกจ่าย/โอนย้าย/คืน
func (h *WarehouseHandler) UpdateStock(c *gin.Context) {
	rmID := c.Param("rmID")
	var body struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.RawMaterial{}).Where("rm_id = ?", rmID).
		Update("amount", body.Amount).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ListLocations คืนตำแหน่งจัดเก็บวัตถุดิบทั้งหมด (ทุก rmID) — ใช้กับตาราง "ตำแหน่งวัตถุดิบ"
func (h *WarehouseHandler) ListLocations(c *gin.Context) {
	out := []models.RawMaterialLocation{}
	q := h.db.Order("rm_location_id")
	if rmID := c.Query("rmID"); rmID != "" {
		q = q.Where("rm_id = ?", rmID)
	}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateLocation สร้างการจัดเก็บวัตถุดิบตำแหน่งใหม่ (rmLocationID ว่างได้ ระบบจะ gen ให้)
func (h *WarehouseHandler) CreateLocation(c *gin.Context) {
	var loc models.RawMaterialLocation
	if err := c.ShouldBindJSON(&loc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if loc.RmLocationID == "" {
		loc.RmLocationID = fmt.Sprintf("RMLO-%d", time.Now().UnixNano())
	}
	if err := h.db.Create(&loc).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loc)
}

// UpdateLocation แก้ไขจำนวน/ตำแหน่งของการจัดเก็บที่มีอยู่แล้ว (path param: /api/materials/locations/:id)
func (h *WarehouseHandler) UpdateLocation(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Amount   int    `json:"amount"`
		Location string `json:"location"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.RawMaterialLocation{}).Where("rm_location_id = ?", id).
		Updates(map[string]any{"amount": body.Amount, "location": body.Location}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ListRecords คืนประวัติรายการเคลื่อนไหวของวัตถุดิบ เรียงล่าสุดก่อน — ใช้กับ "รายการเคลื่อนไหวล่าสุด"
func (h *WarehouseHandler) ListRecords(c *gin.Context) {
	out := []models.RawMaterialRecord{}
	q := h.db.Order("timestamp DESC")
	if rmID := c.Query("rmID"); rmID != "" {
		q = q.Where("rm_id = ?", rmID)
	}
	if err := q.Limit(50).Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateRecord บันทึกรายการเคลื่อนไหววัตถุดิบใหม่ (รับเข้า/เบิกจ่าย/โอนย้าย/คืน)
func (h *WarehouseHandler) CreateRecord(c *gin.Context) {
	var rec models.RawMaterialRecord
	if err := c.ShouldBindJSON(&rec); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if rec.RmRecordID == "" {
		rec.RmRecordID = fmt.Sprintf("RMR-%d", time.Now().UnixNano())
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
