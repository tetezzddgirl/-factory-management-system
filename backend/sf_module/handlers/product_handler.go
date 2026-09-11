package handlers

import (
	"net/http"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

type ProductResponse struct {
	ID         string `json:"id"`
	Code       string `json:"code"`
	Name       string `json:"name"`
	Category   string `json:"category"`
	BomVersion string `json:"bomVersion"`
}

// GetProducts returns all products formatted for frontend Product
func GetProducts(c *gin.Context) {
	var products []models.Product
	err := database.DB.Preload("ProductCategory").Preload("Formulas").Find(&products).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]ProductResponse, 0)
	for _, p := range products {
		catName := "บรรจุภัณฑ์"
		if p.ProductCategory.CategoryName != "" {
			catName = p.ProductCategory.CategoryName
		}
		bomVer := "v1"
		if len(p.Formulas) > 0 {
			bomVer = "v" + string(rune('0'+p.Formulas[0].Version))
		} else if p.ProductID == "p1" {
			bomVer = "v3"
		} else if p.ProductID == "p2" {
			bomVer = "v2"
		}

		result = append(result, ProductResponse{
			ID:         p.ProductID,
			Code:       p.ProductCode,
			Name:       p.ProductName,
			Category:   catName,
			BomVersion: bomVer,
		})
	}

	c.JSON(http.StatusOK, result)
}

// CreateProduct creates a new product
func CreateProduct(c *gin.Context) {
	var req struct {
		ID                string `json:"id"`
		Code              string `json:"code"`
		Name              string `json:"name"`
		Category          string `json:"category"`
		BomVersion        string `json:"bomVersion"`
		ProductCode       string `json:"product_code"`
		ProductName       string `json:"product_name"`
		ProductCategoryID string `json:"product_category_id"`
		UnitID            string `json:"unit_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prodID := req.ID
	if prodID == "" {
		prodID = req.Code
	}
	if prodID == "" {
		prodID = req.ProductCode
	}

	prodCode := req.Code
	if prodCode == "" {
		prodCode = req.ProductCode
	}
	if prodCode == "" {
		prodCode = prodID
	}

	prodName := req.Name
	if prodName == "" {
		prodName = req.ProductName
	}

	p := models.Product{
		ProductID:         prodID,
		ProductCode:       prodCode,
		ProductName:       prodName,
		ProductCategoryID: "CAT-01",
		UnitID:            "U-01",
	}

	if err := database.DB.Where("product_id = ? OR product_code = ?", prodID, prodCode).First(&models.Product{}).Error; err != nil {
		database.DB.Create(&p)
	} else {
		database.DB.Model(&models.Product{}).Where("product_id = ? OR product_code = ?", prodID, prodCode).Updates(p)
	}

	c.JSON(http.StatusCreated, p)
}

// DeleteProduct deletes a product by ID or ProductCode
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Where("product_id = ? OR product_code = ?", id, id).Delete(&models.Product{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}
