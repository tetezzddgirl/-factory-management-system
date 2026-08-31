package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedPersonnel ใส่ข้อมูลบุคลากรตัวอย่าง
func SeedPersonnel(db *gorm.DB) {
	upsert(db, "id", []models.Personnel{
		{ID: "PSN-001", Name: "สมชาย ใจดี", Role: "Operator", Dept: "Production", Status: "กำลังทำงาน"},
		{ID: "PSN-002", Name: "สุนีย์ แสงทอง", Role: "QC", Dept: "Quality", Status: "กำลังทำงาน"},
		{ID: "PSN-003", Name: "วิชัย รุ่งเรือง", Role: "Supervisor", Dept: "Production", Status: "พัก"},
		{ID: "PSN-004", Name: "มาลี ศรีสุข", Role: "Warehouse Staff", Dept: "Warehouse", Status: "กำลังทำงาน"},
		{ID: "PSN-005", Name: "ประยุทธ์ ทองดี", Role: "Planner", Dept: "Planning", Status: "กำลังทำงาน", Email: "demo@factoryflow.app"},
		{ID: "PSN-006", Name: "อรุณี พงษ์ไพร", Role: "Operator", Dept: "Production", Status: "ลา"},
	})
}
