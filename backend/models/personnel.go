package models

type Personnel struct {
	ID     string `json:"id" gorm:"primaryKey"`
	Name   string `json:"name" gorm:"not null"`
	Role   string `json:"role"`
	Dept   string `json:"dept"`
	Status string `json:"status" gorm:"default:กำลังทำงาน"`
	Email string `json:"email,omitempty"`
}
