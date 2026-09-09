package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MachineHandler รวม dependency ของ endpoint ฝั่งเครื่องจักร (Machines)
//
// พอร์ตมาจาก Machinery-maintenance (internal/services/machinery_service.go) แต่คืน JSON
// เป็นรูปแบบแบนตัวเดียวกับที่หน้าเว็บของ FactoryFlow ใช้ (ไม่มี envelope success/data)
// เพื่อให้ apiFetch ใน frontend/src/lib/api-client.ts ใช้ได้ตรงๆ
type MachineHandler struct {
	db *gorm.DB
}

// NewMachineHandler สร้าง MachineHandler ตัวใหม่
func NewMachineHandler(db *gorm.DB) *MachineHandler {
	return &MachineHandler{db: db}
}

// MachineResponse คือรูปแบบข้อมูลเครื่องจักรที่ส่งให้หน้าเว็บ
// (id/name ยังใช้ชื่อเดิม เพื่อให้หน้า "บุคลากร" และ "งานและการมอบหมาย" ที่อ้างอิงอยู่แล้วไม่พัง)
type MachineResponse struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Status           string  `json:"status"`
	StatusName       string  `json:"statusName"`
	Hours            float64 `json:"hours"`
	TypeID           *uint   `json:"typeID"`
	Type             string  `json:"type"`
	Description      string  `json:"description"`
	Staff            string  `json:"staff"`
	OwnerRole        string  `json:"ownerRole"`
	CurrentJob       string  `json:"currentJob"`
	ProductionLineID *uint   `json:"productionLineID"`
	ProductionLine   string  `json:"productionLine"`
	LineOrder        float64 `json:"lineOrder"`
	RepairStatus     string  `json:"repairStatus"`
}

func toMachineResponse(m models.Machinery) MachineResponse {
	out := MachineResponse{
		ID:               m.MachineryID,
		Name:             m.MachineName,
		Hours:            m.WorkingHours,
		TypeID:           m.TypeID,
		Description:      m.Description,
		Staff:            m.Staff,
		OwnerRole:        m.OwnerRole,
		ProductionLineID: m.ProductionLineID,
		LineOrder:        m.LineOrder,
	}
	if m.StatusID != nil {
		out.Status = *m.StatusID
	}
	if m.Status != nil {
		out.StatusName = m.Status.StatusName
	}
	if m.Type != nil {
		out.Type = m.Type.TypeName
	}
	if m.WorkID != nil {
		out.CurrentJob = *m.WorkID
	}
	if m.ProductionLine != nil {
		out.ProductionLine = m.ProductionLine.ProductionlineName
	}
	if m.RepairStatusID != nil {
		out.RepairStatus = *m.RepairStatusID
	}
	return out
}

func (h *MachineHandler) preloaded() *gorm.DB {
	return h.db.Preload("Type").Preload("Status").Preload("RepairStatus").Preload("ProductionLine")
}

// validStatus ตรวจว่าสถานะที่ส่งมามีอยู่จริงในตารางสถานะเครื่องจักร
// (คอลัมน์ status_id ไม่ได้ผูก FK ไว้ ตามแนวทาง FK-light ของ FactoryFlow จึงต้องเช็คเองตรงนี้)
func (h *MachineHandler) validStatus(status string) bool {
	var n int64
	h.db.Model(&models.MachineStatus{}).Where("status_id = ?", status).Count(&n)
	return n > 0
}

// ListMachines คืนรายการเครื่องจักรทั้งหมด (เรียงตามรหัสเครื่อง)
func (h *MachineHandler) ListMachines(c *gin.Context) {
	rows := []models.Machinery{}
	if err := h.preloaded().Order("machinery_id").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]MachineResponse, 0, len(rows))
	for _, m := range rows {
		out = append(out, toMachineResponse(m))
	}
	c.JSON(http.StatusOK, out)
}

// GetMachine คืนข้อมูลเครื่องจักรตัวเดียวตามรหัสเครื่อง
func (h *MachineHandler) GetMachine(c *gin.Context) {
	var m models.Machinery
	if err := h.preloaded().First(&m, "machinery_id = ?", c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบเครื่องจักรนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toMachineResponse(m))
}

type machineCreateInput struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Status           string   `json:"status"`
	Hours            *float64 `json:"hours"`
	TypeID           *uint    `json:"typeID"`
	Description      string   `json:"description"`
	Staff            string   `json:"staff"`
	OwnerRole        string   `json:"ownerRole"`
	CurrentJob       string   `json:"currentJob"`
	ProductionLineID *uint    `json:"productionLineID"`
	LineOrder        *float64 `json:"lineOrder"`
}

