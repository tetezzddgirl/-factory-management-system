package handlers

import (
	"net/http"
	"time"

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
		Reason    string `json:"reason"`
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

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		history := models.ProductionStatusHistory{
			HistoryID:       "HIST-" + time.Now().Format("20060102150405"),
			OrderID:         order.OrderID,
			PreviousStatus:  order.Status,
			NewStatus:       payload.Status,
			ChangedDateTime: time.Now(),
			Reason:          payload.Reason,
			ChangedBy:       payload.ChangedBy,
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

	if err := h.db.WithContext(c.Request.Context()).
		Where(`"order_id" = ?`, orderID).
		Order(`"changedDateTime" DESC`).
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

	if event.EventID == "" {
		event.EventID = "EVT-" + time.Now().Format("20060102150405")
	}
	if event.StartDateTime.IsZero() {
		event.StartDateTime = time.Now()
	}

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

	if report.ReportID == "" {
		report.ReportID = "REP-" + time.Now().Format("20060102150405")
	}

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

	if transfer.TransferID == "" {
		transfer.TransferID = "TRF-" + time.Now().Format("20060102150405")
	}
	if transfer.CreateDateTime.IsZero() {
		transfer.CreateDateTime = time.Now()
	}

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

	if fg.FinishedGoodsID == "" {
		fg.FinishedGoodsID = "FG-" + time.Now().Format("20060102150405")
	}

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
