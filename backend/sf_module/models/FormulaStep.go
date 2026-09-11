package models

import (
	"gorm.io/gorm"
)

// FormulaStep (ขั้นตอนการผลิตของแต่ละสูตร BOM)
type FormulaStep struct {
	gorm.Model
	FormulaID   string `gorm:"size:255;index" json:"formula_id"`  // อ้างอิง Formula (BOM)
	StepNumber  int    `json:"step_number"`                       // ลำดับขั้นตอน เช่น 1, 2, 3
	StepName    string `gorm:"size:500" json:"step_name"`         // รายละเอียดขั้นตอน เช่น "หลอมพลาสติก"
	Machine     string `gorm:"size:100" json:"machine,omitempty"` // เครื่องจักรที่ใช้ เช่น "M-01"
	DurationMin int    `json:"duration_min,omitempty"`            // เวลามาตรฐาน (นาที)
}

func (FormulaStep) TableName() string {
	return "sf_formula_steps"
}
