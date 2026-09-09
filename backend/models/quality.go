package models

import "time"

type InspectionPoint struct {
	InspectionPointID string `gorm:"primaryKey;column:inspectionPointID" json:"inspectionPointID"`
	PointName         string `gorm:"column:pointName" json:"pointName"`
	Description       string `gorm:"column:description" json:"description"`

	OrderID string `gorm:"column:orderID" json:"orderID"`

	Inspections            []Inspection            `gorm:"foreignKey:InspectionPointID" json:"inspections"`
	InspectionRequirements []InspectionRequirement `gorm:"foreignKey:InspectionPointID" json:"inspectionRequirements"`
}

type InspectionRequirement struct {
	RequirementID string `gorm:"primaryKey;column:requirementID" json:"requirementID"`
	Specification string `gorm:"column:specification" json:"specification"`
	Sequence      int    `gorm:"column:sequence" json:"sequence"`

	InspectionPointID string `gorm:"column:inspectionPointID" json:"inspectionPointID"`

	ParameterID     string               `gorm:"column:parameterId" json:"parameterId"`
	InspectionParam *InspectionParameter `gorm:"-" json:"parameter"`

	InspectionItems []InspectionItem `gorm:"foreignKey:RequirementID" json:"inspectionItems"`
}

type InspectionParameter struct {
	ParameterID   string `gorm:"primaryKey;column:parameterId" json:"parameterId"`
	ParameterName string `gorm:"column:parameterName" json:"parameterName"`
	Unit          string `gorm:"column:unit" json:"unit"`
}

type Inspection struct {
	InspectionID       string    `gorm:"primaryKey;column:inspectionID" json:"inspectionID"`
	InspectionDateTime time.Time `gorm:"column:inspectionDateTime" json:"inspectionDateTime"`
	OverallResult      string    `gorm:"column:overallResult" json:"overallResult"`
	ActionGuideline    string    `gorm:"column:actionGuideline" json:"actionGuideline"`
	Status             string    `gorm:"column:status" json:"status"`
	Remark             string    `gorm:"column:remark" json:"remark"`
	InspectedBy        string    `gorm:"column:inspectedBy" json:"inspectedBy"`

	InspectionPointID string `gorm:"column:inspectionPointID" json:"inspectionPointID"`

	CorrectionRecord *CorrectionRecord `gorm:"foreignKey:InspectionID" json:"correctionRecord"`
	InspectionItems  []InspectionItem  `gorm:"foreignKey:InspectionID" json:"inspectionItems"`
}

type CorrectionRecord struct {
	CorrectionID       string    `gorm:"primaryKey;column:correctionID" json:"correctionID"`
	CorrectionDateTime time.Time `gorm:"column:correctionDateTime" json:"correctionDateTime"`
	Action             string    `gorm:"column:action" json:"action"`
	Remark             string    `gorm:"column:remark" json:"remark"`
	CorrectedBy        string    `gorm:"column:correctedBy" json:"correctedBy"`

	InspectionID string `gorm:"uniqueIndex;column:inspectionID" json:"inspectionID"`
}

type InspectionItem struct {
	ItemID      string `gorm:"primaryKey;column:itemID" json:"itemID"`
	ActualValue string `gorm:"column:actualValue" json:"actualValue"`
	Result      string `gorm:"column:result" json:"result"`
	Remark      string `gorm:"column:remark" json:"remark"`

	InspectionID  string `gorm:"column:inspectionID" json:"inspectionID"`
	RequirementID string `gorm:"column:requirementID" json:"requirementID"`
}