// CreateMachine เพิ่มเครื่องจักรใหม่
func (h *MachineHandler) CreateMachine(c *gin.Context) {
	var in machineCreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	in.ID = strings.TrimSpace(in.ID)
	in.Name = strings.TrimSpace(in.Name)
	if in.ID == "" || in.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุรหัสเครื่องและชื่อเครื่อง"})
		return
	}

	// ต้องมองข้ามขอบเขต soft delete ตรงนี้ เพราะแถวที่ถูกลบไปแล้วยังกิน primary key อยู่
	// ถ้าเช็คแบบปกติจะไม่เห็นแถวนั้น แล้วไปพังตอน INSERT ด้วย duplicate key แทน
	var existing models.Machinery
	lookupErr := h.db.Unscoped().First(&existing, "machinery_id = ?", in.ID).Error
	if lookupErr != nil && !errors.Is(lookupErr, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": lookupErr.Error()})
		return
	}
	reviving := lookupErr == nil
	if reviving && !existing.DeletedAt.Valid {
		c.JSON(http.StatusConflict, gin.H{"error": "รหัสเครื่องนี้มีอยู่แล้ว"})
		return
	}

	status := strings.TrimSpace(in.Status)
	if status == "" {
		status = "idle"
	}
	if !h.validStatus(status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "สถานะเครื่องจักรไม่ถูกต้อง"})
		return
	}
	doneStatus := "done"

	m := models.Machinery{
		MachineryID:      in.ID,
		MachineName:      in.Name,
		Description:      strings.TrimSpace(in.Description),
		Staff:            strings.TrimSpace(in.Staff),
		OwnerRole:        strings.TrimSpace(in.OwnerRole),
		StatusID:         &status,
		RepairStatusID:   &doneStatus,
		TypeID:           in.TypeID,
		ProductionLineID: in.ProductionLineID,
	}
	if in.Hours != nil && *in.Hours >= 0 {
		m.WorkingHours = *in.Hours
	}
	if in.LineOrder != nil {
		m.LineOrder = *in.LineOrder
	}
	// productionLineID = 0 หมายถึง "ไม่อยู่ในสายการผลิต" (รหัสสายจริงเริ่มที่ 1)
	if m.ProductionLineID != nil && *m.ProductionLineID == 0 {
		m.ProductionLineID = nil
	}
	if job := strings.TrimSpace(in.CurrentJob); job != "" {
		m.WorkID = &job
	}

	var saveErr error
	if reviving {
		// เคยมีเครื่องรหัสนี้แล้วถูกลบไป — นำแถวเดิมกลับมาใช้ด้วยข้อมูลชุดใหม่ทั้งหมด
		saveErr = h.db.Unscoped().Model(&existing).Updates(map[string]any{
			"machine_name":       m.MachineName,
			"description":        m.Description,
			"staff":              m.Staff,
			"owner_role":         m.OwnerRole,
			"working_hours":      m.WorkingHours,
			"status_id":          m.StatusID,
			"repair_status_id":   m.RepairStatusID,
			"type_id":            m.TypeID,
			"production_line_id": m.ProductionLineID,
			"line_order":         m.LineOrder,
			"work_id":            m.WorkID,
			"deleted_at":         nil,
		}).Error
	} else {
		saveErr = h.db.Create(&m).Error
	}
	if saveErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": saveErr.Error()})
		return
	}

	var saved models.Machinery
	h.preloaded().First(&saved, "machinery_id = ?", m.MachineryID)
	c.JSON(http.StatusOK, toMachineResponse(saved))
}

type machineUpdateInput struct {
	Name             *string  `json:"name"`
	Status           *string  `json:"status"`
	Hours            *float64 `json:"hours"`
	TypeID           *uint    `json:"typeID"`
	Description      *string  `json:"description"`
	Staff            *string  `json:"staff"`
	OwnerRole        *string  `json:"ownerRole"`
	CurrentJob       *string  `json:"currentJob"`
	ProductionLineID *uint    `json:"productionLineID"`
	LineOrder        *float64 `json:"lineOrder"`
}

