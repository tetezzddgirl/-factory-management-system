package models

import (
	"time"

	"gorm.io/gorm"
)

// Shipment
type Shipment struct {
	gorm.Model
	ShipmentID     string    `gorm:"uniqueIndex;size:255" json:"shipment_id"`
	ShipmentDate   time.Time `json:"shipment_date"`
	DeliveryDate   time.Time `json:"delivery_date"`
	ShipmentStatus  string    `json:"shipment_status"`
	TrackingNumber  string    `json:"tracking_number"`
	CustomerName    string    `json:"customer_name"`
	ShippingAddress string    `json:"shipping_address"`

	OrderID string `gorm:"size:255" json:"order_id"`
	Order   Order  `gorm:"foreignKey:OrderID;references:OrderID" json:"order,omitempty"`
}

func (Shipment) TableName() string {
	return "sf_shipments"
}
