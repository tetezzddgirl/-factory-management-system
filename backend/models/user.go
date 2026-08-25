package models

import "time"

// User คือบัญชีผู้ใช้งานระบบ (auth)
type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	Role         string    `json:"role" gorm:"default:operator"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Credentials ใช้รับ body ตอน signup/login เท่านั้น ไม่ใช่ตารางใน DB
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
