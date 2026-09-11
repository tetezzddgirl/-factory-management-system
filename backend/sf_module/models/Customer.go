package models

import "gorm.io/gorm"

// Customer
type Customer struct {
	gorm.Model
	CustomerID   int    `gorm:"uniqueIndex" json:"customer_id"`
	CustomerName string `json:"customer_name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Address      string `json:"address"`

	Orders []Order `gorm:"foreignKey:CustomerID;references:CustomerID" json:"orders,omitempty"`
}

func (Customer) TableName() string {
	return "sf_customers"
}
