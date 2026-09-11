package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MaintenanceHandler รวม dependency ของ endpoint ฝั่งซ่อมบำรุง
// (ใบแจ้งซ่อม, ประวัติการซ่อมบำรุง, ประวัติการทำงานของเครื่องจักร)
//
// พอร์ตตรรกะมาจาก Machinery-maintenance:
//   - internal/services/machine_repair_request_service.go (แจ้งซ่อม/ปิดงานซ่อม)
//   - internal/services/work_history_service.go           (ประวัติการทำงาน)
type MaintenanceHandler struct {
	db *gorm.DB
}

// NewMaintenanceHandler สร้าง MaintenanceHandler ตัวใหม่
func NewMaintenanceHandler(db *gorm.DB) *MaintenanceHandler {
	return &MaintenanceHandler{db: db}
}

const dateLayout = "2006-01-02"

// parseDate รับได้ทั้ง "2026-08-27" (จาก input type=date) และ ISO เต็มรูปแบบ
func parseDate(s string) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	if t, err := time.Parse(dateLayout, s); err == nil {
		return &t, nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return nil, fmt.Errorf("รูปแบบวันที่ไม่ถูกต้อง: %s", s)
	}
	return &t, nil
}

func formatDate(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.Format(dateLayout)
}

// ── ใบแจ้งซ่อม / ใบงานบำรุงรักษา ────────────────────────────────────────────────

