package handlers

import (
	"net/http"

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
	out := []models.Plan{}
	if err := h.db.Order("id DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreatePlan สร้างแผนการผลิตใหม่
func (h *PlanningHandler) CreatePlan(c *gin.Context) {
	var p models.Plan
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if p.Status == "" {
		p.Status = "รอเริ่ม"
	}
	if err := h.db.Create(&p).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdatePlanProgress อัปเดตยอดที่ผลิตได้แล้ว (done) ของแผนการผลิตตาม id (path param: /api/plans/:id)
func (h *PlanningHandler) UpdatePlanProgress(c *gin.Context) {
	planID := c.Param("id")
	var body struct {
		Done   int    `json:"done"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.Plan{}).Where("id = ?", planID).
		Updates(map[string]any{"done": body.Done, "status": body.Status}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
