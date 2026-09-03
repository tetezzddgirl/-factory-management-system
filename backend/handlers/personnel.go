package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PersonnelHandler struct {
	db *gorm.DB
}

func NewPersonnelHandler(db *gorm.DB) *PersonnelHandler {
	return &PersonnelHandler{db: db}
}

func (h *PersonnelHandler) ListPersonnel(c *gin.Context) {
	out := []models.Personnel{}
	if err := h.db.Order("id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *PersonnelHandler) CreatePersonnel(c *gin.Context) {
	var p models.Personnel
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if p.ID == "" {
		p.ID = fmt.Sprintf("PSN-%d", time.Now().UnixNano())
	}
	if p.Status == "" {
		p.Status = "กำลังทำงาน"
	}
	if err := h.db.Create(&p).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *PersonnelHandler) UpdatePersonnelStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.Personnel{}).Where("id = ?", id).
		Update("status", body.Status).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
