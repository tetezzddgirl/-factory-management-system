package models

type FormulaItem struct {
	ID         uint    `json:"id" gorm:"primaryKey;autoIncrement"`
	FormulaID      string  `json:"formulaID" gorm:"column:formula_id;index"`
	ProductID  string  `json:"productID" gorm:"column:product_id;index"`
	RmID       string  `json:"rmID" gorm:"column:rm_id"`
	QtyPerUnit float64 `json:"qtyPerUnit"`
	Unit       string  `json:"unit"`
}

type FormulaStep struct {
	ID              uint   `json:"id" gorm:"primaryKey;autoIncrement"`
	FormulaID           string `json:"formulaID" gorm:"column:formula_id;index"`
	StepNo          int    `json:"stepNo" gorm:"column:step_no"`
	StepName        string `json:"stepName" gorm:"column:step_name"`
	Description     string `json:"description"`
	Machine         string `json:"machine"`
	DurationMinutes int    `json:"durationMinutes" gorm:"column:duration_minutes"`
}
