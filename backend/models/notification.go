package models

import "time"

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