package main

import (
	"log"

	"factoryflow/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedUsers สร้างบัญชีทดสอบไว้ล็อกอิน
// หมายเหตุ: ตารางนี้ "ไม่ใช้" upsert() ตัวช่วย เพราะรหัสผ่านต้อง bcrypt hash ก่อนเก็บ
// ถ้า upsert ทับทุกครั้งจะ hash รหัสผ่านซ้ำเรื่อยๆ (เปลืองและไม่มีประโยชน์)
// เลยเช็คก่อนว่ามีอีเมลนี้อยู่แล้วหรือยัง ถ้ามีแล้วก็ข้ามไปเลย
func SeedUsers(db *gorm.DB) {
	demo := struct {
		Email    string
		Password string
		Role     string
	}{"demo@factoryflow.app", "password123", "admin"}

	var existing models.User
	err := db.Where("email = ?", demo.Email).First(&existing).Error
	if err == nil {
		return // มีอยู่แล้ว ไม่ต้องสร้างซ้ำ
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(demo.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("สร้าง password hash ไม่สำเร็จ: %v", err)
	}
	user := models.User{Email: demo.Email, PasswordHash: string(hash), Role: demo.Role}
	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("สร้างผู้ใช้ทดสอบไม่สำเร็จ: %v", err)
	}
	log.Printf("สร้างผู้ใช้ทดสอบแล้ว: %s / %s\n", demo.Email, demo.Password)
}
