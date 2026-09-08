package models

import "gorm.io/gorm"

// ProductOrder
type ProductOrder struct {
	gorm.Model
	ProductID   string  `gorm:"uniqueIndex;size:255" json:"product_id"`
	ProductCode string  `gorm:"size:255" json:"product_code"`
	ProductName string  `json:"product_name"`
	Category    string  `json:"category"`
	Size        string  `json:"size"`
	Unit        string  `json:"unit"`
	Price       float64 `json:"price"`
	Status      bool    `json:"status"`

	OrderDetails []OrderDetail `gorm:"foreignKey:ProductID;references:ProductID" json:"order_details,omitempty"`
	Inventories  []Inventory   `gorm:"foreignKey:ProductID;references:ProductID" json:"inventories,omitempty"`
}
func (ProductOrder) TableName() string {
	return "sf_product_orders"
}
