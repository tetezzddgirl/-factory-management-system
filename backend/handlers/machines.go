package handlers

import (
	"net/http"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MachineHandler struct {
	db *gorm.DB
}

func NewMachineHandler(db *gorm.DB) *MachineHandler {
	return &MachineHandler{db: db}
}

func (h *MachineHandler) ListMachines(c *gin.Context) {
	out := []models.Machine{}
	if err := h.db.Order("id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *MachineHandler) CreateMachine(c *gin.Context) {
	var m models.Machine
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Create(&m).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
