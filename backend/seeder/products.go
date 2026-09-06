package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedProducts ใส่ข้อมูลสินค้า/ผลิตภัณฑ์ตัวอย่าง (ใช้เลือกตอนสร้างแผนการผลิต/ใบสั่งผลิต)
func SeedProducts(db *gorm.DB) {
	upsert(db, "product_id", []models.Product{
		{ProductID: "PRD-001", ProductName: "ขวด PET 500ml"},
		{ProductID: "PRD-002", ProductName: "ขวด PET 1L"},
		{ProductID: "PRD-003", ProductName: "ฝาเกลียว"},
		{ProductID: "PRD-004", ProductName: "ขวด HDPE"},
	})
}
