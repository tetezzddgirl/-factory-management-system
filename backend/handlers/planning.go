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
// จะไม่เก็บ productID/bomID ตรงๆ อีกต่อไปแล้วก็ตาม — ค่า productID/formulaID มาจากการ join กับ RefBOM
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
	FormulaID     string    `json:"formulaID"`
	RefFormulaID  string    `json:"refFormulaID"`
	Done         int       `json:"done"`
	Target       int       `json:"target"` 
	Progress     float64   `json:"progress"`
}

func planProgressMap(db *gorm.DB) (map[string]struct{ Done, Target int }, error) {
	type row struct {
		PlanID string
		Done   int
		Target int
	}
	var rows []row
	err := db.Table("production_orders po").
		Select("po.plan_id AS plan_id, COALESCE(SUM(fg.quantity),0) AS done, COALESCE(SUM(po.amount),0) AS target").
		Joins("LEFT JOIN finished_goods fg ON fg.order_id = po.order_id").
		Where("po.status != ?", "ยกเลิก").
		Group("po.plan_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[string]struct{ Done, Target int }, len(rows))
	for _, r := range rows {
		out[r.PlanID] = struct{ Done, Target int }{r.Done, r.Target}
	}
	return out, nil
}

func toPlanOut(p models.ProductionPlan, refFormulas map[string]models.RefFormula, progress map[string]struct{ Done, Target int }) planOut {
	rb := refFormulas[p.RefFormulaID]
	pg := progress[p.PlanID]
	pct := 0.0
	if pg.Target > 0 {
		pct = float64(pg.Done) / float64(pg.Target) * 100
		if pct > 100 {
			pct = 100
		}
	}
	return planOut{
		Timestamp:    p.Timestamp,
		PlanID:       p.PlanID,
		Name:         p.Name,
		Status:       p.Status,
		Amount:       p.Amount,
		Priority:     p.Priority,
		StartDate:    p.StartDate,
		EndDate:      p.EndDate,
		ProductID:    rb.ProductID,
		FormulaID:    rb.FormulaID,
		RefFormulaID: p.RefFormulaID,
		Done:         pg.Done,
		Target:       pg.Target,
		Progress:     pct,
	}
}

// PreviewNextPlanID คืนเลขที่แผนการผลิตที่ "จะได้" ถ้าสร้างตอนนี้ — ใช้แสดงผลใน UI เท่านั้น
// ไม่ persist หรือ "จอง" เลขไว้ ถ้ามีการสร้างแผนอื่นแทรกก่อน submit จริง เลขที่ได้จริงอาจขยับ
func (h *PlanningHandler) PreviewNextPlanID(c *gin.Context) {
	id, err := nextSeqID(h.db, &models.ProductionPlan{}, "plan_id", "PLAN", time.Now().Format("2006-01-02"), 3)
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

	refFormulaIDs := make([]string, 0, len(plans))
	for _, p := range plans {
		refFormulaIDs = append(refFormulaIDs, p.RefFormulaID)
	}
	refFormulas, err := refFormulaMap(h.db, refFormulaIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	progress, err := planProgressMap(h.db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]planOut, 0, len(plans))
	for _, p := range plans {
		out = append(out, toPlanOut(p, refFormulas, progress))
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
		FormulaID     string `json:"formulaID"`
		Line      string `json:"line"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if body.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
	}
	if body.Status == "" {
		body.Status = "รอเริ่ม"
	}
	if body.Priority == "" {
		body.Priority = "ปกติ"
	}

	refFormulaID, err := resolveRefFormula(h.db, body.ProductID, body.FormulaID)
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
		RefFormulaID:  refFormulaID,
	}
	if body.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "จำนวนต้องไม่ติดลบ"})
		return
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

	refFormulas, err := refFormulaMap(h.db, []string{p.RefFormulaID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, toPlanOut(p, refFormulas, map[string]struct{ Done, Target int }{}))
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