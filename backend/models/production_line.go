package models

// ProductionLine คือสายการผลิต (เช่น สายการเป่าขวด L-01, สายการบรรจุ L-02)
// ใช้เป็นตัวเลือก (dropdown) ตอนสร้างแผนการผลิต/ใบสั่งผลิต แทนการพิมพ์ชื่อสายการผลิตเอง
type ProductionLine struct {
	ProductionlineID   uint         `gorm:"column:production_line_id;primaryKey" json:"production_line_id"`
	ProductionlineName string       `gorm:"size:100" json:"productionline_name"`
}