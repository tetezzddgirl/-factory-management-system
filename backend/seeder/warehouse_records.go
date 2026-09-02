package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedWarehouse ใส่ข้อมูลวัตถุดิบ + ตำแหน่งจัดเก็บ + ประวัติรับ/เบิก
func SeedWarehouseRecord(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour

	upsert(db, "rm_record_id", []models.RawMaterialRecord{
		{Timestamp: now.Add(-2 * day), RmRecordID: "RMR-001", Type: "รับเข้า", Amount: 5000, LeftAmount: 4200, Handler: "มาลี ศรีสุข", Agency: "ฝ่ายจัดซื้อ", OrderID: "WO-20250702-001", RmID: "RM-001", RmLocationID: "RML-001"},
		{Timestamp: now.Add(-1 * day), RmRecordID: "RMR-002", Type: "เบิกจ่าย", Amount: 800, LeftAmount: 4200, Handler: "สมชาย ใจดี", Agency: "ฝ่ายผลิต", OrderID: "WO-20250702-001", RmID: "RM-001",  RmLocationID: "RML-001"},
	})

	upsert(db, "wip_record_id", []models.WorkInProcessRecord{
		{Timestamp: now.Add(-3 * time.Hour), WipRecordID: "WR-001", Type: "รับเข้า", InStage: "หลังเป่าขึ้นรูป", Amount: 500, LeftAmount: 3200, Handler: "สมชาย ใจดี", Agency: "ฝ่ายผลิต", OrderID: "WO-20250702-001", WipID: "WIP-001", WipLocationID: "WLO-001"},
		{Timestamp: now.Add(-1 * time.Hour), WipRecordID: "WR-002", Type: "โอนย้าย", InStage: "หลังบรรจุ", Amount: 300, LeftAmount: 1800, Handler: "มาลี ศรีสุข", Agency: "ฝ่ายคลัง WIP", OrderID: "WO-20250702-001", WipID: "WIP-002", WipLocationID: "WLO-002"},
	})

	upsert(db, "slip_id", []models.RequisitionSlip{
		{Timestamp: now.Add(-4 * time.Hour), SlipID: "SID-001", Amount: 500, Status: "รออนุมัติ", Handler: "มาลี ศรีสุข", OrderID: "WO-20250702-001", WipLocationID: "WLO-001"},
	})
}
