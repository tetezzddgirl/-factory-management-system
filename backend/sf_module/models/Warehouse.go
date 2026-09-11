package models

import "gorm.io/gorm"

// Warehouse
type Warehouse struct {
	gorm.Model
	WarehouseID   string `gorm:"uniqueIndex;size:255" json:"warehouse_id"`
	WarehouseName string `json:"warehouse_name"`
	Location      string `json:"location"`
	Capacity      int    `json:"capacity"`

	Inventories []Inventory `gorm:"foreignKey:WarehouseID;references:WarehouseID" json:"inventories,omitempty"`
}

func (Warehouse) TableName() string {
	return "sf_warehouses"
}
