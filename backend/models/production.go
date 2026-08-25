package models

import "time"

type ProductionStatus string

const (
	InProgress ProductionStatus = "InProgress"
	Paused     ProductionStatus = "Paused"
	Completed  ProductionStatus = "Completed"
	Cancelled  ProductionStatus = "Cancelled"
)

type ProductionEventType string

const (
	MachineBreakdown   ProductionEventType = "MachineBreakdown"
	MachineMaintenance ProductionEventType = "MachineMaintenance"
	MaterialShortage   ProductionEventType = "MaterialShortage"
	MaterialChange     ProductionEventType = "MaterialChange"
	QualityIssue       ProductionEventType = "QualityIssue"
	OtherEvent         ProductionEventType = "Other"
)

type ProductionStatusHistory struct {
	HistoryID       string    `gorm:"primaryKey;column:historyId" json:"historyId"`
	PreviousStatus  string    `gorm:"column:previousStatus" json:"previousStatus"`
	NewStatus       string    `gorm:"column:newStatus" json:"newStatus"`
	ChangedDateTime time.Time `gorm:"column:changedDateTime" json:"changedDateTime"`
	Reason          string    `gorm:"column:reason" json:"reason"`
	ChangedBy       string    `gorm:"column:changedBy" json:"changedBy"`

	OrderID string `gorm:"column:order_id" json:"OrderID"`
}

type ProductionEvent struct {
	EventID       string              `gorm:"primaryKey;column:eventId" json:"eventId"`
	EventType     ProductionEventType `gorm:"column:eventType" json:"eventType"`
	StartDateTime time.Time           `gorm:"column:startDateTime" json:"startDateTime"`
	EndDateTime   time.Time           `gorm:"column:endDateTime" json:"endDateTime"`
	Description   string              `gorm:"column:description" json:"description"`
	Impact        string              `gorm:"column:impact" json:"impact"`
	RecordedBy    string              `gorm:"column:recordedBy" json:"recordedBy"`

	OrderID string `gorm:"column:order_id" json:"OrderID"`
}

type ProductionReport struct {
	ReportID            string    `gorm:"primaryKey;column:reportId" json:"reportId"`
	ActualStartDateTime time.Time `gorm:"column:actualStartDateTime" json:"actualStartDateTime"`
	ActualEndDateTime   time.Time `gorm:"column:actualEndDateTime" json:"actualEndDateTime"`
	ActualQuantity      int       `gorm:"column:actualQuantity" json:"actualQuantity"`
	GoodQuantity        int       `gorm:"column:goodQuantity" json:"goodQuantity"`
	ScrapQuantity       int       `gorm:"column:scrapQuantity" json:"scrapQuantity"`
	PalletQuantity      int       `gorm:"column:palletQuantity" json:"palletQuantity"`
	ProductionResult    string    `gorm:"column:productionResult" json:"productionResult"`
	Remark              string    `gorm:"column:remark" json:"remark"`
	RecordedBy          string    `gorm:"column:recordedBy" json:"recordedBy"`

	OrderID string `gorm:"column:order_id" json:"OrderID"`
}

type TransferRecord struct {
	TransferID       string    `gorm:"primaryKey;column:transferId" json:"transferId"`
	TransferType     string    `gorm:"column:transferType" json:"transferType"`
	CreatedBy        string    `gorm:"column:createdBy" json:"createdBy"`
	CreateDateTime   time.Time `gorm:"column:createDateTime" json:"createDateTime"`
	Status           string    `gorm:"column:status" json:"status"`
	Remark           string    `gorm:"column:remark" json:"remark"`
	TransferDateTime time.Time `gorm:"column:transferDateTime" json:"transferDateTime"`
	ReceivedBy       string    `gorm:"column:receivedBy" json:"receivedBy"`

	OrderID       string `gorm:"column:order_id" json:"OrderID"`
	InventoryID   string `gorm:"column:inventoryID" json:"InventoryID"`
	WIPLocationID string `gorm:"column:wipLocationID" json:"WIPLocationID"`
}
