// Package main - ตัว seeder แยกต่างหากสำหรับใส่ข้อมูลตัวอย่างลงทุกตารางในฐานข้อมูล
//
// ไฟล์นี้เป็นแค่ "จุดเริ่มต้น" (entrypoint) เท่านั้น - ต่อฐานข้อมูล, migrate,
// แล้วเรียกฟังก์ชัน Seed_xxx() ของแต่ละไฟล์ในโฟลเดอร์นี้ตามลำดับ
// ตรรกะการใส่ข้อมูลจริงๆ ของแต่ละตารางแยกอยู่คนละไฟล์ตามชื่อ model (ดู users.go, machines.go, ฯลฯ)
//
// วิธีรัน (จากโฟลเดอร์ backend):
//
//	go run ./seeder
package main

import (
	"log"

	"factoryflow/config"
	"factoryflow/database"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("เชื่อมต่อฐานข้อมูลไม่สำเร็จ: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("migrate ไม่สำเร็จ: %v", err)
	}

	// เรียก seed ของแต่ละ model ตามลำดับ - เรียงจากตารางที่ไม่มี foreign key ผูกใครก่อน
	// ไปหาตารางที่อ้างอิงตารางอื่น (เช่น Issue อ้างอิง OrderID ของ ProductionOrder)
	SeedUsers(db)
	SeedMachines(db)
	SeedProductionLines(db)
	SeedWarehouse(db) // ต้องมาก่อน SeedProducts/SeedFormulas เพราะสูตรการผลิตอ้างอิง rmID ที่ต้องมีอยู่แล้ว
	SeedProducts(db)
	SeedFormulas(db)
	SeedFormulaSteps(db)
	SeedPlans(db)
	SeedPersonnel(db)
	SeedWip(db)
	SeedWorkOrders(db) // ต้องมาก่อน SeedIssues เพราะ Issue อ้างอิง orderID ที่ต้องมีอยู่แล้ว
	SeedWarehouseRecord(db)
	SeedIssues(db)

	log.Println("ใส่ข้อมูลตัวอย่างเรียบร้อยแล้ว ✅")
}
