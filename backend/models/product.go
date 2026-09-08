package models

type Product struct {
	ProductID 		string `json:"product_id" gorm:"primaryKey;column:product_id"`
	ProductName     string `json:"product_name"`
	//Unit      string `json:"unit" gorm:"default:ชิ้น"`
}
