package models

// ProductionLine คือสายการผลิต (เช่น สายการเป่าขวด L-01, สายการบรรจุ L-02)
// ใช้เป็นตัวเลือก (dropdown) ตอนสร้างแผนการผลิต/ใบสั่งผลิต แทนการพิมพ์ชื่อสายการผลิตเอง
type ProductionLine struct {
	ID     string `json:"id" gorm:"primaryKey"`
	Name   string `json:"name" gorm:"not null"`
	Status string `json:"status" gorm:"default:ว่าง"`
}
