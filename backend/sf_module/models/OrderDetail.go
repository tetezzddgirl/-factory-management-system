package models

import "gorm.io/gorm"

// OrderDetail
type OrderDetail struct {
	gorm.Model
	OrderDetailID string  `gorm:"uniqueIndex;size:255" json:"order_detail_id"`
	Quantity      int     `json:"quantity"`
	UnitPrice     float64 `json:"unit_price"`
	Subtotal      float64 `json:"subtotal"`

	OrderID string `gorm:"size:255" json:"order_id"`
	Order   *Order `gorm:"foreignKey:OrderID;references:OrderID" json:"order,omitempty"`

	ProductID string   `gorm:"size:255" json:"product_id"`
	Product   *Product `gorm:"foreignKey:ProductID;references:ProductID" json:"product,omitempty"`
}

func (OrderDetail) TableName() string {
	return "sf_order_details"
}
