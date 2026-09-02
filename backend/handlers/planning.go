package handlers

import (
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

// planOut คือรูปร่าง JSON ที่ frontend คาดหวัง (เหมือนเดิมทุก field) แม้ว่า ProductionPlan
// จะไม่เก็บ productID/bomID ตรงๆ อีกต่อไปแล้วก็ตาม — ค่า productID/bomID มาจากการ join กับ RefBOM
type planOut struct {
	Timestamp time.Time `json:"timestamp"`
	PlanID    string    `json:"planID"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	Amount    int       `json:"amount"`
	Priority  string    `json:"priority"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
	ProductID string    `json:"productID"`
	BomID     string    `json:"bomID"`
	RefBomID  string    `json:"refBomID"`
}

func toPlanOut(p models.ProductionPlan, refBOMs map[string]models.RefBOM) planOut {
	rb := refBOMs[p.RefBomID]
	return planOut{
		Timestamp: p.Timestamp,
		PlanID:    p.PlanID,
		Name:      p.Name,
		Status:    p.Status,
		Amount:    p.Amount,
		Priority:  p.Priority,
		StartDate: p.StartDate,
		EndDate:   p.EndDate,
		ProductID: rb.ProductID,
		BomID:     rb.BomID,
		RefBomID:  p.RefBomID,
	}
}

// PreviewNextPlanID คืนเลขที่แผนการผลิตที่ "จะได้" ถ้าสร้างตอนนี้ — ใช้แสดงผลใน UI เท่านั้น
// ไม่ persist หรือ "จอง" เลขไว้ ถ้ามีการสร้างแผนอื่นแทรกก่อน submit จริง เลขที่ได้จริงอาจขยับ
func (h *PlanningHandler) PreviewNextPlanID(c *gin.Context) {
	id, err := nextSeqID(h.db, &models.ProductionPlan{}, "plan_id", "PLAN", time.Now().Format("20060102"), 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"planID": id})
}

// ListPlans คืนรายการแผนการผลิตทั้งหมด (join กับ RefBOM เพื่อยัด productID/bomID กลับเข้า response)
func (h *PlanningHandler) ListPlans(c *gin.Context) {
	plans := []models.ProductionPlan{}
	if err := h.db.Order("timestamp DESC").Find(&plans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	refBomIDs := make([]string, 0, len(plans))
	for _, p := range plans {
		refBomIDs = append(refBomIDs, p.RefBomID)
	}
	refBOMs, err := refBOMMap(h.db, refBomIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]planOut, 0, len(plans))
	for _, p := range plans {
		out = append(out, toPlanOut(p, refBOMs))
	}
	c.JSON(http.StatusOK, out)
}


// CreatePlan สร้างแผนการผลิตใหม่ — productID/bomID ที่ frontend ส่งมาจะถูก resolve เป็นแถวใน RefBOM
// (หาแถวเดิมถ้ามี หรือสร้างใหม่) แล้วเก็บแค่ refBomID ไว้บน ProductionPlan
func (h *PlanningHandler) CreatePlan(c *gin.Context) {
	var body struct {
		Name      string `json:"name"`
		Amount    int    `json:"amount"`
		Status    string `json:"status"`
		Priority  string `json:"priority"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
		ProductID string `json:"productID"`
		BomID     string `json:"bomID"`
		Line      string `json:"line"`
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

	refBomID, err := resolveRefBOM(h.db, body.ProductID, body.BomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	planID, err := nextSeqID(h.db, &models.ProductionPlan{}, "plan_id", "PLAN", now.Format("2006-01-02"), 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
    	return
	}
	p := models.ProductionPlan{
		Timestamp: now,
		PlanID:    planID,
		Name:      body.Name,
		Status:    body.Status,
		Amount:    body.Amount,
		Priority:  body.Priority,
		StartDate: now,
		RefBomID:  refBomID,
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

	refBOMs, err := refBOMMap(h.db, []string{p.RefBomID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toPlanOut(p, refBOMs))
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
