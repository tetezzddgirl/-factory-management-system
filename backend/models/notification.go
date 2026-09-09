package models

import "time"

// Notification คือการแจ้งเตือนที่ระบบสร้างให้เจ้าหน้าที่ฝ่ายต่างๆ ทราบ
// อิงผู้รับเป็น "role" (planner, warehouse, ...) ไม่ผูกกับ user คนใดคนหนึ่ง
// เพราะตอนนี้ระบบยังสลับบทบาทผ่าน RoleSwitcher แบบ demo ไม่ได้ผูกกับ JWT
type Notification struct {
	NotificationID string    `json:"notificationID" gorm:"primaryKey;column:notification_id"`
	RecipientRole  string    `json:"recipientRole" gorm:"column:recipient_role;index"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Type           string    `json:"type"` // info | warning | success | error
	RefID          string    `json:"refID" gorm:"column:ref_id"`
	IsRead         bool      `json:"isRead" gorm:"column:is_read;default:false"`
	CreatedAt      time.Time `json:"createdAt" gorm:"column:created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}