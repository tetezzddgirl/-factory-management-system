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
		// if err := h.db.Preload("Locations").Order("rm_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *WarehouseHandler) PreviewNextLocationCodes(c *gin.Context) {
	palletNumber, err := nextSeqID(h.db, &models.RawMaterialLocation{}, "pallet_number", "PLT", time.Now().Format("20060102"), 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	lotMiddle := c.Query("orderID")
	if lotMiddle == "" {
		lotMiddle = time.Now().Format("060102")
	}
	lotNumber, err := nextSeqID(h.db, &models.RawMaterialLocation{}, "lot_number", "LOT", lotMiddle, 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"palletNumber": palletNumber, "lotNumber": lotNumber})
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
	if rm.Amount < 0 || rm.Min < 0 || rm.Max < 0{
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
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
	if body.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
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
	var body struct {
		models.RawMaterialLocation
		OrderID string `json:"orderID"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}

	loc := body.RawMaterialLocation
	if loc.RmLocationID == "" {
		loc.RmLocationID = fmt.Sprintf("RML-%s", time.Now().Format("20060102150405"))
	}
	if loc.RmID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "rmID is required"})
		return
	}

	// เช็คก่อนว่า pallet นี้เคยถูกใช้งานที่ตำแหน่งอื่นมาก่อนหรือไม่ ถ้าเคย ดึง LotNumber เดิมมาใช้
	if loc.LotNumber == "" && loc.PalletNumber != "" {
		var existing models.RawMaterialLocation
		if err := h.db.Where("pallet_number = ?", loc.PalletNumber).First(&existing).Error; err == nil {
			loc.LotNumber = existing.LotNumber
		}
	}

	// ยังไม่มี LotNumber (pallet ใหม่จริงๆ ไม่เคยมีในระบบ) -> generate ใหม่
	if loc.LotNumber == "" {
		lotMiddle := body.OrderID
		if lotMiddle == "" || lotMiddle == "-" {
			lotMiddle = time.Now().Format("060102")
		}
		id, err := nextSeqID(h.db, &models.RawMaterialLocation{}, "lot_number", "LOT", lotMiddle, 2)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		loc.LotNumber = id
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
	if body.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if err := h.db.Model(&models.RawMaterialLocation{}).Where("rm_location_id = ?", id).
		Updates(map[string]any{"amount": body.Amount, "location": body.Location}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *WarehouseHandler) ListRecords(c *gin.Context) {
	out := []models.RawMaterialRecord{}
	q := h.db.
		Select("raw_material_records.*, raw_material_locations.rm_id AS rm_id").
		Joins("JOIN raw_material_locations ON raw_material_locations.rm_location_id = raw_material_records.rm_location_id").
		Order("raw_material_records.timestamp DESC")

	if rmID := c.Query("rmID"); rmID != "" {
		q = q.Where("raw_material_locations.rm_id = ?", rmID)
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
	if rec.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if rec.RmRecordID == "" {
		rec.RmRecordID = fmt.Sprintf("RMR-%s", time.Now().Format("20060102150405"))
	}
	// ตรวจสอบว่า Location นี้มีจริงไหม
	var location models.RawMaterialLocation

	if err := h.db.
		Where("rm_location_id = ?", rec.RmLocationID).First(&location).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "raw material location not found"})
		return
	}
	rec.RmID = location.RmID
	if rec.Timestamp.IsZero() {
		rec.Timestamp = time.Now()
	}
	if err := h.db.Create(&rec).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rec)
}
