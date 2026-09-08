package handlers

import (
	"net/http"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

// GetCustomers returns all customers
func GetCustomers(c *gin.Context) {
	var customers []models.Customer
	if err := database.DB.Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, customers)
}

// CreateCustomer creates a new customer
func CreateCustomer(c *gin.Context) {
	var cust models.Customer
	if err := c.ShouldBindJSON(&cust); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Create(&cust).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cust)
}
