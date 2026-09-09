package handlers

import (
	"net/http"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ProductionLineHandler รวม dependency ของ endpoint ฝั่งสายการผลิต (Production Lines)
type ProductionLineHandler struct {
	db *gorm.DB
}

// NewProductionLineHandler สร้าง ProductionLineHandler ตัวใหม่
func NewProductionLineHandler(db *gorm.DB) *ProductionLineHandler {
	return &ProductionLineHandler{db: db}
}

// ListProductionLines คืนรายการสายการผลิตทั้งหมด — ใช้เติม dropdown ตอนสร้างแผนการผลิต/ใบสั่งผลิต
func (h *ProductionLineHandler) ListProductionLines(c *gin.Context) {
	out := []models.ProductionLine{}
	if err := h.db.Order("production_line_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateProductionLine เพิ่มสายการผลิตใหม่
func (h *ProductionLineHandler) CreateProductionLine(c *gin.Context) {
	var l models.ProductionLine
	if err := c.ShouldBindJSON(&l); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Create(&l).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, l)
}
