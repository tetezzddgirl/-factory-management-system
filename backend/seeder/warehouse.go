package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedWarehouse ใส่ข้อมูลวัตถุดิบ + ตำแหน่งจัดเก็บ + ประวัติรับ/เบิก
func SeedWarehouse(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour

	upsert(db, "rm_id", []models.RawMaterial{
		{RmID: "RM-001", RawMaterial: "เม็ดพลาสติก PET", Amount: 4200, Unit: "kg", Max: 5000, Min: 500},
		{RmID: "RM-002", RawMaterial: "ฝาพลาสติก HDPE", Amount: 12000, Unit: "ชิ้น", Max: 20000, Min: 3000},
		{RmID: "RM-003", RawMaterial: "ฉลากกระดาษ", Amount: 8000, Unit: "ม้วน", Max: 10000, Min: 1000},
		{RmID: "RM-004", RawMaterial: "กาวติดฉลาก", Amount: 300, Unit: "ลิตร", Max: 500, Min: 50},
	})

	upsert(db, "rm_location_id", []models.RawMaterialLocation{
		{RmLocationID: "RML-001", Location: "A-01-01", PaletteNumber: "PLT-101", LotNumber: "LOT-2601", Amount: 4200, RmID: "RM-001"},
		{RmLocationID: "RML-002", Location: "A-02-01", PaletteNumber: "PLT-102", LotNumber: "LOT-2602", Amount: 12000, RmID: "RM-002"},
		{RmLocationID: "RML-003", Location: "A-03-01", PaletteNumber: "PLT-103", LotNumber: "LOT-2603", Amount: 8000, RmID: "RM-003"},
		{RmLocationID: "RML-004", Location: "A-04-01", PaletteNumber: "PLT-104", LotNumber: "LOT-2604", Amount: 300, RmID: "RM-004"},
	})

	upsert(db, "rm_record_id", []models.RawMaterialRecord{
		{Timestamp: now.Add(-2 * day), RmRecordID: "RMR-001", Type: "รับเข้า", Amount: 5000, LeftAmount: 4200, Handler: "มาลี ศรีสุข", Agency: "ฝ่ายจัดซื้อ", OrderID: "WO-1042", RmID: "RM-001", RmLocationID: "RML-001"},
		{Timestamp: now.Add(-1 * day), RmRecordID: "RMR-002", Type: "เบิกจ่าย", Amount: 800, LeftAmount: 4200, Handler: "สมชาย ใจดี", Agency: "ฝ่ายผลิต", OrderID: "WO-1042", RmID: "RM-001",  RmLocationID: "RML-001"},
	})
}
