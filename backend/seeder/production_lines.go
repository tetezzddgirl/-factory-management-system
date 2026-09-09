package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedProductionLines ใส่ข้อมูลสายการผลิตตัวอย่าง — ให้ตรงกับสายการผลิตที่ใช้อ้างอิงในขั้นตอนการผลิต (FormulaStep)
// และใช้เป็นตัวเลือก dropdown ตอนสร้างแผนการผลิต/ใบสั่งผลิต
func SeedProductionLines(db *gorm.DB) {
	upsert(db, "production_line_id", []models.ProductionLine{
		{ProductionlineID: 1, ProductionlineName: "สายการเป่าขวด L-01"},
		{ProductionlineID: 2, ProductionlineName: "สายการบรรจุ L-02"},
		{ProductionlineID: 3, ProductionlineName: "สายการฉีด L-03"},
		{ProductionlineID: 4, ProductionlineName: "สายการประกอบ L-04"},
	})
}
