package models

// Machine คือเครื่องจักรในสายการผลิต
type Machine struct {
	ID     string `json:"id" gorm:"primaryKey"`
	Name   string `json:"name" gorm:"not null"`
	Status string `json:"status" gorm:"default:ว่าง"`
	Hours  int    `json:"hours" gorm:"default:0"`
}
