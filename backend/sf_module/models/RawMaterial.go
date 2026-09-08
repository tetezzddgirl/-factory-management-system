package models

import "gorm.io/gorm"

// RawMaterial
type RawMaterial struct {
	gorm.Model
	RawMaterialID string  `gorm:"uniqueIndex" json:"raw_material_id"`
	MaterialCode  string  `json:"material_code"`
	MaterialName  string  `json:"material_name"`
	Quantity      float64 `json:"quantity"`
	UnitID        string  `json:"unit_id"`
	Unit          UnitOfMeasure `gorm:"foreignKey:UnitID;references:UnitID" json:"unit,omitempty"`

}

func (RawMaterial) TableName() string {
	return "sf_raw_materials"
}
