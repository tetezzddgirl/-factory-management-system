package models

import "gorm.io/gorm"

// ProductCategory
type ProductCategory struct {
	gorm.Model
	ProductCategoryID string `gorm:"uniqueIndex;size:255" json:"product_category_id"`
	CategoryName      string `json:"category_name"`
	Description       string `json:"description"`

	Products []Product `gorm:"foreignKey:ProductCategoryID;references:ProductCategoryID" json:"products,omitempty"`
}

func (ProductCategory) TableName() string {
	return "sf_product_categories"
}