// MaintenanceOrderResponse คือใบงานซ่อมบำรุงหนึ่งใบในรูปแบบที่หน้าเว็บใช้
type MaintenanceOrderResponse struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	MachineID   string `json:"machineID"`
	MachineName string `json:"machineName"`
	Technician  string `json:"technician"`
	Date        string `json:"date"`
	FinishedAt  string `json:"finishedAt"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	StatusName  string `json:"statusName"`
	Detail      string `json:"detail"`
}

func toOrderResponse(r models.MachineRepairRequest) MaintenanceOrderResponse {
	out := MaintenanceOrderResponse{
		ID:          r.RequestID,
		Code:        r.RequestID,
		MachineName: r.MachineName,
		Technician:  r.Staff,
		Date:        formatDate(r.RepairDate),
		FinishedAt:  formatDate(r.FinishedAt),
		Detail:      r.Description,
		Type:        "CM",
		Status:      "pending",
	}
	if r.MachineryID != nil {
		out.MachineID = *r.MachineryID
	}
	if r.RepairTypeID != nil {
		out.Type = *r.RepairTypeID
	}
	if r.RepairStatusID != nil {
		out.Status = *r.RepairStatusID
	}
	if r.RepairStatus != nil {
		out.StatusName = r.RepairStatus.StatusName
	}
	return out
}

func (h *MaintenanceHandler) preloadedOrders() *gorm.DB {
	return h.db.Preload("RepairType").Preload("RepairStatus")
}

// nextRequestID ต่อเลขจากรหัสการซ่อมล่าสุดที่มีอยู่ (MT-1026 -> MT-1027)
// ใช้ MAX(...) แทนการนับจำนวนแถว เพื่อไม่ให้รหัสชนกันหลังมีการลบใบงานออกไป
func (h *MaintenanceHandler) nextRequestID() (string, error) {
	var maxNum sql.NullInt64
	if err := h.db.Model(&models.MachineRepairRequest{}).
		Select(`MAX(CAST(SUBSTRING(request_id FROM 'MT-([0-9]+)') AS BIGINT))`).
		Scan(&maxNum).Error; err != nil {
		return "", err
	}
	next := int64(1001)
	if maxNum.Valid {
		next = maxNum.Int64 + 1
	}
	return fmt.Sprintf("MT-%d", next), nil
}

// PreviewNextRequestID บอกรหัสใบงานซ่อมใบถัดไปให้หน้าเว็บแสดงตอนเปิดฟอร์ม
// (แนวทางเดียวกับ /api/work-orders/next-id และ /api/plans/next-id)
func (h *MaintenanceHandler) PreviewNextRequestID(c *gin.Context) {
	id, err := h.nextRequestID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"code": id})
}

// ListRepairRequests คืนใบงานซ่อมบำรุงทั้งหมด (ใหม่สุดก่อน)
func (h *MaintenanceHandler) ListRepairRequests(c *gin.Context) {
	rows := []models.MachineRepairRequest{}
	if err := h.preloadedOrders().Order("repair_date desc, request_id desc").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]MaintenanceOrderResponse, 0, len(rows))
	for _, r := range rows {
		out = append(out, toOrderResponse(r))
	}
	c.JSON(http.StatusOK, out)
}

// GetRepairRequest คืนใบงานซ่อมบำรุงใบเดียว
func (h *MaintenanceHandler) GetRepairRequest(c *gin.Context) {
	var r models.MachineRepairRequest
	if err := h.preloadedOrders().First(&r, "request_id = ?", c.Param("id")).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบงานซ่อมบำรุงนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toOrderResponse(r))
}

type repairCreateInput struct {
	MachineID  string `json:"machineID"`
	Technician string `json:"technician"`
	Date       string `json:"date"`
	Type       string `json:"type"`
	Detail     string `json:"detail"`
}

// CreateRepairRequest แจ้งซ่อม (CM) หรือบันทึกงานบำรุงรักษาตามแผน (PM)
//
// ผลข้างเคียงกับสถานะเครื่องจักร (พอร์ตจากระบบเดิม):
//   - CM = เครื่องเสียอยู่ตอนนี้ -> ตั้งสถานะเครื่องเป็น "เสีย" (down) ทันที
//   - PM = ตามแผน -> ตั้งเป็น "บำรุงรักษา" (maintenance) เฉพาะเมื่อถึงวันนัดแล้ว
func (h *MaintenanceHandler) CreateRepairRequest(c *gin.Context) {
	var in repairCreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	machineID := strings.TrimSpace(in.MachineID)
	technician := strings.TrimSpace(in.Technician)
	if machineID == "" || technician == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุเครื่องจักรและผู้รับผิดชอบ"})
		return
	}

	repairType := strings.ToUpper(strings.TrimSpace(in.Type))
	if repairType != "CM" && repairType != "PM" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ประเภทงานซ่อมต้องเป็น CM หรือ PM"})
		return
	}

	var machine models.Machinery
	if err := h.db.First(&machine, "machinery_id = ?", machineID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบเครื่องจักรที่ระบุ"})
		return
	}

	repairDate, err := parseDate(in.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if repairDate == nil {
		now := time.Now()
		repairDate = &now
	}

	requestID, err := h.nextRequestID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	pending := "pending"
	r := models.MachineRepairRequest{
		RequestID:      requestID,
		MachineName:    machine.MachineName,
		Description:    strings.TrimSpace(in.Detail),
		Staff:          technician,
		RepairDate:     repairDate,
		MachineryID:    &machineID,
		RepairTypeID:   &repairType,
		RepairStatusID: &pending,
	}

	err = h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&r).Error; err != nil {
			return err
		}
		updates := map[string]any{"repair_status_id": pending}
		if repairType == "CM" {
			updates["status_id"] = "down"
		} else if !repairDate.After(time.Now()) {
			updates["status_id"] = "maintenance"
		}
		return tx.Model(&models.Machinery{}).Where("machinery_id = ?", machineID).Updates(updates).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var saved models.MachineRepairRequest
	h.preloadedOrders().First(&saved, "request_id = ?", requestID)
	c.JSON(http.StatusOK, toOrderResponse(saved))
}

type repairUpdateInput struct {
	MachineID  *string `json:"machineID"`
	Technician *string `json:"technician"`
	Date       *string `json:"date"`
	Type       *string `json:"type"`
	Detail     *string `json:"detail"`
	Status     *string `json:"status"`
}

// UpdateRepairRequest แก้ไขใบงานซ่อมบำรุง
//
// การเปลี่ยนสถานะเป็น "เสร็จสิ้น" (done) ให้ไปใช้ CompleteRepairRequest แทน
// เพราะต้องสร้างประวัติการซ่อมบำรุงและคืนสถานะเครื่องจักรพร้อมกันในทรานแซกชันเดียว
func (h *MaintenanceHandler) UpdateRepairRequest(c *gin.Context) {
	id := c.Param("id")

	var r models.MachineRepairRequest
	if err := h.db.First(&r, "request_id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบงานซ่อมบำรุงนี้"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var in repairUpdateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	updates := map[string]any{}
	if in.MachineID != nil {
		machineID := strings.TrimSpace(*in.MachineID)
		if machineID == "" {
			updates["machinery_id"] = nil
		} else {
			var machine models.Machinery
			if err := h.db.First(&machine, "machinery_id = ?", machineID).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบเครื่องจักรที่ระบุ"})
				return
			}
			updates["machinery_id"] = machineID
			updates["machine_name"] = machine.MachineName
		}
	}
	if in.Technician != nil {
		updates["staff"] = strings.TrimSpace(*in.Technician)
	}
	if in.Detail != nil {
		updates["description"] = strings.TrimSpace(*in.Detail)
	}
	if in.Date != nil {
		d, err := parseDate(*in.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates["repair_date"] = d
	}
	if in.Type != nil {
		t := strings.ToUpper(strings.TrimSpace(*in.Type))
		if t != "CM" && t != "PM" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ประเภทงานซ่อมต้องเป็น CM หรือ PM"})
			return
		}
		updates["repair_type_id"] = t
	}
	if in.Status != nil {
		status := strings.TrimSpace(*in.Status)
		if status == "done" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "การปิดงานซ่อมต้องใช้คำสั่งปิดงาน (complete)"})
			return
		}
		var n int64
		h.db.Model(&models.RepairStatus{}).Where("repair_status_id = ?", status).Count(&n)
		if n == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "สถานะการซ่อมไม่ถูกต้อง"})
			return
		}
		updates["repair_status_id"] = status
		// finished_at มีความหมายเฉพาะตอนสถานะ done — ย้อนสถานะกลับต้องล้างวันที่เสร็จออกด้วย
		updates["finished_at"] = nil
	}

	if len(updates) > 0 {
		if err := h.db.Model(&r).Updates(updates).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	var saved models.MachineRepairRequest
	h.preloadedOrders().First(&saved, "request_id = ?", id)
	c.JSON(http.StatusOK, toOrderResponse(saved))
}

// DeleteRepairRequest ยกเลิก/ลบใบงานซ่อมบำรุง
//
// ประวัติการซ่อมบำรุง (maintenance_logs) ไม่ถูกลบตาม เพราะเป็นบันทึกว่าเคยซ่อมจริง
// แต่ต้องตัดการอ้างอิงถึงใบงานที่จะลบก่อน ไม่งั้นติด FK maintenance_logs.request_id
func (h *MaintenanceHandler) DeleteRepairRequest(c *gin.Context) {
	id := c.Param("id")

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.MaintenanceLog{}).Where("request_id = ?", id).
			Update("request_id", nil).Error; err != nil {
			return err
		}
		return tx.Where("request_id = ?", id).Delete(&models.MachineRepairRequest{}).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type completeRepairInput struct {
	Staff       string   `json:"staff"`
	Description string   `json:"description"`
	TotalCost   *float64 `json:"totalCost"`
}

// CompleteRepairRequest ปิดงานซ่อม — ทำ 3 อย่างในทรานแซกชันเดียว
//  1. ตั้งสถานะใบงานเป็น done + บันทึกวันที่เสร็จ
//  2. คืนสถานะเครื่องจักรเป็น "ทำงาน" (running)
//  3. สร้างประวัติการซ่อมบำรุง (MaintenanceLog) ให้อัตโนมัติ
func (h *MaintenanceHandler) CompleteRepairRequest(c *gin.Context) {
	id := c.Param("id")

	var in completeRepairInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	var logID string
	err := h.db.Transaction(func(tx *gorm.DB) error {
		var r models.MachineRepairRequest
		if err := tx.First(&r, "request_id = ?", id).Error; err != nil {
			return err
		}
		if r.RepairStatusID != nil && *r.RepairStatusID == "done" {
			return errors.New("ใบงานซ่อมนี้ถูกปิดไปแล้ว")
		}

		now := time.Now()
		done := "done"
		if err := tx.Model(&r).Updates(map[string]any{
			"repair_status_id": done,
			"finished_at":      now,
		}).Error; err != nil {
			return err
		}

		if r.MachineryID != nil && *r.MachineryID != "" {
			if err := tx.Model(&models.Machinery{}).Where("machinery_id = ?", *r.MachineryID).
				Updates(map[string]any{"status_id": "running", "repair_status_id": done}).Error; err != nil {
				return err
			}
		}

		staff := strings.TrimSpace(in.Staff)
		if staff == "" {
			staff = r.Staff
		}
		description := strings.TrimSpace(in.Description)
		if description == "" {
			description = r.Description
		}
		

		logID = fmt.Sprintf("LOG-%d", now.UnixNano()/int64(time.Millisecond))
		return tx.Create(&models.MaintenanceLog{
			LogID:       logID,
			Description: description,
			Staff:       staff,
			RepairDate:  now,
			RequestID:   &r.RequestID,
			MachineryID: r.MachineryID,
		}).Error
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบใบงานซ่อมบำรุงนี้"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var saved models.MachineRepairRequest
	h.preloadedOrders().First(&saved, "request_id = ?", id)
	c.JSON(http.StatusOK, gin.H{"order": toOrderResponse(saved), "logID": logID})
}

// ── ประวัติการซ่อมบำรุง (MaintenanceLog) ────────────────────────────────────────

// MaintenanceLogResponse คือประวัติการซ่อมบำรุงหนึ่งรายการ
type MaintenanceLogResponse struct {
	LogID       string  `json:"logID"`
	RequestID   string  `json:"requestID"`
	MachineID   string  `json:"machineID"`
	Description string  `json:"description"`
	Staff       string  `json:"staff"`
	RepairDate  string  `json:"repairDate"`
	TotalCost   float64 `json:"totalCost"`
}

// ListMaintenanceLogs คืนประวัติการซ่อมบำรุงทั้งหมด (กรองด้วย ?machineID= ได้)
func (h *MaintenanceHandler) ListMaintenanceLogs(c *gin.Context) {
	q := h.db.Order("repair_date desc")
	if machineID := strings.TrimSpace(c.Query("machineID")); machineID != "" {
		q = q.Where("machinery_id = ?", machineID)
	}

	rows := []models.MaintenanceLog{}
	if err := q.Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]MaintenanceLogResponse, 0, len(rows))
	for _, l := range rows {
		item := MaintenanceLogResponse{
			LogID:       l.LogID,
			Description: l.Description,
			Staff:       l.Staff,
			RepairDate:  formatDate(&l.RepairDate),
			
		}
		if l.RequestID != nil {
			item.RequestID = *l.RequestID
		}
		if l.MachineryID != nil {
			item.MachineID = *l.MachineryID
		}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, out)
}

// ── ประวัติการทำงานของเครื่องจักร (MachineWorkHistory) ──────────────────────────

// MachineJobResponse คือประวัติการทำงานของเครื่องจักรหนึ่งรายการ
type MachineJobResponse struct {
	ID         string `json:"id"`
	MachineID  string `json:"machineID"`
	JobCode    string `json:"jobCode"`
	FinishedAt string `json:"finishedAt"`
	Owner      string `json:"owner"`
	Detail     string `json:"detail"`
}

func toJobResponse(j models.MachineWorkHistory) MachineJobResponse {
	out := MachineJobResponse{
		ID:         j.HistoryID,
		JobCode:    j.JobCode,
		FinishedAt: formatDate(&j.Date),
		Owner:      j.Staff,
		Detail:     j.Description,
	}
	if j.MachineryID != nil {
		out.MachineID = *j.MachineryID
	}
	return out
}

// nextJobCode ต่อเลขจากรหัสงานล่าสุด (WO-0006 -> WO-0007)
func (h *MaintenanceHandler) nextJobCode() (string, error) {
	var maxNum sql.NullInt64
	if err := h.db.Model(&models.MachineWorkHistory{}).
		Select(`MAX(CAST(SUBSTRING(job_code FROM 'WO-([0-9]+)') AS BIGINT))`).
		Scan(&maxNum).Error; err != nil {
		return "", err
	}
	next := int64(1)
	if maxNum.Valid {
		next = maxNum.Int64 + 1
	}
	return fmt.Sprintf("WO-%04d", next), nil
}

// ListMachineJobs คืนประวัติการทำงานของเครื่องจักร (กรองด้วย ?machineID= ได้)
func (h *MaintenanceHandler) ListMachineJobs(c *gin.Context) {
	q := h.db.Order("date desc")
	if machineID := strings.TrimSpace(c.Query("machineID")); machineID != "" {
		q = q.Where("machinery_id = ?", machineID)
	}

	rows := []models.MachineWorkHistory{}
	if err := q.Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	out := make([]MachineJobResponse, 0, len(rows))
	for _, j := range rows {
		out = append(out, toJobResponse(j))
	}
	c.JSON(http.StatusOK, out)
}

// CreateMachineJob บันทึกประวัติการทำงานใหม่ให้เครื่องจักรหนึ่งเครื่อง
func (h *MaintenanceHandler) CreateMachineJob(c *gin.Context) {
	var in struct {
		MachineID  string `json:"machineID"`
		FinishedAt string `json:"finishedAt"`
		Owner      string `json:"owner"`
		Detail     string `json:"detail"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	machineID := strings.TrimSpace(in.MachineID)
	if machineID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุเครื่องจักร"})
		return
	}
	finishedAt, err := parseDate(in.FinishedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if finishedAt == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ต้องระบุวันที่ทำเสร็จ"})
		return
	}

	jobCode, err := h.nextJobCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	j := models.MachineWorkHistory{
		HistoryID:   fmt.Sprintf("HIS-%d", time.Now().UnixNano()/int64(time.Millisecond)),
		JobCode:     jobCode,
		Description: strings.TrimSpace(in.Detail),
		Staff:       strings.TrimSpace(in.Owner),
		Date:        *finishedAt,
		MachineryID: &machineID,
	}
	if err := h.db.Create(&j).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toJobResponse(j))
}

// DeleteMachineJob ลบประวัติการทำงานหนึ่งรายการ
func (h *MaintenanceHandler) DeleteMachineJob(c *gin.Context) {
	if err := h.db.Where("history_id = ?", c.Param("historyID")).
		Delete(&models.MachineWorkHistory{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ── ข้อมูลตั้งต้นของงานซ่อมบำรุง ────────────────────────────────────────────────

// ListRepairTypes คืนประเภทงานซ่อม (PM / CM)
func (h *MaintenanceHandler) ListRepairTypes(c *gin.Context) {
	out := []models.TypeofRepair{}
	if err := h.db.Order("repair_type_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// ListRepairStatuses คืนสถานะงานซ่อม (pending / in_progress / done)
func (h *MaintenanceHandler) ListRepairStatuses(c *gin.Context) {
	out := []models.RepairStatus{}
	if err := h.db.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}
