package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedPlans ใส่แผนการผลิตตัวอย่าง (ProductionPlan ใช้กับหน้า "วางแผนการผลิต")
// ต้องใส่ RefBOM (คู่ product+bom ที่แผนแต่ละอันเลือกใช้) ก่อน แล้วค่อยผูก RefBomID เข้ากับแผน
// refBomID ใช้รูปแบบเดียวกับที่ resolveRefBOM() ใน handlers สร้างให้ตอน runtime คือ "REFBOM-<productID>-<bomID>"
func SeedPlans(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour

	upsert(db, "ref_formula_id", []models.RefFormula{
		{RefFormulaID: "REFFOR-PRD-001-FOR-001", ProductID: "PRD-001", FormulaID: "FOR-001"},
		{RefFormulaID: "REFFOR-PRD-002-FOR-002", ProductID: "PRD-002", FormulaID: "FOR-002"},
		{RefFormulaID: "REFFOR-PRD-003-FOR-003", ProductID: "PRD-003", FormulaID: "FOR-003"},
		{RefFormulaID: "REFFOR-PRD-004-FOR-004", ProductID: "PRD-004", FormulaID: "FOR-004"},
	})

	upsert(db, "plan_id", []models.ProductionPlan{
		{Timestamp: now, PlanID: "PLAN-2025-07-01-001", Name: "ขวด PET 500ml", Status: "กำลังผลิต", Amount: 12000, Priority: "สูง", StartDate: now.Add(-2 * day), EndDate: now.Add(5 * day), RefFormulaID: "REFFOR-PRD-001-FOR-001"},
		{Timestamp: now, PlanID: "PLAN-2025-07-02-001", Name: "ขวด PET 1L", Status: "กำลังผลิต", Amount: 6000, Priority: "ปกติ", StartDate: now.Add(-1 * day), EndDate: now.Add(7 * day), RefFormulaID: "REFFOR-PRD-002-FOR-002"},
		{Timestamp: now, PlanID: "PLAN-2025-07-03-001", Name: "ฝาเกลียว", Status: "เสร็จสิ้น", Amount: 20000, Priority: "ต่ำ", StartDate: now.Add(-5 * day), EndDate: now.Add(-1 * day), RefFormulaID: "REFFOR-PRD-003-FOR-003"},
		{Timestamp: now, PlanID: "PLAN-2025-07-04-001", Name: "ขวด HDPE", Status: "รอเริ่ม", Amount: 5000, Priority: "ปกติ", StartDate: now.Add(2 * day), EndDate: now.Add(12 * day), RefFormulaID: "REFFOR-PRD-004-FOR-004"},
	})
}
