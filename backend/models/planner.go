package models

import "time"

type ProductionPlan struct {
	Timestamp    time.Time `json:"timestamp"`
	PlanID       string    `json:"planID" gorm:"primaryKey;column:plan_id"`
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	Amount       int       `json:"amount"`
	Priority     string    `json:"priority"`
	StartDate    time.Time `json:"startDate"`
	EndDate      time.Time `json:"endDate"`
	RefFormulaID string    `json:"refFormulaID" gorm:"column:ref_formula_id"`

	Orders []ProductionOrder `json:"orders,omitempty" gorm:"foreignKey:PlanID"`
}

type RefFormula struct {
	RefFormulaID string `json:"refFormulaID" gorm:"primaryKey;column:ref_formula_id"`
	ProductID    string `json:"productID" gorm:"column:product_id;uniqueIndex:idx_ref_formula_product_formula"`
	FormulaID    string `json:"formulaID" gorm:"column:formula_id;uniqueIndex:idx_ref_formula_product_formula"`
}

type ProductionOrder struct {
	Timestamp    time.Time `json:"timestamp"`
	OrderID      string    `json:"orderID" gorm:"primaryKey;column:order_id"`
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	Amount       int       `json:"amount"`
	Machines     string    `json:"machines"`
	StartDate    time.Time `json:"startDate"`
	EndDate      time.Time `json:"endDate"`
	PlanID       string    `json:"planID" gorm:"column:plan_id"`
	RefFormulaID string    `json:"refFormulaID" gorm:"column:ref_formula_id"`

	Work                 []Work                `json:"work,omitempty" gorm:"foreignKey:OrderID"`
	Resources            []Resources           `json:"resources,omitempty" gorm:"foreignKey:OrderID"`
	Issues               []Issue               `json:"issues,omitempty" gorm:"foreignKey:OrderID"`
	RawMaterialRecords   []RawMaterialRecord   `json:"rawMaterialRecords,omitempty" gorm:"foreignKey:OrderID"`
	WorkInProcessRecords []WorkInProcessRecord `json:"workInProcessRecords,omitempty" gorm:"foreignKey:OrderID"`
	RequisitionSlips     []RequisitionSlip     `json:"requisitionSlips,omitempty" gorm:"foreignKey:OrderID"`

	InspectionPoints        []InspectionPoint         `gorm:"foreignKey:OrderID" json:"inspectionPoints"`
	ProductionStatusHistory []ProductionStatusHistory `gorm:"foreignKey:OrderID" json:"statusHistory"`
	ProductionEvents        []ProductionEvent         `gorm:"foreignKey:OrderID" json:"events"`
	ProductionReport        *ProductionReport         `gorm:"foreignKey:OrderID" json:"report"`
	TransferRecords         []TransferRecord          `gorm:"foreignKey:OrderID" json:"transferRecords"`

	FinishedGoods []FinishedGoods `gorm:"foreignKey:OrderID;references:OrderID" json:"finishedGoods,omitempty"`
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
