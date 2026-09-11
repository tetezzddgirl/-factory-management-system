package handlers

import (
	"fmt"
	"net/http"
	"strings"
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

	// กำหนด Timezone ประเทศไทย (UTC+7)
	loc := time.FixedZone("ICT", 7*60*60)
	now := time.Now().In(loc)

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		uniqueHistoryID := fmt.Sprintf("HIST-%s-%05d", now.Format("20060102150405"), now.Nanosecond()%100000)

		history := models.ProductionStatusHistory{
			HistoryID:       uniqueHistoryID,
			OrderID:         order.OrderID,
			PreviousStatus:  order.Status,
			NewStatus:       payload.Status,
			ChangedDateTime: now,
			ChangedBy:       cleanChangedBy,
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

	// บังคับสร้างใหม่ทับค่าจาก Frontend ทันที
	transfer.TransferID = fmt.Sprintf("TRF-%s", now.Format("20060102150405"))
	transfer.CreateDateTime = now

	// ทำความสะอาดรหัสพนักงาน
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

// PendingFGItem struct สำหรับส่งข้อมูลสินค้าสำเร็จรูปที่รอรับเข้าคลังไปให้หน้า Frontend
type PendingFGItem struct {
	TransferID      string    `json:"transferID"`
	FinishedGoodsID string    `json:"finishedGoodsId"`
	OrderID         string    `json:"orderID"`
	ProductName     string    `json:"productName"`
	Quantity        int       `json:"quantity"`
	PalletNumber    string    `json:"palletNumber"`
	Status          string    `json:"status"`
	CreatedBy       string    `json:"createdBy"`
	CreateDateTime  time.Time `json:"createDateTime"`
	Remark          string    `json:"remark"`
}

// ListPendingFGTransfers ดึงรายการโอนย้ายสินค้าสำเร็จรูปที่ยังรอรับเข้าคลัง (status = Pending / รอรับ)
func (h *ProductionHandler) ListPendingFGTransfers(c *gin.Context) {
	var transfers []models.TransferRecord
	if err := h.db.WithContext(c.Request.Context()).
		Where(`"transferType" = 'FG' AND ("status" = 'Pending' OR "status" = 'รอรับ' OR "status" = '' OR "status" IS NULL)`).
		Order(`"createDateTime" DESC`).
		Find(&transfers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// รวบรวม FinishedGoodsID ทั้งหมดเพื่อดึงข้อมูลสินค้า
	fgIDs := make([]string, 0)
	for _, t := range transfers {
		if t.FinishedGoodsID != nil && *t.FinishedGoodsID != "" {
			fgIDs = append(fgIDs, *t.FinishedGoodsID)
		}
	}

	var fgs []models.FinishedGoods
	fgMap := make(map[string]models.FinishedGoods)
	if len(fgIDs) > 0 {
		if err := h.db.WithContext(c.Request.Context()).
			Where(`"finished_goods_id" IN ?`, fgIDs).
			Find(&fgs).Error; err == nil {
			for _, fg := range fgs {
				fgMap[fg.FinishedGoodsID] = fg
			}
		}
	}

	result := make([]PendingFGItem, 0)
	for _, t := range transfers {
		fgID := ""
		if t.FinishedGoodsID != nil {
			fgID = *t.FinishedGoodsID
		}
		orderID := ""
		if t.OrderID != nil {
			orderID = *t.OrderID
		}

		productName := "สินค้าสำเร็จรูป"
		palletNumber := "-"
		quantity := 0

		if fg, ok := fgMap[fgID]; ok {
			productName = fg.ProductName
			palletNumber = fg.PalletNumber
			quantity = fg.Quantity
		}

		result = append(result, PendingFGItem{
			TransferID:      t.TransferID,
			FinishedGoodsID: fgID,
			OrderID:         orderID,
			ProductName:     productName,
			Quantity:        quantity,
			PalletNumber:    palletNumber,
			Status:          t.Status,
			CreatedBy:       t.CreatedBy,
			CreateDateTime:  t.CreateDateTime,
			Remark:          t.Remark,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ReceiveTransfer อัปเดตสถานะการรับมอบสินค้าสำเร็จรูปเข้าคลัง
func (h *ProductionHandler) ReceiveTransfer(c *gin.Context) {
	transferID := c.Param("id")
	var payload struct {
		ReceivedBy string `json:"receivedBy"`
	}
	_ = c.ShouldBindJSON(&payload)

	receivedBy := payload.ReceivedBy
	if receivedBy == "" {
		receivedBy = "เจ้าหน้าที่ฝ่ายคลังสินค้า"
	}

	now := time.Now()
	if err := h.db.WithContext(c.Request.Context()).
		Model(&models.TransferRecord{}).
		Where(`"transferId" = ?`, transferID).
		Updates(map[string]interface{}{
			"status":           "Received",
			"receivedBy":       receivedBy,
			"transferDateTime": now,
		}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "รับสินค้าสำเร็จรูปเข้าคลังเรียบร้อยแล้ว",
		"transferId": transferID,
		"status":     "Received",
	})
}
