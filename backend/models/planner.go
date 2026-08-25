package models

import "time"

type ProductionPlan struct {
	Timestamp time.Time `json:"timestamp"`
	PlanID    string    `json:"planID" gorm:"primaryKey;column:plan_id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Amount    int       `json:"amount"`
	Priority  int       `json:"priority"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

type RefBOM struct {
	ProductID string `json:"productID" gorm:"primaryKey;column:product_id"`
	BomID     string `json:"bomID" gorm:"primaryKey;column:bom_id"`
	PlanID    string `json:"planID" gorm:"column:plan_id"`
	OrderID   string `json:"orderID" gorm:"column:order_id"`
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
	WorkID    string    `json:"workID" gorm:"primaryKey;column:work_id"`
	Work      string    `json:"work"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	OrderID   string    `json:"orderID" gorm:"column:order_id"`
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
