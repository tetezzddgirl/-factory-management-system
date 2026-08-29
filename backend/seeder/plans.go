package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedPlans ใส่แผนการผลิตตัวอย่าง (ProductionPlan ใช้กับหน้า "วางแผนการผลิต")
func SeedPlans(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour

	upsert(db, "plan_id", []models.ProductionPlan{
		{Timestamp: now, PlanID: "PLAN-2025-07-01", Name: "ขวด PET 500ml", Status: "กำลังผลิต", Amount: 12000, Priority: "สูง", StartDate: now.Add(-2 * day), EndDate: now.Add(5 * day)},
		{Timestamp: now, PlanID: "PLAN-2025-07-02", Name: "ขวด PET 1L", Status: "กำลังผลิต", Amount: 6000, Priority: "ปกติ", StartDate: now.Add(-1 * day), EndDate: now.Add(7 * day)},
		{Timestamp: now, PlanID: "PLAN-2025-07-03", Name: "ฝาเกลียว", Status: "เสร็จสิ้น", Amount: 20000, Priority: "ต่ำ", StartDate: now.Add(-5 * day), EndDate: now.Add(-1 * day)},
		{Timestamp: now, PlanID: "PLAN-2025-07-04", Name: "ขวด HDPE", Status: "รอเริ่ม", Amount: 5000, Priority: "ปกติ", StartDate: now.Add(2 * day), EndDate: now.Add(12 * day)},
	})
}
