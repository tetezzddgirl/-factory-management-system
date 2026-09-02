package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedFormulas ใส่สูตรการผลิต (Formula/BOM) ตัวอย่าง: สินค้า 1 หน่วย ต้องใช้วัตถุดิบอะไรเท่าไหร่
// (ตัวเลขเป็นค่าตัวอย่างสำหรับสาธิตระบบเท่านั้น ไม่ใช่สูตรจริงของโรงงาน)
// ล้างของเดิมแล้วใส่ใหม่ทุกครั้งที่ seed เพราะ FormulaItem ใช้ autoincrement id ไม่เหมาะกับ upsert() แบบ pkColumn เดียว
func SeedFormulas(db *gorm.DB) {
	db.Exec("DELETE FROM formula_items")

	items := []models.FormulaItem{
		// BOM-001: ขวด PET 500ml (PRD-001)
		{FormulaID: "FOR-001", ProductID: "PRD-001", RmID: "RM-001", QtyPerUnit: 0.03, Unit: "kg"},
		{FormulaID: "FOR-001", ProductID: "PRD-001", RmID: "RM-002", QtyPerUnit: 1, Unit: "ชิ้น"},
		{FormulaID: "FOR-001", ProductID: "PRD-001", RmID: "RM-003", QtyPerUnit: 0.001, Unit: "ม้วน"},
		{FormulaID: "FOR-001", ProductID: "PRD-001", RmID: "RM-004", QtyPerUnit: 0.002, Unit: "ลิตร"},

		// BOM-002: ขวด PET 1L (PRD-002)
		{FormulaID: "FOR-002", ProductID: "PRD-002", RmID: "RM-001", QtyPerUnit: 0.06, Unit: "kg"},
		{FormulaID: "FOR-002", ProductID: "PRD-002", RmID: "RM-002", QtyPerUnit: 1, Unit: "ชิ้น"},
		{FormulaID: "FOR-002", ProductID: "PRD-002", RmID: "RM-003", QtyPerUnit: 0.001, Unit: "ม้วน"},
		{FormulaID: "FOR-002", ProductID: "PRD-002", RmID: "RM-004", QtyPerUnit: 0.003, Unit: "ลิตร"},

		// BOM-003: ฝาเกลียว (PRD-003)
		{FormulaID: "FOR-003", ProductID: "PRD-003", RmID: "RM-002", QtyPerUnit: 1, Unit: "ชิ้น"},

		// BOM-004: ขวด HDPE (PRD-004)
		{FormulaID: "FOR-004", ProductID: "PRD-004", RmID: "RM-001", QtyPerUnit: 0.05, Unit: "kg"},
		{FormulaID: "FOR-004", ProductID: "PRD-004", RmID: "RM-002", QtyPerUnit: 1, Unit: "ชิ้น"},
		{FormulaID: "FOR-004", ProductID: "PRD-004", RmID: "RM-003", QtyPerUnit: 0.001, Unit: "ม้วน"},
		{FormulaID: "FOR-004", ProductID: "PRD-004", RmID: "RM-004", QtyPerUnit: 0.002, Unit: "ลิตร"},
	}

	if err := db.Create(&items).Error; err != nil {
		panic("seed ตาราง formula_items ไม่สำเร็จ: " + err.Error())
	}
}
