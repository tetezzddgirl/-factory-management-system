package models

import (
	"time"

	"gorm.io/gorm"
)

// Inventory
type Inventory struct {
	gorm.Model
	InventoryID string    `gorm:"uniqueIndex;size:255" json:"inventory_id"`
	Quantity    int       `json:"quantity"`
	LastUpdated time.Time `json:"last_updated"`

	ProductID string   `gorm:"size:255" json:"product_id"`
	Product   *Product `gorm:"foreignKey:ProductID;references:ProductID" json:"product,omitempty"`

	WarehouseID string     `gorm:"size:255" json:"warehouse_id"`
	Warehouse   *Warehouse `gorm:"foreignKey:WarehouseID;references:WarehouseID" json:"warehouse,omitempty"`
}

func (Inventory) TableName() string {
	return "sf_inventories"
}
