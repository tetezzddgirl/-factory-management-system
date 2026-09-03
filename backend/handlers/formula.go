package handlers

import (
	"net/http"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FormulaHandler struct {
	db *gorm.DB
}

func NewFormulaHandler(db *gorm.DB) *FormulaHandler {
	return &FormulaHandler{db: db}
}

func (h *FormulaHandler) ListFormulas(c *gin.Context) {
	out := []models.FormulaItem{}
	if err := h.db.Order("formula_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

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

func (h *FormulaHandler) ListFormulaSteps(c *gin.Context) {
	out := []models.FormulaStep{}
	if err := h.db.Order("formula_id, step_no").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *FormulaHandler) CreateFormulaStep(c *gin.Context) {
	var s models.FormulaStep
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if s.StepNo == 0 {
		var maxStep int
		h.db.Model(&models.FormulaStep{}).Where("formula_id = ?", s.FormulaID).
			Select("COALESCE(MAX(step_no), 0)").Scan(&maxStep)
		s.StepNo = maxStep + 1
	}
	if err := h.db.Create(&s).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}
