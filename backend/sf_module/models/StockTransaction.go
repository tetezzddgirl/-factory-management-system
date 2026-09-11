package models

import "gorm.io/gorm"

// StockTransaction represents a stock movement (receive / issue)
type StockTransaction struct {
	gorm.Model
	TransactionID string `gorm:"uniqueIndex" json:"id"`
	Type          string `json:"type"` // "receive" | "issue"
	Code          string `json:"code"` // Item code
	Name          string `json:"name"` // Item name
	Quantity      int    `json:"quantity"`
	Location      string `json:"location"`
	Palette       string `json:"palette"`
	Lot           string `json:"lot"`
	WarehouseID   string `json:"warehouseId"`
	WarehouseName string `json:"warehouseName"`
	Remark        string `json:"remark"` // เหตุผล / หมายเหตุในการเบิกจ่ายหรือรับเข้า
	CreatedAtStr  string `json:"createdAt"`
}

func (StockTransaction) TableName() string {
	return "sf_stock_transactions"
}
