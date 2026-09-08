package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedWorkOrders ใส่ใบสั่งผลิตตัวอย่าง + งานที่มอบหมาย (Work)
func SeedWorkOrders(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour

	upsert(db, "order_id", []models.ProductionOrder{
		{Timestamp: now.Add(-2 * day), OrderID: "WO-20250701-001", Name: "ขวด PET 500ml", Status: "กำลังผลิต", Amount: 10000, ProductionlineID: uintPtr(1), StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), PlanID: "PLAN-2025-07-01-001", RefFormulaID: "REFFOR-PRD-001-FOR-001"},
		{Timestamp: now.Add(-5 * day), OrderID: "WO-20250702-001", Name: "ขวด PET 1L", Status: "เสร็จสิ้น", Amount: 6000, ProductionlineID: uintPtr(2), StartDate: now.Add(-5 * day), EndDate: now.Add(-1 * day), PlanID: "PLAN-2025-07-02-001", RefFormulaID: "REFFOR-PRD-002-FOR-002"},
		{Timestamp: now, OrderID: "WO-20250703-001", Name: "ฝาเกลียว", Status: "รอมอบหมาย", Amount: 20000, ProductionlineID: uintPtr(3), StartDate: now, EndDate: now.Add(10 * day), PlanID: "PLAN-2025-07-03-001", RefFormulaID: "REFFOR-PRD-003-FOR-003"},
		{Timestamp: now, OrderID: "WO-20250704-001", Name: "ขวด PET 150ml", Status: "หยุดชั่วคราว", Amount: 20000, ProductionlineID: uintPtr(4), StartDate: now, EndDate: now.Add(10 * day), PlanID: "PLAN-2025-07-04-001", RefFormulaID: "REFFOR-PRD-004-FOR-004"},
	})

	upsert(db, "work_id", []models.Work{
		{WorkID: "WRK-001", Work: "ควบคุมเครื่องฉีดขึ้นรูป", StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), OrderID: "WO-20250702-001"},
		{WorkID: "WRK-002", Work: "ตรวจสอบคุณภาพขวด", StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), OrderID: "WO-20250702-001"},
	})
}

func uintPtr(v uint) *uint { return &v }
