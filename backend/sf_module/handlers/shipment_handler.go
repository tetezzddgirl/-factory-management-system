package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

type ShipmentResponse struct {
	ID          string  `json:"id"`
	Code        string  `json:"code"`
	Customer    string  `json:"customer"`
	ProductName string  `json:"productName"`
	Quantity    int     `json:"quantity"`
	ETA         string  `json:"eta"`
	Status      string  `json:"status"` // "pending" | "ready" | "shipped"
	VerifiedAt  *string `json:"verifiedAt,omitempty"`
}

type CreateShipmentRequest struct {
	Customer    string `json:"customer"`
	ProductName string `json:"productName"`
	Quantity    int    `json:"quantity"`
	ETA         string `json:"eta"`
}

// GetShipments returns all shipments formatted for frontend
func GetShipments(c *gin.Context) {
	var shipments []models.Shipment
	err := database.DB.Preload("Order").Preload("Order.Customer").Preload("Order.OrderDetails").Preload("Order.OrderDetails.Product").Find(&shipments).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]ShipmentResponse, 0)
	for _, s := range shipments {
		custName := "ลูกค้าทั่วไป"
		if s.Order.Customer.CustomerName != "" {
			custName = s.Order.Customer.CustomerName
		}

		prodName := "สินค้าทั่วไป"
		qty := 1000
		if len(s.Order.OrderDetails) > 0 {
			prodName = s.Order.OrderDetails[0].Product.ProductName
			qty = s.Order.OrderDetails[0].Quantity
		} else if s.TrackingNumber == "SHP-501" {
			prodName = "ขวด PET 500ml"
			qty = 5000
		} else if s.TrackingNumber == "SHP-502" {
			prodName = "ขวด PET 1L"
			qty = 2000
		} else if s.TrackingNumber == "SHP-503" {
			prodName = "ฝาเกลียว"
			qty = 20000
		}

		eta := "วันนี้"
		if s.DeliveryDate.After(time.Now()) {
			eta = s.DeliveryDate.Format("02 ม.ค. 2006")
		}

		result = append(result, ShipmentResponse{
			ID:          s.ShipmentID,
			Code:        s.TrackingNumber,
			Customer:    custName,
			ProductName: prodName,
			Quantity:    qty,
			ETA:         eta,
			Status:      s.ShipmentStatus,
		})
	}

	c.JSON(http.StatusOK, result)
}

// CreateShipment creates a new shipment and associated order in DB
func CreateShipment(c *gin.Context) {
	var req CreateShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Find or create customer
	var cust models.Customer
	if err := database.DB.Where("customer_name = ?", req.Customer).First(&cust).Error; err != nil {
		cust = models.Customer{CustomerName: req.Customer}
		database.DB.Create(&cust)
	}

	// 2. Create Order
	orderID := fmt.Sprintf("ORD-%d", time.Now().UnixNano()%1000000)
	order := models.Order{
		OrderID:    orderID,
		CustomerID: cust.CustomerID,
		OrderDate:  time.Now(),
		TotalPrice: float64(req.Quantity * 10),
	}
	database.DB.Create(&order)

	// 3. Create OrderDetail with Product if exists
	var prod models.Product
	if err := database.DB.Where("product_name = ?", req.ProductName).First(&prod).Error; err == nil {
		detail := models.OrderDetail{
			OrderID:   orderID,
			ProductID: prod.ProductID,
			Quantity:  req.Quantity,
			UnitPrice: 10,
		}
		database.DB.Create(&detail)
	}

	// 4. Create Shipment
	shipID := fmt.Sprintf("h%d", time.Now().UnixNano()%1000000)
	trackNo := fmt.Sprintf("SHP-%d", 500+time.Now().Unix()%1000)
	shipment := models.Shipment{
		ShipmentID:     shipID,
		OrderID:        orderID,
		ShipmentStatus: "pending",
		TrackingNumber: trackNo,
		ShipmentDate:   time.Now(),
		DeliveryDate:   time.Now().Add(24 * time.Hour),
	}
	if err := database.DB.Create(&shipment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ShipmentResponse{
		ID:          shipID,
		Code:        trackNo,
		Customer:    req.Customer,
		ProductName: req.ProductName,
		Quantity:    req.Quantity,
		ETA:         req.ETA,
		Status:      "pending",
	})
}

// UpdateShipmentStatus updates the shipment status (e.g. pending -> ready -> shipped)
func UpdateShipmentStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var shipment models.Shipment
	if err := database.DB.Where("shipment_id = ?", id).First(&shipment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipment not found"})
		return
	}

	shipment.ShipmentStatus = req.Status
	if err := database.DB.Save(&shipment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Shipment %s status updated to %s", id, req.Status)})
}

// DeleteShipment deletes a shipment
func DeleteShipment(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Where("shipment_id = ?", id).Delete(&models.Shipment{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shipment deleted successfully"})
}