// UpdateMachine แก้ไขข้อมูลเครื่องจักร
//
// ใช้ map เป็นชุดคำสั่ง update แทน Updates(struct) เพราะ GORM ข้ามค่า zero ให้เสมอ
// ทำให้ล้างค่าเป็น NULL ไม่ได้ — ที่นี่ currentJob = "" แปลว่า "เลิกมอบหมายงาน"
// และ productionLineID = 0 แปลว่า "เอาเครื่องออกจากสายการผลิต"
func (h *MachineHandler) UpdateMachine(c *gin.Context) {
	id := c.Param("id")

	var m models.Machinery
	if err := h.db.First(&m, "machinery_id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบเครื่องจักรนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var in machineUpdateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	updates := map[string]any{}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ชื่อเครื่องต้องไม่เป็นค่าว่าง"})
			return
		}
		updates["machine_name"] = name
	}
	if in.Status != nil {
		status := strings.TrimSpace(*in.Status)
		if !h.validStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "สถานะเครื่องจักรไม่ถูกต้อง"})
			return
		}
		updates["status_id"] = status
	}
	if in.Hours != nil {
		if *in.Hours < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ชั่วโมงทำงานต้องไม่ติดลบ"})
			return
		}
		updates["working_hours"] = *in.Hours
	}
	if in.TypeID != nil {
		updates["type_id"] = *in.TypeID
	}
	if in.Description != nil {
		updates["description"] = strings.TrimSpace(*in.Description)
	}
	if in.Staff != nil {
		updates["staff"] = strings.TrimSpace(*in.Staff)
	}
	if in.OwnerRole != nil {
		updates["owner_role"] = strings.TrimSpace(*in.OwnerRole)
	}
	if in.CurrentJob != nil {
		if job := strings.TrimSpace(*in.CurrentJob); job == "" {
			updates["work_id"] = nil
		} else {
			updates["work_id"] = job
		}
	}
	if in.ProductionLineID != nil {
		if *in.ProductionLineID == 0 {
			updates["production_line_id"] = nil
			updates["line_order"] = 0
		} else {
			updates["production_line_id"] = *in.ProductionLineID
		}
	}
	if in.LineOrder != nil {
		updates["line_order"] = *in.LineOrder
	}

	if len(updates) > 0 {
		if err := h.db.Model(&m).Updates(updates).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	var saved models.Machinery
	h.preloaded().First(&saved, "machinery_id = ?", id)
	c.JSON(http.StatusOK, toMachineResponse(saved))
}

// DeleteMachine ลบเครื่องจักร (soft delete) พร้อมล้างการอ้างอิงในใบแจ้งซ่อม/ประวัติที่ค้างอยู่
func (h *MachineHandler) DeleteMachine(c *gin.Context) {
	id := c.Param("id")

	err := h.db.Transaction(func(tx *gorm.DB) error {
		// ใบแจ้งซ่อม/ประวัติ ไม่ได้ผูก FK จริง จึงต้องล้าง machinery_id เองไม่ให้เหลือรหัสค้าง
		if err := tx.Model(&models.MachineRepairRequest{}).Where("machinery_id = ?", id).
			Update("machinery_id", nil).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MaintenanceLog{}).Where("machinery_id = ?", id).
			Update("machinery_id", nil).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.MachineWorkHistory{}).Where("machinery_id = ?", id).
			Update("machinery_id", nil).Error; err != nil {
			return err
		}
		return tx.Where("machinery_id = ?", id).Delete(&models.Machinery{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── ข้อมูลตั้งต้น (master data) ของโดเมนเครื่องจักร ─────────────────────────────

// ListMachineTypes คืนประเภทเครื่องจักรทั้งหมด — ใช้เติม dropdown ในฟอร์มเครื่องจักร
func (h *MachineHandler) ListMachineTypes(c *gin.Context) {
	out := []models.TypeofMachinery{}
	if err := h.db.Order("type_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateMachineType เพิ่มประเภทเครื่องจักรใหม่ (type_id เป็น auto increment ฝั่ง DB)
func (h *MachineHandler) CreateMachineType(c *gin.Context) {
	var in struct {
		TypeName string `json:"type_name"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	name := strings.TrimSpace(in.TypeName)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุชื่อประเภทเครื่องจักร"})
		return
	}
	t := models.TypeofMachinery{TypeName: name}
	if err := h.db.Create(&t).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}

// ListMachineStatuses คืนสถานะเครื่องจักรทั้งหมด (running / idle / maintenance / down)
func (h *MachineHandler) ListMachineStatuses(c *gin.Context) {
	out := []models.MachineStatus{}
	if err := h.db.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// parseUintParam อ่านพารามิเตอร์ที่เป็นตัวเลขจาก path
func parseUintParam(c *gin.Context, name string) (uint, bool) {
	v, err := strconv.ParseUint(c.Param(name), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสไม่ถูกต้อง"})
		return 0, false
	}
	return uint(v), true
}
