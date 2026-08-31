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

	upsert(db, "ref_bom_id", []models.RefBOM{
		{RefBomID: "REFBOM-PRD-001-BOM-001", ProductID: "PRD-001", BomID: "BOM-001"},
		{RefBomID: "REFBOM-PRD-002-BOM-002", ProductID: "PRD-002", BomID: "BOM-002"},
		{RefBomID: "REFBOM-PRD-003-BOM-003", ProductID: "PRD-003", BomID: "BOM-003"},
		{RefBomID: "REFBOM-PRD-004-BOM-004", ProductID: "PRD-004", BomID: "BOM-004"},
	})

	upsert(db, "plan_id", []models.ProductionPlan{
		{Timestamp: now, PlanID: "PLAN-2025-07-01", Name: "ขวด PET 500ml", Status: "กำลังผลิต", Amount: 12000, Priority: "สูง", StartDate: now.Add(-2 * day), EndDate: now.Add(5 * day), RefBomID: "REFBOM-PRD-001-BOM-001"},
		{Timestamp: now, PlanID: "PLAN-2025-07-02", Name: "ขวด PET 1L", Status: "กำลังผลิต", Amount: 6000, Priority: "ปกติ", StartDate: now.Add(-1 * day), EndDate: now.Add(7 * day), RefBomID: "REFBOM-PRD-002-BOM-002"},
		{Timestamp: now, PlanID: "PLAN-2025-07-03", Name: "ฝาเกลียว", Status: "เสร็จสิ้น", Amount: 20000, Priority: "ต่ำ", StartDate: now.Add(-5 * day), EndDate: now.Add(-1 * day), RefBomID: "REFBOM-PRD-003-BOM-003"},
		{Timestamp: now, PlanID: "PLAN-2025-07-04", Name: "ขวด HDPE", Status: "รอเริ่ม", Amount: 5000, Priority: "ปกติ", StartDate: now.Add(2 * day), EndDate: now.Add(12 * day), RefBomID: "REFBOM-PRD-004-BOM-004"},
	})
}
