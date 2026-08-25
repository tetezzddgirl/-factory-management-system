package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedPlans ใส่แผนการผลิตตัวอย่าง (Plan แบบง่าย ใช้กับหน้า "วางแผนการผลิต")
func SeedPlans(db *gorm.DB) {
	now := time.Now()
	day := 24 * time.Hour
	due1, due2, due3, due4 := now.Add(5*day), now.Add(-1*day), now.Add(10*day), now.Add(3*day)

	upsert(db, "id", []models.Plan{
		{ID: 1, Product: "ขวด PET 500ml", Target: 10000, Done: 6500, DueDate: &due1, Status: "InProgress"},
		{ID: 2, Product: "ขวด PET 1L", Target: 6000, Done: 6000, DueDate: &due2, Status: "Completed"},
		{ID: 3, Product: "ฝาเกลียว", Target: 20000, Done: 3000, DueDate: &due3, Status: "Pending"},
		{ID: 4, Product: "ฉลากพลาสติก", Target: 15000, Done: 9000, DueDate: &due4, Status: "InProgress"},
	})
}
