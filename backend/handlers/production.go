package handlers

import (
	"net/http"
	"time"
	"strings"
	"fmt"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductionHandler struct {
	db *gorm.DB
}

func NewProductionHandler(db *gorm.DB) *ProductionHandler {
	return &ProductionHandler{db: db}
}

// ==========================================
// 1. Production Orders (ใบสั่งผลิต)
// ==========================================

// ListOrders ดึงรายการคำสั่งผลิตทั้งหมด
func (h *ProductionHandler) ListOrders(c *gin.Context) {
	var orders []models.ProductionOrder
	err := h.db.WithContext(c.Request.Context()).
		Preload("ProductionReport").
		Preload("ProductionStatusHistory").
		Preload("ProductionEvents").
		Order("timestamp DESC").
		Find(&orders).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GetOrderByID ดึงข้อมูลคำสั่งผลิตเดี่ยวตาม OrderID
func (h *ProductionHandler) GetOrderByID(c *gin.Context) {
	orderID := c.Param("id")
	var order models.ProductionOrder

	err := h.db.WithContext(c.Request.Context()).
		Preload("ProductionReport").
		Preload("ProductionStatusHistory").
		Preload("ProductionEvents").
		Preload("TransferRecords").
		Where(`"order_id" = ?`, orderID).
		First(&order).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

// CreateOrder สร้างใบสั่งผลิตใหม่
func (h *ProductionHandler) CreateOrder(c *gin.Context) {
	var order models.ProductionOrder
	if err := c.ShouldBindJSON(&order); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	if order.OrderID == "" {
		order.OrderID = "PO-" + time.Now().Format("20060102150405")
	}
	if order.Timestamp.IsZero() {
		order.Timestamp = time.Now()
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&order).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, order)
}

// ==========================================
// 2. Status History (ประวัติสถานะ)
// ==========================================

// UpdateOrderStatus อัปเดตสถานะงานและสร้างประวัติ
func (h *ProductionHandler) UpdateOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	var payload struct {
		Status    string `json:"status" binding:"required"`
		ChangedBy string `json:"changedBy"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	var order models.ProductionOrder
	if err := h.db.WithContext(c.Request.Context()).Where(`"order_id" = ?`, orderID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// ตัดเอาเฉพาะ ID พนักงาน
	cleanChangedBy := strings.TrimSpace(payload.ChangedBy)
	if strings.Contains(cleanChangedBy, " — ") {
		cleanChangedBy = strings.TrimSpace(strings.Split(cleanChangedBy, " — ")[0])
	} else if strings.Contains(cleanChangedBy, " - ") {
		cleanChangedBy = strings.TrimSpace(strings.Split(cleanChangedBy, " - ")[0])
	}

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		uniqueHistoryID := fmt.Sprintf("HIST-%s-%d", time.Now().Format("20060102150405"), time.Now().Nanosecond()%100000)

		history := models.ProductionStatusHistory{
			HistoryID:       uniqueHistoryID,
			OrderID:         order.OrderID,
			PreviousStatus:  order.Status,
			NewStatus:       payload.Status,
			ChangedDateTime: time.Now(),
			ChangedBy:       cleanChangedBy, // เอา Reason ออกไปแล้ว
		}

		if err := tx.Create(&history).Error; err != nil {
			return err
		}

		order.Status = payload.Status
		return tx.Model(&order).Update("status", payload.Status).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true, "status": order.Status})
}

// GetStatusHistoryByOrderID ดึงประวัติการเปลี่ยนสถานะทั้งหมดของ Order
func (h *ProductionHandler) GetStatusHistoryByOrderID(c *gin.Context) {
	orderID := c.Param("id")
	var history []models.ProductionStatusHistory

	// หมายเหตุ: เช็คชื่อ field ใน DB ว่าเป็น changed_date_time หรือ "changedDateTime"
	// แนะนำใช้ snake_case มาตรฐาน PostgreSQL: changed_date_time DESC
	if err := h.db.WithContext(c.Request.Context()).
		Where("order_id = ?", orderID).
		Order("changed_date_time DESC").
		Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

// ==========================================
// 3. Events (เหตุการณ์ระหว่างผลิต)
// ==========================================

// CreateEvent บันทึกเหตุการณ์ระหว่างผลิต
func (h *ProductionHandler) CreateEvent(c *gin.Context) {
	var event models.ProductionEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	// กำหนด Timezone ประเทศไทย (UTC+7)
	loc := time.FixedZone("ICT", 7*60*60)
	now := time.Now().In(loc)

	// บังคับสร้าง ID ในรูปแบบ EVT-YYYYMMDDHHMMSS ตามเวลาไทย
	event.EventID = fmt.Sprintf("EVT-%s", now.Format("20060102150405"))

	if event.StartDateTime.IsZero() {
		event.StartDateTime = now
	}

	cleanRecordedBy := strings.TrimSpace(event.RecordedBy)
	if strings.Contains(cleanRecordedBy, " — ") {
		cleanRecordedBy = strings.TrimSpace(strings.Split(cleanRecordedBy, " — ")[0])
	} else if strings.Contains(cleanRecordedBy, " - ") {
		cleanRecordedBy = strings.TrimSpace(strings.Split(cleanRecordedBy, " - ")[0])
	}
	event.RecordedBy = cleanRecordedBy

	if err := h.db.WithContext(c.Request.Context()).Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// GetEventsByOrderID ดึงเหตุการณ์ทั้งหมดของ Order
func (h *ProductionHandler) GetEventsByOrderID(c *gin.Context) {
	orderID := c.Param("id")
	var events []models.ProductionEvent

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"order_id" = ?`, orderID).
		Order(`"startDateTime" DESC`).
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, events)
}

