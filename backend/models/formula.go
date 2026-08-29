package models

// FormulaItem คือ 1 บรรทัดของสูตรการผลิต (BOM) บอกว่าสินค้าหนึ่งตัว (ProductID) ภายใต้สูตร (BomID)
// ต้องใช้วัตถุดิบอะไร (RmID) ปริมาณเท่าไหร่ต่อการผลิต 1 หน่วย (QtyPerUnit)
// ใช้คำนวณยอดวัตถุดิบที่ต้องใช้อัตโนมัติ ตอนสร้างแผนการผลิต/ใบสั่งผลิต (required = QtyPerUnit * จำนวนที่ผลิต)
type FormulaItem struct {
	ID         uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	BomID      string  `json:"bomID" gorm:"column:bom_id;index"`
	ProductID  string  `json:"productID" gorm:"column:product_id;index"`
	RmID       string  `json:"rmID" gorm:"column:rm_id"`
	QtyPerUnit float64 `json:"qtyPerUnit"`
	Unit       string  `json:"unit"`
}
