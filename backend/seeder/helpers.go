package main

import (
	"log"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// upsert ใส่ข้อมูลแบบ "ถ้ามี primary key นี้อยู่แล้วให้ update ทับ ถ้ายังไม่มีให้ insert ใหม่"
// ใช้ร่วมกันได้ทุก model เพราะเป็น generic function (Go 1.18+) - T คือ struct model อะไรก็ได้
// pkColumn คือชื่อคอลัมน์ primary key ในฐานข้อมูลจริง (ไม่ใช่ชื่อ field ใน Go struct)
// เช่น model Personnel มี field ID แต่คอลัมน์ในตารางชื่อ "id" ให้ส่ง "id" เข้ามา
func upsert[T any](db *gorm.DB, pkColumn string, rows []T) {
	if len(rows) == 0 {
		return
	}
	err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: pkColumn}},
		UpdateAll: true,
	}).Create(&rows).Error
	if err != nil {
		log.Fatalf("seed ตาราง (pk=%s) ไม่สำเร็จ: %v", pkColumn, err)
	}
}
