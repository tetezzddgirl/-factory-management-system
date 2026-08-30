package models

import "time"

type ProductionPlan struct {
	Timestamp time.Time `json:"timestamp"`
	PlanID    string    `json:"planID" gorm:"primaryKey;column:plan_id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Amount    int       `json:"amount"`
	Priority  string    `json:"priority"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	// RefBomID อ้างอิงแถวใน RefBOM ที่บอกว่าแผนนี้เลือกใช้ product/bom คู่ไหน
	// (ไม่เก็บ ProductID/BomID ตรงๆ อีกต่อไป — ต้อง join ผ่าน RefBOM เท่านั้น)
	RefBomID string `json:"refBomID" gorm:"column:ref_bom_id"`
}

// RefBOM คือ association entity ที่แท้จริงระหว่างสินค้า (Product) กับสูตรการผลิต (BOM/Formula)
// ที่ ProductionPlan และ ProductionOrder แต่ละตัวเลือกใช้งาน — มี PK ของตัวเอง (RefBomID)
// เพื่อให้ Plan/Order อ้างอิงกลับมาด้วย FK เดียว แทนที่จะก็อบปี้ ProductID/BomID กระจายไปทุกตาราง
type RefBOM struct {
	RefBomID  string `json:"refBomID" gorm:"primaryKey;column:ref_bom_id"`
	ProductID string `json:"productID" gorm:"column:product_id;uniqueIndex:idx_ref_bom_product_bom"`
	BomID     string `json:"bomID" gorm:"column:bom_id;uniqueIndex:idx_ref_bom_product_bom"`
}

type ProductionOrder struct {
	Timestamp time.Time `json:"timestamp"`
	OrderID   string    `json:"orderID" gorm:"primaryKey;column:order_id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Amount    int       `json:"amount"`
	Machines  string    `json:"machines"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	PlanID    string    `json:"planID" gorm:"column:plan_id"`
	// RefBomID สืบทอดมาจาก ProductionPlan ต้นทางตอนสร้างใบสั่งผลิต (ดู CreateWorkOrder)
	RefBomID string `json:"refBomID" gorm:"column:ref_bom_id"`
}

type Resources struct {
	Timestamp         time.Time `json:"timestamp"`
	ResourceID        string    `json:"resourceID" gorm:"primaryKey;column:resource_id"`
	RmID              string    `json:"rmID" gorm:"column:rm_id"`
	RawMaterialStatus string    `json:"rawMaterialStatus"`
	RequiredAmount    int       `json:"requiredAmount"`
	MachineStatus     string    `json:"machineStatus"`
	WorkerStatus      string    `json:"workerStatus"`
	OrderID           string    `json:"orderID" gorm:"column:order_id"`
}

type Work struct {
	WorkID      string    `json:"workID" gorm:"primaryKey;column:work_id"`
	Work        string    `json:"work"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"startDate"`
	EndDate     time.Time `json:"endDate"`
	OrderID     string    `json:"orderID" gorm:"column:order_id"`
}

type Issue struct {
	Timestamp          time.Time `json:"timestamp"`
	IssueID            string    `json:"issue_id" gorm:"primaryKey;column:issue_id"`
	ReporterID         string    `json:"reporter_id"`
	Issue              string    `json:"issue"`
	Description        string    `json:"description_id"`
	SolutionProviderID string    `json:"solution_provider_id"`
	Solutions          string    `json:"solutions"`
	Status             string    `json:"status"`
	OrderID            string    `json:"orderID" gorm:"column:order_id"`
}
