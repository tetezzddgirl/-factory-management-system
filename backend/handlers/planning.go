package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PlanningHandler รวม dependency ของ endpoint ฝั่งระบบวางแผนการผลิต (Production Planning)
type PlanningHandler struct {
	db *gorm.DB
}

// NewPlanningHandler สร้าง PlanningHandler ตัวใหม่
func NewPlanningHandler(db *gorm.DB) *PlanningHandler {
	return &PlanningHandler{db: db}
}

// ListPlans คืนรายการแผนการผลิตทั้งหมด
func (h *PlanningHandler) ListPlans(c *gin.Context) {
	out := []models.ProductionPlan{}
	if err := h.db.Order("timestamp DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreatePlan สร้างแผนการผลิตใหม่
func (h *PlanningHandler) CreatePlan(c *gin.Context) {
	var body struct {
		Name      string `json:"name"`
		Amount    int    `json:"amount"`
		Status    string `json:"status"`
		Priority  string `json:"priority"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Status == "" {
		body.Status = "รอเริ่ม"
	}
	if body.Priority == "" {
		body.Priority = "ปกติ"
	}

	now := time.Now()
	p := models.ProductionPlan{
		Timestamp: now,
		PlanID:    fmt.Sprintf("PLAN-%d", now.UnixNano()/int64(time.Millisecond)),
		Name:      body.Name,
		Status:    body.Status,
		Amount:    body.Amount,
		Priority:  body.Priority,
		StartDate: now,
	}
	if t, err := time.Parse(time.RFC3339, body.StartDate); err == nil {
		p.StartDate = t
	}
	if t, err := time.Parse(time.RFC3339, body.EndDate); err == nil {
		p.EndDate = t
	}

	if err := h.db.Create(&p).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdatePlanProgress อัปเดตลำดับความสำคัญ (priority) และสถานะของแผนการผลิตตาม planID (path param: /api/plans/:id)
func (h *PlanningHandler) UpdatePlanProgress(c *gin.Context) {
	planID := c.Param("id")
	var body struct {
		Priority string `json:"priority"`
		Status   string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	updates := map[string]any{}
	if body.Priority != "" {
		updates["priority"] = body.Priority
	}
	if body.Status != "" {
		updates["status"] = body.Status
	}
	if len(updates) == 0 {
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}

	if err := h.db.Model(&models.ProductionPlan{}).Where("plan_id = ?", planID).
		Updates(updates).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
