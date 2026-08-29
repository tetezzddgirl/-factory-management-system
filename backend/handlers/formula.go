package handlers

import (
	"net/http"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FormulaHandler รวม dependency ของ endpoint ฝั่งสูตรการผลิต (Formula / BOM)
type FormulaHandler struct {
	db *gorm.DB
}

// NewFormulaHandler สร้าง FormulaHandler ตัวใหม่
func NewFormulaHandler(db *gorm.DB) *FormulaHandler {
	return &FormulaHandler{db: db}
}

// ListFormulas คืนรายการบรรทัดสูตรการผลิตทั้งหมด (ฝั่ง frontend ไปจัดกลุ่มตาม productID/bomID เอง)
func (h *FormulaHandler) ListFormulas(c *gin.Context) {
	out := []models.FormulaItem{}
	if err := h.db.Order("bom_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateFormulaItem เพิ่มบรรทัดสูตรการผลิต 1 รายการ (วัตถุดิบ 1 ชนิด + ปริมาณต่อหน่วย)
func (h *FormulaHandler) CreateFormulaItem(c *gin.Context) {
	var f models.FormulaItem
	if err := c.ShouldBindJSON(&f); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Create(&f).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, f)
}