// ==========================================
// 4. Reports (รายงานผลการผลิต)
// ==========================================

// CreateReport บันทึกรายงานการผลิต
func (h *ProductionHandler) CreateReport(c *gin.Context) {
	var report models.ProductionReport
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	loc := time.FixedZone("ICT", 7*60*60)
	now := time.Now().In(loc)

	report.ReportID = fmt.Sprintf("REP-%s", now.Format("20060102150405"))

	if err := h.db.WithContext(c.Request.Context()).Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, report)
}

// GetReportsByOrderID ดึงรายงานการผลิตทั้งหมดของ Order
func (h *ProductionHandler) GetReportsByOrderID(c *gin.Context) {
	orderID := c.Param("id")
	var reports []models.ProductionReport

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"order_id" = ?`, orderID).
		Order(`"actualStartDateTime" DESC`).
		Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reports)
}

// UpdateReport แก้ไขรายงานการผลิต
func (h *ProductionHandler) UpdateReport(c *gin.Context) {
	reportID := c.Param("reportId")
	var payload models.ProductionReport

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	var existingReport models.ProductionReport
	if err := h.db.WithContext(c.Request.Context()).Where(`"reportId" = ?`, reportID).First(&existingReport).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Report not found"})
		return
	}

	// อัปเดตข้อมูล
	if err := h.db.WithContext(c.Request.Context()).Model(&existingReport).Updates(payload).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingReport)
}

// ==========================================
// 5. Transfers (โอนย้าย)
// ==========================================

// CreateTransfer บันทึกการโอนย้าย
func (h *ProductionHandler) CreateTransfer(c *gin.Context) {
	var transfer models.TransferRecord
	if err := c.ShouldBindJSON(&transfer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}

	// กำหนด Timezone ประเทศไทย (UTC+7)
	loc := time.FixedZone("ICT", 7*60*60)
	now := time.Now().In(loc)

	// สร้าง TransferID ในรูปแบบ TRF-YYYYMMDDHHMMSS ตามเวลาไทย
	if transfer.TransferID == "" {
		transfer.TransferID = fmt.Sprintf("TRF-%s", now.Format("20060102150405"))
	}

	// กำหนดเวลาที่บันทึกตามเวลาไทย
	if transfer.CreateDateTime.IsZero() {
		transfer.CreateDateTime = now
	}

	// ตัดเอาเฉพาะรหัสพนักงาน (ป้องกันติดชื่อเต็ม เช่น "PSN-001 — สมชาย")
	cleanCreatedBy := strings.TrimSpace(transfer.CreatedBy)
	if strings.Contains(cleanCreatedBy, " — ") {
		cleanCreatedBy = strings.TrimSpace(strings.Split(cleanCreatedBy, " — ")[0])
	} else if strings.Contains(cleanCreatedBy, " - ") {
		cleanCreatedBy = strings.TrimSpace(strings.Split(cleanCreatedBy, " - ")[0])
	}
	transfer.CreatedBy = cleanCreatedBy

	if err := h.db.WithContext(c.Request.Context()).Create(&transfer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, transfer)
}

// GetTransfersByOrderID ดึงบันทึกการโอนย้ายทั้งหมดของ Order
func (h *ProductionHandler) GetTransfersByOrderID(c *gin.Context) {
	orderID := c.Param("id")
	var transfers []models.TransferRecord

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"order_id" = ?`, orderID).
		Order(`"createDateTime" DESC`).
		Find(&transfers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, transfers)
}

// DeleteTransfer ลบข้อมูล Transfer Record
func (h *ProductionHandler) DeleteTransfer(c *gin.Context) {
	transferID := c.Param("id")

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"transferId" = ?`, transferID).
		Delete(&models.TransferRecord{}).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transfer record deleted successfully"})
}

// ==========================================
// 6. Finished Goods (สินค้าสำเร็จรูป)
// ==========================================

// CreateFinishedGood สร้างข้อมูล Finished Goods
func (h *ProductionHandler) CreateFinishedGood(c *gin.Context) {
	var fg models.FinishedGoods
	if err := c.ShouldBindJSON(&fg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json: " + err.Error()})
		return
	}
	loc := time.FixedZone("ICT", 7*60*60)
	now := time.Now().In(loc)

	fg.FinishedGoodsID = fmt.Sprintf("FG-%s", now.Format("20060102150405"))

	if err := h.db.WithContext(c.Request.Context()).Create(&fg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, fg)
}

// ListFinishedGoods ดึงรายการ Finished Goods ทั้งหมด
func (h *ProductionHandler) ListFinishedGoods(c *gin.Context) {
	var fgs []models.FinishedGoods
	if err := h.db.WithContext(c.Request.Context()).Find(&fgs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, fgs)
}

// DeleteFinishedGood ลบข้อมูล Finished Goods (สำหรับ Rollback)
func (h *ProductionHandler) DeleteFinishedGood(c *gin.Context) {
	fgID := c.Param("id")

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"finished_goods_id" = ?`, fgID).
		Delete(&models.FinishedGoods{}).Error; err != nil {

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Finished good deleted successfully"})
}
