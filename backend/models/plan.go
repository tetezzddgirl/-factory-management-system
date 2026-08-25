package models

import "time"

// Plan คือแผนการผลิตแบบง่าย (ใช้กับหน้า planning ปัจจุบันของ frontend)
type Plan struct {
	ID      uint       `json:"id" gorm:"primaryKey"`
	Product string     `json:"product" gorm:"not null"`
	Target  int        `json:"target" gorm:"not null"`
	Done    int        `json:"done" gorm:"default:0"`
	DueDate *time.Time `json:"dueDate,omitempty"`
	Status  string     `json:"status" gorm:"default:รอเริ่ม"`
}
