package models

import (
	"time"

	"gorm.io/gorm"
)

// Order
type Order struct {
	gorm.Model
	OrderID    string    `gorm:"type:varchar(255);unique;not null" json:"order_id"`
	OrderDate  time.Time `json:"order_date"`
	TotalPrice float64   `json:"total_price"`

	CustomerID int       `json:"customer_id"`
	Customer   *Customer `gorm:"foreignKey:CustomerID;references:CustomerID" json:"customer,omitempty"`

	OrderDetails []OrderDetail `gorm:"foreignKey:OrderID;references:OrderID" json:"order_details,omitempty"`
	Shipments    []Shipment    `gorm:"foreignKey:OrderID;references:OrderID" json:"shipments,omitempty"`
}

func (Order) TableName() string {
	return "sf_orders"
}
