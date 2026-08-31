package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedProductionLines ใส่ข้อมูลสายการผลิตตัวอย่าง — ให้ตรงกับสายการผลิตที่ใช้อ้างอิงในขั้นตอนการผลิต (FormulaStep)
// และใช้เป็นตัวเลือก dropdown ตอนสร้างแผนการผลิต/ใบสั่งผลิต
func SeedProductionLines(db *gorm.DB) {
	upsert(db, "id", []models.ProductionLine{
		{ID: "L-01", Name: "สายการเป่าขวด L-01", Status: "ทำงาน"},
		{ID: "L-02", Name: "สายการบรรจุ L-02", Status: "ทำงาน"},
		{ID: "L-03", Name: "สายการฉีด L-03", Status: "ว่าง"},
		{ID: "L-04", Name: "สายการประกอบ L-04", Status: "ว่าง"},
	})
}
