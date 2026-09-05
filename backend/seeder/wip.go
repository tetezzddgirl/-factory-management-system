package main

import (

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedWip ใส่ข้อมูลสินค้าระหว่างผลิต (WIP) + ตำแหน่ง + ประวัติเคลื่อนไหว + ใบเบิกจ่าย
func SeedWip(db *gorm.DB) {

	upsert(db, "wip_id", []models.WorkInProcess{
		{WipID: "WIP-001", Wip: "ขวดเป่าขึ้นรูป", InStage: "หลังเป่าขึ้นรูป", Amount: 3200, Unit: "ชิ้น", Max: 5000},
		{WipID: "WIP-002", Wip: "ขวดบรรจุแล้ว", InStage: "หลังบรรจุ", Amount: 1800, Unit: "ชิ้น", Max: 4000},
		{WipID: "WIP-003", Wip: "ขวดติดฉลากแล้ว", InStage: "หลังติดฉลาก", Amount: 900, Unit: "ชิ้น", Max: 3000},
		{WipID: "WIP-004", Wip: "พาเลทพร้อมส่ง", InStage: "หลังแพ็ค", Amount: 150, Unit: "พาเลท", Max: 300},
	})

	upsert(db, "wip_location_id", []models.WIPLocation{
		{WipLocationID: "WLO-001", Location: "A-01-01", PalletNumber: "PLT-201", LotNumber: "LOT-20250701-001-001", Amount: 3200, WipID: "WIP-001"},
		{WipLocationID: "WLO-002", Location: "A-02-01", PalletNumber: "PLT-202", LotNumber: "LOT-20250702-001-001", Amount: 1800, WipID: "WIP-002"},
		{WipLocationID: "WLO-003", Location: "A-03-01", PalletNumber: "PLT-203", LotNumber: "LOT-20250703-001-001", Amount: 900, WipID: "WIP-003"},
		{WipLocationID: "WLO-004", Location: "A-04-01", PalletNumber: "PLT-204", LotNumber: "LOT-20250704-001-001", Amount: 150, WipID: "WIP-004"},
	})

}
