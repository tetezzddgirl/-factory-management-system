package models

type Product struct {
	ProductID string `json:"productID" gorm:"primaryKey;column:product_id"`
	Name      string `json:"name" gorm:"not null"`
	Unit      string `json:"unit" gorm:"default:ชิ้น"`
}
