package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedMachines ใส่ข้อมูลเครื่องจักรตัวอย่าง
func SeedMachines(db *gorm.DB) {
	upsert(db, "id", []models.Machine{
		{ID: "M-01", Name: "เครื่องฉีดขึ้นรูป A", Status: "ทำงาน", Hours: 1280},
		{ID: "M-02", Name: "เครื่องบรรจุ B", Status: "ทำงาน", Hours: 860},
		{ID: "M-03", Name: "เครื่องติดฉลาก C", Status: "ว่าง", Hours: 430},
		{ID: "M-04", Name: "เครื่องอัดลม D", Status: "ซ่อมบำรุง", Hours: 2100},
		{ID: "M-05", Name: "สถานีจัดพาเลท E", Status: "ว่าง", Hours: 95},
	})
}
