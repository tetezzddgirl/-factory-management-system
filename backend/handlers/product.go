package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ProductHandler รวม dependency ของ endpoint ฝั่งสินค้า/ผลิตภัณฑ์ (Product master data)
type ProductHandler struct {
	db *gorm.DB
}

// NewProductHandler สร้าง ProductHandler ตัวใหม่
func NewProductHandler(db *gorm.DB) *ProductHandler {
	return &ProductHandler{db: db}
}

// ListProducts คืนรายการสินค้าทั้งหมด
func (h *ProductHandler) ListProducts(c *gin.Context) {
	out := []models.Product{}
	if err := h.db.Order("product_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateProduct เพิ่มสินค้าใหม่ (gen id ให้ถ้าไม่ระบุมา)
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var p models.Product
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if p.ProductID == "" {
		p.ProductID = fmt.Sprintf("PRD-%d", time.Now().UnixNano())
	}
	if p.Unit == "" {
		p.Unit = "ชิ้น"
	}
	if err := h.db.Create(&p).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}
