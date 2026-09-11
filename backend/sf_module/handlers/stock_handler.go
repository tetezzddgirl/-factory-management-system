package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/sf_module/database"
	"factoryflow/sf_module/models"

	"github.com/gin-gonic/gin"
)

type StockItemResponse struct {
	ID            string `json:"id"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	Quantity      int    `json:"quantity"`
	Unit          string `json:"unit"`
	Location      string `json:"location"`
	Palette       string `json:"palette,omitempty"`
	Lot           string `json:"lot,omitempty"`
	WarehouseID   string `json:"warehouseId,omitempty"`
	WarehouseName string `json:"warehouseName,omitempty"`
}

// GetWarehouses returns all mock warehouses
func GetWarehouses(c *gin.Context) {
	var list []models.Warehouse
	if err := database.DB.Order("warehouse_id ASC").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

// GetStock returns all inventory items formatted for frontend StockItem
func GetStock(c *gin.Context) {
	var inventories []models.Inventory
	err := database.DB.Preload("Product").Preload("Product.Unit").Preload("Warehouse").Find(&inventories).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	result := make([]StockItemResponse, 0)
	for _, inv := range inventories {
		unitName := "ชิ้น"
		if inv.Product.Unit.UnitName != "" {
			unitName = inv.Product.Unit.UnitName
		}
		loc := "A-01"
		if inv.Warehouse.Location != "" {
			loc = inv.Warehouse.Location
		}
		code := inv.Product.ProductCode
		if code == "" {
			code = inv.ProductID
		}
		name := inv.Product.ProductName
		if name == "" {
			name = inv.ProductID
		}
		whName := inv.Warehouse.WarehouseName
		if whName == "" && inv.WarehouseID != "" {
			whName = inv.WarehouseID
		}
		result = append(result, StockItemResponse{
			ID:            inv.InventoryID,
			Code:          code,
			Name:          name,
			Quantity:      inv.Quantity,
			Unit:          unitName,
			Location:      loc,
			WarehouseID:   inv.WarehouseID,
			WarehouseName: whName,
		})
	}

	c.JSON(http.StatusOK, result)
}

// PostStockTransaction handles stock in/out transactions
func PostStockTransaction(c *gin.Context) {
	var tx models.StockTransaction
	if err := c.ShouldBindJSON(&tx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if tx.TransactionID == "" {
		tx.TransactionID = fmt.Sprintf("tx-%d", time.Now().UnixNano())
	}
	if tx.CreatedAtStr == "" {
		tx.CreatedAtStr = time.Now().Format("2006-01-02 15:04:05")
	}

	targetWh := tx.WarehouseID
	if targetWh == "" {
		targetWh = "WH-01"
	}

	// Lookup warehouse name if not provided
	if tx.WarehouseName == "" {
		var wh models.Warehouse
		if err := database.DB.Where("warehouse_id = ?", targetWh).First(&wh).Error; err == nil {
			tx.WarehouseName = wh.WarehouseName
		}
	}

	// 1. Save transaction history
	if err := database.DB.Create(&tx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 2. Find or Create Product
	var prod models.Product
	if err := database.DB.Where("product_code = ? OR product_id = ?", tx.Code, tx.Code).First(&prod).Error; err != nil {
		prod = models.Product{
			ProductID:         tx.Code,
			ProductCode:       tx.Code,
			ProductName:       tx.Name,
			ProductCategoryID: "CAT-01",
			UnitID:            "U-01",
		}
		database.DB.Create(&prod)
	}

	// 3. Find or Create Inventory record in table 'sf_inventories' by Product AND Warehouse
	var inv models.Inventory
	if err := database.DB.Where("(product_id = ? OR product_id = ?) AND warehouse_id = ?", prod.ProductID, prod.ProductCode, targetWh).First(&inv).Error; err != nil {
		// New inventory record -> INSERT into inventories table
		invQty := tx.Quantity
		if tx.Type == "issue" {
			invQty = 0
		}
		inv = models.Inventory{
			InventoryID: fmt.Sprintf("s%d", time.Now().UnixNano()%1000000),
			ProductID:   prod.ProductID,
			WarehouseID: targetWh,
			Quantity:    invQty,
			LastUpdated: time.Now(),
		}
		database.DB.Create(&inv)
	} else {
		// Existing inventory record -> UPDATE quantity in inventories table
		if tx.Type == "receive" {
			inv.Quantity += tx.Quantity
		} else if tx.Type == "issue" {
			inv.Quantity -= tx.Quantity
			if inv.Quantity < 0 {
				inv.Quantity = 0
			}
		}
		inv.LastUpdated = time.Now()
		database.DB.Save(&inv)
	}

	c.JSON(http.StatusCreated, tx)
}
