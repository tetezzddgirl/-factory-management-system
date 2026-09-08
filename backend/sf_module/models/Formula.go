package models

import (
	"time"

	"gorm.io/gorm"
)

// Formula (BOM)
type Formula struct {
	gorm.Model
	FormulaID     string    `gorm:"uniqueIndex;size:255" json:"formula_id"` // เช่น BOM-001, BOM-002
	FormulaName   string    `json:"formula_name"`
	Version       int       `json:"version"`
	EffectiveDate time.Time `json:"effective_date"`
	Status        bool      `json:"status"`
	Description   string    `json:"description"`
	Steps         string    `json:"steps"` // ข้อความขั้นตอนการผลิต (แยกบรรทัดด้วย \n)

	ProductID string  `gorm:"size:255" json:"product_id"`
	Product   Product `gorm:"foreignKey:ProductID;references:ProductID" json:"product,omitempty"`

	FormulaSteps []FormulaStep `gorm:"foreignKey:FormulaID;references:FormulaID" json:"formula_steps,omitempty"`
}
func (Formula) TableName() string {
	return "sf_formulas"
}
