package handlers

import (
	"net/http"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

type RawMaterialResponse struct {
	ID           string  `json:"id"`
	MaterialCode string  `json:"materialCode"`
	MaterialName string  `json:"materialName"`
	Quantity     float64 `json:"quantity"`
	Unit         string  `json:"unit"`
}

// GetRawMaterials returns all raw materials
func GetRawMaterials(c *gin.Context) {
	var materials []models.RawMaterial
	err := database.DB.Preload("Unit").Find(&materials).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]RawMaterialResponse, 0)
	for _, m := range materials {
		unitName := "kg"
		if m.Unit.UnitName != "" {
			unitName = m.Unit.UnitName
		}
		result = append(result, RawMaterialResponse{
			ID:           m.RawMaterialID,
			MaterialCode: m.MaterialCode,
			MaterialName: m.MaterialName,
			Quantity:     m.Quantity,
			Unit:         unitName,
		})
	}

	c.JSON(http.StatusOK, result)
}

// CreateRawMaterial creates a new raw material
func CreateRawMaterial(c *gin.Context) {
	var m models.RawMaterial
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&m).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, m)
}
