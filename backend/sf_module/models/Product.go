package models

import "gorm.io/gorm"

// Product
type Product struct {
	gorm.Model
	ProductID    string  `gorm:"uniqueIndex;size:255" json:"product_id"`
	ProductCode  string  `gorm:"size:255" json:"product_code"`
	ProductName  string  `json:"product_name"`
	Size         string  `json:"size"`
	SellingPrice float64 `json:"selling_price"`
	Description  string  `json:"description"`

	ProductCategoryID string           `gorm:"size:255" json:"product_category_id"`
	ProductCategory   *ProductCategory `gorm:"foreignKey:ProductCategoryID;references:ProductCategoryID" json:"product_category,omitempty"`

	UnitID string         `gorm:"size:255" json:"unit_id"`
	Unit   *UnitOfMeasure `gorm:"foreignKey:UnitID;references:UnitID" json:"unit,omitempty"`

	Formulas []Formula `gorm:"foreignKey:ProductID;references:ProductID" json:"formulas,omitempty"`
}

func (Product) TableName() string {
	return "sf_products"
}
