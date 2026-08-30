package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedProducts ใส่ข้อมูลสินค้า/ผลิตภัณฑ์ตัวอย่าง (ใช้เลือกตอนสร้างแผนการผลิต/ใบสั่งผลิต)
func SeedProducts(db *gorm.DB) {
	upsert(db, "product_id", []models.Product{
		{ProductID: "PRD-001", Name: "ขวด PET 500ml", Unit: "ขวด"},
		{ProductID: "PRD-002", Name: "ขวด PET 1L", Unit: "ขวด"},
		{ProductID: "PRD-003", Name: "ฝาเกลียว", Unit: "ชิ้น"},
		{ProductID: "PRD-004", Name: "ขวด HDPE", Unit: "ขวด"},
	})
}
