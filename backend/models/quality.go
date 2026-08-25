package models

import "time"

type InspectionPoint struct {
	InspectionPointID string `gorm:"primaryKey;column:inspectionPointId" json:"inspectionPointId"`
	PointName         string `gorm:"column:pointName" json:"pointName"`
	Description       string `gorm:"column:description" json:"description"`

	OrderID string `gorm:"column:orderID" json:"orderId"`

	Inspections            []Inspection            `gorm:"foreignKey:InspectionPointID" json:"inspections"`
	InspectionRequirements []InspectionRequirement `gorm:"many2many:InspectionPointRequirement;joinForeignKey:InspectionPointID;joinReferences:RequirementID" json:"inspectionRequirements"`
}

type InspectionRequirement struct {
	RequirementID string `gorm:"primaryKey;column:requirementId" json:"requirementId"`
	CheckItem     string `gorm:"column:checkItem" json:"checkItem"`
	Specification string `gorm:"column:specification" json:"specification"`
	Unit          string `gorm:"column:unit" json:"unit"`

	InspectionPoints []InspectionPoint `gorm:"many2many:InspectionPointRequirement;joinForeignKey:RequirementID;joinReferences:InspectionPointID" json:"inspectionPoints"`
	InspectionItems  []InspectionItem  `gorm:"foreignKey:RequirementID" json:"inspectionItems"`
}

// Association Table for M:N
type InspectionPointRequirement struct {
	InspectionPointID string `gorm:"primaryKey;column:inspectionPointId" json:"inspectionPointId"`
	RequirementID     string `gorm:"primaryKey;column:requirementId" json:"requirementId"`
}

func (InspectionPointRequirement) TableName() string {
	return "InspectionPointRequirement"
}

type Inspection struct {
	InspectionID       string    `gorm:"primaryKey;column:inspectionId" json:"inspectionId"`
	InspectionDateTime time.Time `gorm:"column:inspectionDateTime" json:"inspectionDateTime"`
	OverallResult      string    `gorm:"column:overallResult" json:"overallResult"`
	ActionGuideline    string    `gorm:"column:actionGuideline" json:"actionGuideline"`
	Status             string    `gorm:"column:status" json:"status"`
	Remark             string    `gorm:"column:remark" json:"remark"`
	InspectedBy        string    `gorm:"column:inspectedBy" json:"inspectedBy"`

	InspectionPointID string `gorm:"column:inspectionPointId" json:"inspectionPointId"`

	CorrectionRecord *CorrectionRecord `gorm:"foreignKey:InspectionID" json:"correctionRecord"`
	InspectionItems  []InspectionItem  `gorm:"foreignKey:InspectionID" json:"inspectionItems"`
}

type CorrectionRecord struct {
	CorrectionID       string    `gorm:"primaryKey;column:correctionId" json:"correctionId"`
	CorrectionDateTime time.Time `gorm:"column:correctionDateTime" json:"correctionDateTime"`
	Action             string    `gorm:"column:action" json:"action"`
	Status             string    `gorm:"column:status" json:"status"`
	Remark             string    `gorm:"column:remark" json:"remark"`
	CorrectedBy        string    `gorm:"column:correctedBy" json:"correctedBy"`

	InspectionID string `gorm:"uniqueIndex;column:inspectionId" json:"inspectionId"`
}

type InspectionItem struct {
	ItemID      string `gorm:"primaryKey;column:itemId" json:"itemId"`
	ActualValue string `gorm:"column:actualValue" json:"actualValue"`
	Result      string `gorm:"column:result" json:"result"`
	Remark      string `gorm:"column:remark" json:"remark"`

	InspectionID  string `gorm:"column:inspectionId" json:"inspectionId"`
	RequirementID string `gorm:"column:requirementId" json:"requirementId"`
}
