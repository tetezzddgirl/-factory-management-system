package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type QualityHandler struct {
	db *gorm.DB
}

func NewQualityHandler(db *gorm.DB) *QualityHandler {
	return &QualityHandler{db: db}
}

// ==========================================
// 1. Inspection Requirements & Parameters
// ==========================================

// CreateRequirement สร้าง InspectionParameter หรือ Requirement Master Data
func (h *QualityHandler) CreateRequirement(c *gin.Context) {
	var payload struct {
		ParameterName string `json:"checkItem" binding:"required"`
		Unit          string `json:"unit"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	paramID := "PRM-" + time.Now().Format("20060102150405")
	newParam := models.InspectionParameter{
		ParameterID:   paramID,
		ParameterName: payload.ParameterName,
		Unit:          payload.Unit,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&newParam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, newParam)
}

// ListRequirements ดึงรายชื่อ Master Parameter ทั้งหมดส่งไปให้หน้าเว็บเลือกใน Dropdown
func (h *QualityHandler) ListRequirements(c *gin.Context) {
	var params []models.InspectionParameter
	err := h.db.WithContext(c.Request.Context()).Find(&params).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type RequirementOption struct {
		ParameterID string `json:"requirementID"` // แมพให้ตรงกับ Value ของ Dropdown ฝั่งหน้าบ้าน
		CheckItem   string `json:"checkItem"`
		Unit        string `json:"unit"`
	}

	var res []RequirementOption
	for _, p := range params {
		res = append(res, RequirementOption{
			ParameterID: p.ParameterID,
			CheckItem:   p.ParameterName,
			Unit:        p.Unit,
		})
	}

	c.JSON(http.StatusOK, res)
}

// ==========================================
// 2. Inspection Points
// ==========================================

type CreatePointRequest struct {
	OrderID      string `json:"orderId" binding:"required"`
	PointName    string `json:"pointName" binding:"required"`
	Description  string `json:"description"`
	InspectItems []struct {
		RequirementID string `json:"requirementID"` // จะเก็บ parameterId จาก Dropdown หรือ "OTHER"
		CheckItem     string `json:"checkItem"`
		Specification string `json:"specification"`
		Unit          string `json:"unit"`
	} `json:"inspectItems"`
}

func (h *QualityHandler) CreatePoint(c *gin.Context) {
	var payload CreatePointRequest
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		// 1. สร้าง InspectionPoint
		pointID := "PT-" + time.Now().Format("20060102150405")
		point := models.InspectionPoint{
			InspectionPointID: pointID,
			PointName:         payload.PointName,
			Description:       payload.Description,
			OrderID:           payload.OrderID,
		}
		if err := tx.Create(&point).Error; err != nil {
			return err
		}

		// 2. บันทึก Requirements และ Parameters
		for idx, item := range payload.InspectItems {
			paramID := item.RequirementID

			// หากเป็นการกรอกใหม่ (OTHER หรือไม่มี ID) ให้สร้าง Parameter ลง Master Data ก่อน
			if paramID == "OTHER" || paramID == "" {
				paramID = fmt.Sprintf("PRM-%s-%03d", time.Now().Format("20060102150405"), idx)
				newParameter := models.InspectionParameter{
					ParameterID:   paramID,
					ParameterName: item.CheckItem,
					Unit:          item.Unit,
				}
				if err := tx.Create(&newParameter).Error; err != nil {
					return err
				}
			}

			// สร้าง InspectionRequirement โดยใส่ parameterId เป็น FK
			reqID := fmt.Sprintf("REQ-%s-%03d", time.Now().Format("20060102150405"), idx)
			newReq := models.InspectionRequirement{
				RequirementID:     reqID,
				Specification:     item.Specification,
				Sequence:          idx + 1,
				InspectionPointID: pointID,
				ParameterID:       paramID, // 👈 เชื่อม FK เข้า Parameter
			}

			if err := tx.Create(&newReq).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Inspection point created successfully"})
}

func (h *QualityHandler) GetPointsByOrderID(c *gin.Context) {
	orderID := c.Param("id")
	var points []models.InspectionPoint

	err := h.db.WithContext(c.Request.Context()).
		Preload("InspectionRequirements", func(db *gorm.DB) *gorm.DB {
			return db.Order("sequence ASC")
		}).
		Preload("Inspections").
		Where(`"orderID" = ?`, orderID).
		Find(&points).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// ดึง Master Parameter ทั้งหมดมาทำ Map สำหรับ Lookup
	var allParams []models.InspectionParameter
	if err := h.db.WithContext(c.Request.Context()).Find(&allParams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	paramMap := make(map[string]models.InspectionParameter)
	for _, p := range allParams {
		paramMap[p.ParameterID] = p
	}

	type InspectItemResponse struct {
		RequirementID string `json:"requirementID"`
		ParameterID   string `json:"parameterId"`
		Name          string `json:"name"`
		Spec          string `json:"spec"`
		Unit          string `json:"unit"`
	}

	type PointResponse struct {
		InspectionPointID string                `json:"inspectionPointID"`
		OrderID           string                `json:"orderID"`
		PointName         string                `json:"pointName"`
		Description       string                `json:"description"`
		ItemsToInspect    int                   `json:"itemsToInspect"`
		InspectionSheets  int                   `json:"inspectionSheets"`
		Status            string                `json:"status"`
		InspectItems      []InspectItemResponse `json:"inspectItems"`
	}

	var response []PointResponse
	for _, pt := range points {
		var inspectItems []InspectItemResponse
		for _, req := range pt.InspectionRequirements {
			name := "-"
			unit := "-"
			if param, exists := paramMap[req.ParameterID]; exists {
				name = param.ParameterName
				unit = param.Unit
			}

			inspectItems = append(inspectItems, InspectItemResponse{
				RequirementID: req.RequirementID,
				ParameterID:   req.ParameterID,
				Name:          name,
				Spec:          req.Specification,
				Unit:          unit,
			})
		}

		response = append(response, PointResponse{
			InspectionPointID: pt.InspectionPointID,
			OrderID:           pt.OrderID,
			PointName:         pt.PointName,
			Description:       pt.Description,
			ItemsToInspect:    len(pt.InspectionRequirements),
			InspectionSheets:  len(pt.Inspections),
			Status:            "Active",
			InspectItems:      inspectItems,
		})
	}

	c.JSON(http.StatusOK, response)
}

// ==========================================
// 3. Inspections
// ==========================================

// Struct สำหรับรับ Request บันทึกผลตรวจ
type CreateInspectionRequest struct {
	OrderID            string `json:"orderID"`
	InspectionPointID  string `json:"inspectionPointID" binding:"required"`
	OverallResult      string `json:"overallResult" binding:"required"`
	ActionGuideline    string `json:"actionGuideline"`
	Remark             string `json:"remark"`
	InspectedBy        string `json:"inspectedBy" binding:"required"`
	InspectionDateTime string `json:"inspectionDateTime"`
	Status             string `json:"status"`
	Items              []struct {
		RequirementID string `json:"requirementID"`
		ActualValue   string `json:"actualValue"`
		Result        string `json:"result"`
		Remark        string `json:"remark"`
	} `json:"items"`
}

// Handler บันทึก Inspection + InspectionItems
func (h *QualityHandler) CreateInspection(c *gin.Context) {
	var req CreateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := h.db.WithContext(c.Request.Context()).Begin()

	inspectionID := "INSP-" + time.Now().Format("20060102150405")
	inspDateTime, err := time.Parse(time.RFC3339, req.InspectionDateTime)
	if err != nil {
		inspDateTime = time.Now()
	}

	newInspection := models.Inspection{
		InspectionID:       inspectionID,
		InspectionPointID:  req.InspectionPointID,
		InspectionDateTime: inspDateTime,
		InspectedBy:        req.InspectedBy,
		OverallResult:      req.OverallResult,
		ActionGuideline:    req.ActionGuideline,
		Remark:             req.Remark,
		Status:             req.Status,
	}

	if err := tx.Create(&newInspection).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inspection: " + err.Error()})
		return
	}

	// บันทึกลงตาราง inspection_items
	for _, item := range req.Items {
		if item.RequirementID == "" {
			continue
		}
		newItem := models.InspectionItem{
			ItemID:        "ITEM-" + time.Now().Format("150405") + "-" + item.RequirementID,
			InspectionID:  inspectionID,
			RequirementID: item.RequirementID,
			ActualValue:   item.ActualValue,
			Result:        item.Result,
			Remark:        item.Remark,
		}
		if err := tx.Create(&newItem).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inspection item: " + err.Error()})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction commit failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Inspection created successfully",
		"inspectionID": inspectionID,
	})
}

func (h *QualityHandler) GetInspectionsByPointID(c *gin.Context) {
	pointID := c.Param("pointId")
	var inspections []models.Inspection

	err := h.db.WithContext(c.Request.Context()).
		Preload("InspectionItems").
		Preload("CorrectionRecord").
		Where(`"inspectionPointID" = ?`, pointID).
		Order(`"inspectionDateTime" DESC`).
		Find(&inspections).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspections)
}

func (h *QualityHandler) GetInspectionsByOrderID(c *gin.Context) {
	orderID := c.Param("id")

	// 1. ดึงจุดตรวจทั้งหมดของ Order นี้มาก่อน
	var points []models.InspectionPoint
	if err := h.db.WithContext(c.Request.Context()).
		Where(`"orderID" = ?`, orderID).
		Find(&points).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(points) == 0 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	// 2. รวบรวม Point IDs และทำ Map ชื่อจุดตรวจ
	var pointIDs []string
	pointNameMap := make(map[string]string)
	for _, pt := range points {
		pointIDs = append(pointIDs, pt.InspectionPointID)
		pointNameMap[pt.InspectionPointID] = pt.PointName
	}

	// 3. ดึง inspections โดยใช้ inspectionPointID IN (...)
	var inspections []models.Inspection
	err := h.db.WithContext(c.Request.Context()).
		Where(`"inspectionPointID" IN (?)`, pointIDs).
		Order(`"inspectionDateTime" DESC`).
		Find(&inspections).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

type InspectionResponse struct {
		InspectionID       string `json:"inspectionID"`
		InspectionPointID  string `json:"inspectionPointID"`
		PointName          string `json:"pointName"`
		InspectionDateTime string `json:"inspectionDateTime"`
		InspectedBy        string `json:"inspectedBy"`
		OverallResult      string `json:"overallResult"`
		ActionGuideline    string `json:"actionGuideline"`
		Remark             string `json:"remark"`
		Status             string `json:"status"`
	}

	response := make([]InspectionResponse, 0, len(inspections))
	for _, insp := range inspections {
		ptName := pointNameMap[insp.InspectionPointID]
		if ptName == "" {
			ptName = insp.InspectionPointID
		}

		response = append(response, InspectionResponse{
			InspectionID:       insp.InspectionID,
			InspectionPointID:  insp.InspectionPointID,
			PointName:          ptName,
			InspectionDateTime: insp.InspectionDateTime.Format(time.RFC3339),
			InspectedBy:        insp.InspectedBy,
			OverallResult:      insp.OverallResult,
			ActionGuideline:    insp.ActionGuideline,
			Remark:             insp.Remark,
			Status:             insp.Status,
		})
	}

	c.JSON(http.StatusOK, response)
}

// Struct สำหรับรับ Request สร้าง Correction
type UpdateCorrectionRequest struct {
	InspectionID string `json:"inspectionID"`
	Action       string `json:"action"`
	Remark       string `json:"remark"`
	CorrectedBy  string `json:"correctedBy"`
}

// Handler บันทึก/อัปเดต Correction (Upsert)
func (h *QualityHandler) CreateCorrection(c *gin.Context) {
	var req UpdateCorrectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.CorrectionRecord
	err := h.db.WithContext(c.Request.Context()).
		Where(`"inspectionID" = ?`, req.InspectionID).
		First(&existing).Error

	if err == nil {
		// ถ้ามีอยู่แล้ว -> ทำการ UPDATE ข้อมูลเดิม
		existing.Action = req.Action
		existing.Remark = req.Remark
		existing.CorrectedBy = req.CorrectedBy
		existing.CorrectionDateTime = time.Now()

		if err := h.db.WithContext(c.Request.Context()).Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update correction: " + err.Error()})
			return
		}

		// อัปเดตสถานะของ Inspection เป็น Completed
		h.db.WithContext(c.Request.Context()).
			Model(&models.Inspection{}).
			Where(`"inspectionID" = ?`, req.InspectionID).
			Update("status", "Completed")

		c.JSON(http.StatusOK, gin.H{
			"message":      "Correction updated successfully",
			"correctionID": existing.CorrectionID,
		})
		return
	}

	// ถ้ายังไม่มี -> ทำการ INSERT ใหม่
	correctionID := "CORR-" + time.Now().Format("20060102150405")
	newCorrection := models.CorrectionRecord{
		CorrectionID:       correctionID,
		InspectionID:       req.InspectionID,
		Action:             req.Action,
		Remark:             req.Remark,
		CorrectedBy:        req.CorrectedBy,
		CorrectionDateTime: time.Now(),
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&newCorrection).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create correction: " + err.Error()})
		return
	}

	// อัปเดตสถานะของ Inspection เป็น Completed
	h.db.WithContext(c.Request.Context()).
		Model(&models.Inspection{}).
		Where(`"inspectionID" = ?`, req.InspectionID).
		Update("status", "Completed")

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Correction created successfully",
		"correctionID": correctionID,
	})
}

// GetInspectionItems ดึงข้อมูลรายการย่อยทั้งหมดของ Inspection นั้นๆ
func (h *QualityHandler) GetInspectionItems(c *gin.Context) {
	inspectionID := c.Param("id") // 👈 เปลี่ยนจาก "inspectionId" เป็น "id"
	var items []models.InspectionItem

	err := h.db.WithContext(c.Request.Context()).
		Where(`"inspectionID" = ?`, inspectionID).
		Find(&items).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch items"})
		return
	}

	if len(items) == 0 {
		c.JSON(http.StatusOK, []models.InspectionItem{})
		return
	}

	c.JSON(http.StatusOK, items)
}

// 1. ดึงข้อมูล Inspection รายตัว
func (h *QualityHandler) GetInspectionByID(c *gin.Context) {
	id := c.Param("id")
	var inspection models.Inspection

	err := h.db.WithContext(c.Request.Context()).
		Where(`"inspectionID" = ?`, id).
		First(&inspection).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

// GetCorrectionByInspectionID ดึงใบแจ้งแก้ไขตาม inspectionID
func (h *QualityHandler) GetCorrectionByInspectionID(c *gin.Context) {
	// รองรับทั้ง :id และ :inspectionId
	inspectionID := c.Param("id")
	if inspectionID == "" {
		inspectionID = c.Param("inspectionId")
	}

	if inspectionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "inspectionID is required"})
		return
	}

	var correction models.CorrectionRecord
	err := h.db.WithContext(c.Request.Context()).
		Where(`"inspectionID" = ?`, inspectionID).
		First(&correction).Error

	if err != nil {
		// ถ้าไม่พบข้อมูล ให้ตอบ 200 พร้อม Object ว่าง เพื่อไม่ให้ Frontend พ่น Error สีแดง 404
		c.JSON(http.StatusOK, gin.H{"message": "No correction found", "data": nil})
		return
	}

	c.JSON(http.StatusOK, correction)
}