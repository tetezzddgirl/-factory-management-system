package models

// FormulaItem คือ 1 บรรทัดของสูตรการผลิต (BOM) บอกว่าสินค้าหนึ่งตัว (ProductID) ภายใต้สูตร (BomID)
// ต้องใช้วัตถุดิบอะไร (RmID) ปริมาณเท่าไหร่ต่อการผลิต 1 หน่วย (QtyPerUnit)
// ใช้คำนวณยอดวัตถุดิบที่ต้องใช้อัตโนมัติ ตอนสร้างแผนการผลิต/ใบสั่งผลิต (required = QtyPerUnit * จำนวนที่ผลิต)
type FormulaItem struct {
	ID         uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	FormulaID      string  `json:"formulaID" gorm:"column:formula_id;index"`
	ProductID  string  `json:"productID" gorm:"column:product_id;index"`
	RmID       string  `json:"rmID" gorm:"column:rm_id"`
	QtyPerUnit float64 `json:"qtyPerUnit"`
	Unit       string  `json:"unit"`
}

// FormulaStep คือ 1 ขั้นตอนการผลิตของสูตร (BomID) เรียงลำดับด้วย StepNo (1, 2, 3, ...)
// ใช้แสดงให้ผู้มอบหมายงาน/ผู้ปฏิบัติงานเห็นว่าต้องทำอะไรบ้างตามลำดับ แยกจากรายการวัตถุดิบ (FormulaItem)
type FormulaStep struct {
	ID              uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	FormulaID           string `json:"formulaID" gorm:"column:formula_id;index"`
	StepNo          int    `json:"stepNo" gorm:"column:step_no"`
	StepName        string `json:"stepName" gorm:"column:step_name"`
	Description     string `json:"description"`
	Machine         string `json:"machine"`
	DurationMinutes int    `json:"durationMinutes" gorm:"column:duration_minutes"`
}
