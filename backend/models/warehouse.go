package models

import "time"

type RawMaterial struct {
	RmID        string `json:"rmID" gorm:"primaryKey;column:rm_id"`
	RawMaterial string `json:"rawMaterial" gorm:"not null"`
	Amount      int    `json:"amount"`
	Unit        string `json:"unit"`
	Max         int    `json:"max"`
	Min         int    `json:"min"`

	Locations []RawMaterialLocation `json:"locations,omitempty" gorm:"foreignKey:RmID"`
}

type RawMaterialLocation struct {
	RmLocationID  string `json:"rmLocationID" gorm:"primaryKey;column:rm_location_id"`
	Location      string `json:"location"`
	PalletNumber string  `json:"palletNumber"`
	LotNumber     string `json:"lotNumber"`
	Amount        int    `json:"amount"`
	RmID          string `json:"rmID" gorm:"column:rm_id"`

	Records   []RawMaterialRecord   `json:"records,omitempty" gorm:"foreignKey:RmLocationID"`
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
	RmID         string    `json:"rmID" gorm:"->;column:rm_id"`
	RmLocationID string    `json:"rmLocationID" gorm:"column:rm_location_id"`
	
}

type WorkInProcess struct {
	WipID   string `json:"wipID" gorm:"primaryKey;column:wip_id"`
	Wip     string `json:"wip"`
	InStage string `json:"inStage"`
	Amount  int    `json:"amount"`
	Unit    string `json:"unit"`
	Max     int    `json:"max"`

	Locations []WIPLocation         `json:"locations,omitempty" gorm:"foreignKey:WipID"`
}

type WIPLocation struct {
	WipLocationID string `json:"wipLocationID" gorm:"primaryKey;column:wip_location_id"`
	Location      string `json:"location"`
	PalletNumber  string `json:"palletNumber"`
	LotNumber     string `json:"lotNumber"`
	Amount        int    `json:"amount"`
	WipID         string `json:"wipID" gorm:"column:wip_id"`

	Records   []WorkInProcessRecord `json:"records,omitempty" gorm:"foreignKey:WipLocationID"`
}

func (WIPLocation) TableName() string {
	return "wip_locations"
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
	WipID   	  string 	`json:"wipID" gorm:"->;column:wip_id"`
	WipLocationID string    `json:"wipLocationID" gorm:"column:wip_location_id"`
}

func (WorkInProcessRecord) TableName() string {
	return "work_in_process_records"
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
