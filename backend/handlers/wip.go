package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WipHandler struct {
	db *gorm.DB
}

func NewWipHandler(db *gorm.DB) *WipHandler {
	return &WipHandler{db: db}
}

func (h *WipHandler) GetWorkInProcess(c *gin.Context) {
	wipID := c.Param("wipID")
	var w models.WorkInProcess
	if err := h.db.Preload("Locations").Preload("Records").
		Where("wip_id = ?", wipID).First(&w).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, w)
}

func (h *WipHandler) ListWorkInProcess(c *gin.Context) {
	out := []models.WorkInProcess{}
	if err := h.db.Order("wip_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *WipHandler) CreateWorkInProcess(c *gin.Context) {
	var w models.WorkInProcess
	if err := c.ShouldBindJSON(&w); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if w.Amount < 0 || w.Max < 0{ 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if err := h.db.Save(&w).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, w)
}

func (h *WipHandler) UpdateWorkInProcessAmount(c *gin.Context) {
	wipID := c.Param("wipID")
	var body struct {
		Amount int `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Amount < 0 { 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if err := h.db.Model(&models.WorkInProcess{}).Where("wip_id = ?", wipID).
		Update("amount", body.Amount).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}


func (h *WipHandler) ListWipLocations(c *gin.Context) {
	out := []models.WIPLocation{}
	q := h.db.Order("wip_location_id")
	if wipID := c.Query("wipID"); wipID != "" {
		q = q.Where("wip_id = ?", wipID)
	}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *WipHandler) PreviewNextLocationCodes(c *gin.Context) {
	palletNumber, err := nextSeqID(h.db, &models.WIPLocation{}, "pallet_number", "PLT", time.Now().Format("20060102"), 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	lotMiddle := c.Query("orderID")
	if lotMiddle == "" {
		lotMiddle = time.Now().Format("060102")
	}
	lotNumber, err := nextSeqID(h.db, &models.WIPLocation{}, "lot_number", "LOT", lotMiddle, 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"palletNumber": palletNumber, "lotNumber": lotNumber})
}



func (h *WipHandler) CreateWipLocation(c *gin.Context) {
	var body struct {
		models.WIPLocation
		OrderID string `json:"orderID"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Amount < 0 { 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	loc := body.WIPLocation

	if loc.WipLocationID == "" {
		loc.WipLocationID = fmt.Sprintf("WLO-%d", time.Now().UnixNano())
	}

	if loc.LotNumber == "" && loc.PalletNumber != "" {
		var existing models.WIPLocation
		if err := h.db.Where("pallet_number = ?", loc.PalletNumber).First(&existing).Error; err == nil {
			loc.LotNumber = existing.LotNumber
		}
	}

	if loc.LotNumber == "" {
		lotMiddle := body.OrderID
		if lotMiddle == "" || lotMiddle == "-" {
			lotMiddle = time.Now().Format("060102")
		}
		id, err := nextSeqID(h.db, &models.WIPLocation{}, "lot_number", "LOT", lotMiddle, 2)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		loc.LotNumber = id
	}

	if err := h.db.Create(&loc).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, loc)
}

func (h *WipHandler) UpdateWipLocation(c *gin.Context) {
	fmt.Println("🔥 HIT UpdateWipLocation! ID:", c.Param("id"))
	id := c.Param("id")
	var body struct {
		Location string `json:"location"`
		Amount   int    `json:"amount"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Amount < 0 { 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}

	updates := map[string]interface{}{}
	if body.Location != "" {
		updates["location"] = body.Location
	}
	if body.Amount >= 0 {
		updates["amount"] = body.Amount
	}

	if err := h.db.Model(&models.WIPLocation{}).Where("wip_location_id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *WipHandler) ListWipRecords(c *gin.Context) {
	out := []models.WorkInProcessRecord{}
	q := h.db.
		Select("work_in_process_records.*, wip_locations.wip_id AS wip_id").
		Joins("JOIN wip_locations ON wip_locations.wip_location_id = work_in_process_records.wip_location_id").
		Order("work_in_process_records.timestamp DESC")

	if wipID := c.Query("wipID"); wipID != "" {
		q = q.Where("wip_locations.wip_id = ?", wipID)
	}
	if err := q.Limit(50).Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *WipHandler) CreateWipRecord(c *gin.Context) {
	var rec models.WorkInProcessRecord
	if err := c.ShouldBindJSON(&rec); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if rec.Amount < 0 { 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}

	var location models.WIPLocation
	if err := h.db.Where("wip_location_id = ?", rec.WipLocationID).First(&location).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wip location not found"})
		return
	}
	rec.WipID = location.WipID

	if rec.WipRecordID == "" {
		rec.WipRecordID = fmt.Sprintf("WR-%d", time.Now().UnixNano())
	}
	if rec.Timestamp.IsZero() {
		rec.Timestamp = time.Now()
	}
	if err := h.db.Create(&rec).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rec)
}

func (h *WipHandler) ListRequisitionSlips(c *gin.Context) {
	out := []models.RequisitionSlip{}
	if err := h.db.Order("timestamp DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *WipHandler) CreateRequisitionSlip(c *gin.Context) {
	var slip models.RequisitionSlip
	if err := c.ShouldBindJSON(&slip); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if slip.Amount < 0 { 
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if slip.SlipID == "" {
		slip.SlipID = fmt.Sprintf("SID-%d", time.Now().UnixNano())
	}
	if slip.Status == "" {
		slip.Status = "รออนุมัติ"
	}
	if slip.Timestamp.IsZero() {
		slip.Timestamp = time.Now()
	}
	if err := h.db.Create(&slip).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, slip)
}