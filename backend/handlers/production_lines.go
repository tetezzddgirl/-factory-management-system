package handlers

import (
	"net/http"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductionLineHandler struct {
	db *gorm.DB
}

func NewProductionLineHandler(db *gorm.DB) *ProductionLineHandler {
	return &ProductionLineHandler{db: db}
}

func (h *ProductionLineHandler) ListProductionLines(c *gin.Context) {
	out := []models.ProductionLine{}
	if err := h.db.Order("id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

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
