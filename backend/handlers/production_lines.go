package handlers

import (
	"errors"
	"net/http"
	"strings"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ProductionLineHandler รวม dependency ของ endpoint ฝั่งสายการผลิต (Production Lines)
//
// สายการผลิตถูกใช้ 2 ที่: เป็นตัวเลือก dropdown ตอนสร้างแผนการผลิต/ใบสั่งผลิต
// และเป็นสายที่ใช้จัดลำดับเครื่องจักรในหน้า "เครื่องจักร" (พอร์ตจาก Machinery-maintenance)
type ProductionLineHandler struct {
	db *gorm.DB
}

// NewProductionLineHandler สร้าง ProductionLineHandler ตัวใหม่
func NewProductionLineHandler(db *gorm.DB) *ProductionLineHandler {
	return &ProductionLineHandler{db: db}
}

// ListProductionLines คืนรายการสายการผลิตทั้งหมด
func (h *ProductionLineHandler) ListProductionLines(c *gin.Context) {
	out := []models.ProductionLine{}
	if err := h.db.Order("production_line_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetProductionLine คืนสายการผลิตเส้นเดียว
func (h *ProductionLineHandler) GetProductionLine(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}
	var l models.ProductionLine
	if err := h.db.First(&l, "production_line_id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบสายการผลิตนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, l)
}

// CreateProductionLine เพิ่มสายการผลิตใหม่ (production_line_id เป็น auto increment ฝั่ง DB)
func (h *ProductionLineHandler) CreateProductionLine(c *gin.Context) {
	var in struct {
		ProductionlineName string `json:"productionline_name"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	name := strings.TrimSpace(in.ProductionlineName)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุชื่อสายการผลิต"})
		return
	}

	l := models.ProductionLine{ProductionlineName: name}
	if err := h.db.Create(&l).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, l)
}

// UpdateProductionLine แก้ไขชื่อสายการผลิต
func (h *ProductionLineHandler) UpdateProductionLine(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	var in struct {
		ProductionlineName string `json:"productionline_name"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	name := strings.TrimSpace(in.ProductionlineName)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุชื่อสายการผลิต"})
		return
	}

	var l models.ProductionLine
	if err := h.db.First(&l, "production_line_id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบสายการผลิตนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := h.db.Model(&l).Update("productionline_name", name).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, l)
}

// DeleteProductionLine ลบสายการผลิต
//
// เอาเครื่องจักรที่อยู่ในสายนี้ออกก่อน ไม่ให้เหลือ production_line_id ที่ชี้ไปสายที่ถูกลบไปแล้ว
// (พอร์ตพฤติกรรมมาจาก Machinery-maintenance: productionlineService.DeleteProductionline)
func (h *ProductionLineHandler) DeleteProductionLine(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		return
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Machinery{}).Where("production_line_id = ?", id).
			Updates(map[string]any{"production_line_id": nil, "line_order": 0}).Error; err != nil {
			return err
		}
		return tx.Where("production_line_id = ?", id).Delete(&models.ProductionLine{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
