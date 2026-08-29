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
		{Timestamp: now.Add(-2 * day), OrderID: "WO-1042", Name: "ขวด PET 500ml", Status: "กำลังผลิต", Amount: 10000, Machines: "M-01::สูง", StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), PlanID: "1"},
		{Timestamp: now.Add(-5 * day), OrderID: "WO-1043", Name: "ขวด PET 1L", Status: "เสร็จสิ้น", Amount: 6000, Machines: "M-02::ปกติ", StartDate: now.Add(-5 * day), EndDate: now.Add(-1 * day), PlanID: "2"},
		{Timestamp: now, OrderID: "WO-1039", Name: "ฝาเกลียว", Status: "รอมอบหมาย", Amount: 20000, Machines: "M-04::ต่ำ", StartDate: now, EndDate: now.Add(10 * day), PlanID: "3"},
		{Timestamp: now, OrderID: "WO-1032", Name: "ขวด PET 150ml", Status: "หยุดชั่วคราว", Amount: 20000, Machines: "M-03::ต่ำ", StartDate: now, EndDate: now.Add(10 * day), PlanID: "3"},
	})

	upsert(db, "work_id", []models.Work{
		{WorkID: "WRK-001", Work: "ควบคุมเครื่องฉีดขึ้นรูป", StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), OrderID: "WO-1042"},
		{WorkID: "WRK-002", Work: "ตรวจสอบคุณภาพขวด", StartDate: now.Add(-2 * day), EndDate: now.Add(3 * day), OrderID: "WO-1042"},
	})
}
