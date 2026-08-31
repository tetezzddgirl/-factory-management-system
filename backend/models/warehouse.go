package models

import "time"

type RawMaterial struct {
	RmID        string `json:"rmID" gorm:"primaryKey;column:rm_id"`
	RawMaterial string `json:"rawMaterial" gorm:"not null"`
	Amount      int    `json:"amount"`
	Unit        string `json:"unit"`
	Max         int    `json:"max"`
	Min         int    `json:"min"`
}

type RawMaterialLocation struct {
	RmLocationID  string `json:"rmLocationID" gorm:"primaryKey;column:rm_location_id"`
	Location      string `json:"location"`
	PalletNumber string  `json:"palletNumber"`
	LotNumber     string `json:"lotNumber"`
	Amount        int    `json:"amount"`
	RmID          string `json:"rmID" gorm:"column:rm_id"`
}

type RawMaterialRecord struct {
	Timestamp    time.Time `json:"timestamp"`
	RmRecordID   string    `json:"rmRecordID" gorm:"primaryKey;column:rm_record_id"`
	Type         string    `json:"type"`
	Amount       int       `json:"amount"`
	LeftAmount   int       `json:"leftAmount"`
	Handler      string    `json:"handler"`
	Agency       string    `json:"agency"`
	OrderID      string    `json:"orderID"`
	RmID         string    `json:"rmID"`
	RmLocationID string    `json:"rmLocationID" gorm:"column:rm_location_id"`
	
}

type WorkInProcess struct {
	WipID   string `json:"wipID" gorm:"primaryKey;column:wip_id"`
	Wip     string `json:"wip"`
	InStage string `json:"inStage"`
	Amount  int    `json:"amount"`
	Unit    string `json:"unit"`
	Max     int    `json:"max"`
}

type WIPLocation struct {
	WipLocationID string `json:"wipLocationID" gorm:"primaryKey;column:wip_location_id"`
	Location      string `json:"location"`
	PalletNumber  string `json:"palletNumber"`
	LotNumber     string `json:"lotNumber"`
	Amount        int    `json:"amount"`
	WipID         string `json:"wipID" gorm:"column:wip_id"`

	OrderID *string `gorm:"column:orderID" json:"orderId"`

	TransferRecords []TransferRecord `gorm:"foreignKey:WIPLocationID" json:"transferRecords"`
}

type WorkInProcessRecord struct {
	Timestamp     time.Time `json:"timestamp"`
	WipRecordID   string    `json:"wipRecordID" gorm:"primaryKey;column:wip_record_id"`
	Type          string    `json:"type"`
	InStage       string    `json:"inStage"`
	Amount        int       `json:"amount"`
	LeftAmount    int       `json:"leftAmount"`
	Handler       string    `json:"handler"`
	Agency        string    `json:"agency"`
	OrderID       string    `json:"orderID"`
	WipID   	  string 	`json:"wipID"`
	WipLocationID string    `json:"wipLocationID" gorm:"column:wip_location_id"`
}

type RequisitionSlip struct {
	Timestamp     time.Time `json:"timestamp"`
	SlipID        string    `json:"slipID" gorm:"primaryKey;column:slip_id"`
	Amount        int       `json:"amount"`
	Status        string    `json:"status"`
	Handler       string    `json:"handler"`
	Approver      string    `json:"approver"`
	ApproveTime   time.Time `json:"approveTime"`
	OrderID       string    `json:"orderID"`
	WipLocationID string    `json:"wipID" gorm:"column:wip_location_id"`
}

type Inventory struct {
	InventoryID string `gorm:"primaryKey;column:inventoryID" json:"inventoryId"`
	Name        string `gorm:"column:name" json:"name"`
	Quantity    int    `gorm:"column:quantity" json:"quantity"`
	Unit        string `gorm:"column:unit" json:"unit"`

	TransferRecords []TransferRecord `gorm:"foreignKey:InventoryID" json:"transferRecords"`
}