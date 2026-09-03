package models

type ProductionLine struct {
	ID     string `json:"id" gorm:"primaryKey"`
	Name   string `json:"name" gorm:"not null"`
	Status string `json:"status" gorm:"default:ว่าง"`
}
