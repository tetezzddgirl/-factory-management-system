package models

import "gorm.io/gorm"

// UnitOfMeasure
type UnitOfMeasure struct {
	gorm.Model
	UnitID      string `gorm:"uniqueIndex;size:255" json:"unit_id"`
	UnitName    string `json:"unit_name"`
	UnitSymbol  string `json:"unit_symbol"`
	Description string `json:"description"`

	Products     []Product     `gorm:"foreignKey:UnitID;references:UnitID" json:"products,omitempty"`
	RawMaterials []RawMaterial `gorm:"foreignKey:UnitID;references:UnitID" json:"raw_materials,omitempty"`
}

func (UnitOfMeasure) TableName() string {
	return "sf_unit_of_measures"
}
