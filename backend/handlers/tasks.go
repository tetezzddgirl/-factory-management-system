package handlers

import (
	"errors"
	"net/http"
	"strings"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// TaskHandler — FactoryFlow Task CRUD (FRESH-08).
//
// Friend handler shape: a struct holding *gorm.DB, a New… constructor, methods
// that write with c.JSON, mounted behind Friend's existing middleware.Auth (see
// main.go). Ported from the FactoryFlow reference handlers/tasks.go, adapted to
// reuse the FactoryFlow helpers already in this package (writeDBError, oneOf)
// instead of the reference's pgx-era writeJSON/dbError/decodeJSON. No new model,
// no schema change — the tasks table + TSK-#### generator + CHECK constraints +
// updated_at trigger were all created in FRESH-03.
type TaskHandler struct {
	db *gorm.DB
}

// NewTaskHandler สร้าง TaskHandler ตัวใหม่
func NewTaskHandler(db *gorm.DB) *TaskHandler { return &TaskHandler{db: db} }

var (
	taskShifts   = []string{"morning", "afternoon", "night"}
	taskStatuses = []string{"pending", "in_progress", "done"}
)

// errTaskHasAssignments blocks deleting a task that still has employee
// assignments (FRESH-03 FK is ON DELETE CASCADE, but — mirroring the FRESH-05
// employee-delete rule — silently discarding the assigned people is not
// acceptable; require explicit unassignment first).
var errTaskHasAssignments = errors.New("task has assignments")

// taskInput is the writable shape. task_id is NEVER accepted from the client —
// Postgres generates it (TSK-####, FRESH-03 column DEFAULT). machineId "" / null
// / omitted all mean "no machine" (plain nullable text, NO FK — FRESH-03).
//
// FRESH-13 — workId is the OPTIONAL link to a Friend Work item (Work.workID).
// "" / null / omitted all mean "ad-hoc task, no production origin". Sending a
// value sets it; sending null/"" on PUT clears it. There is deliberately NO
// server-side existence check (it would require a Friend API/source change);
// the UI resolves and displays it best-effort and degrades gracefully when the
// Work can no longer be found.
type taskInput struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	MachineID   *string `json:"machineId"`
	WorkID      *string `json:"workId"`
	Shift       string  `json:"shift"`
	Status      string  `json:"status"`
}

func (in *taskInput) normalize() {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.Shift = strings.TrimSpace(in.Shift)
	in.Status = strings.TrimSpace(in.Status)
	if in.MachineID != nil {
		t := strings.TrimSpace(*in.MachineID)
		if t == "" {
			in.MachineID = nil
		} else {
			in.MachineID = &t
		}
	}
	if in.WorkID != nil {
		t := strings.TrimSpace(*in.WorkID)
		if t == "" {
			in.WorkID = nil
		} else {
			in.WorkID = &t
		}
	}
	if in.Shift == "" {
		in.Shift = "morning"
	}
	if in.Status == "" {
		in.Status = "pending"
	}
}

// validate mirrors the FRESH-03 CHECK constraints (tasks_shift_check,
// tasks_status_check); the DB is still the source of truth.
func (in *taskInput) validate() string {
	if in.Title == "" {
		return "title is required"
	}
	if !oneOf(in.Shift, taskShifts) {
		return "shift is not one of the allowed values"
	}
	if !oneOf(in.Status, taskStatuses) {
		return "status is not one of the allowed values"
	}
	return ""
}

// ListTasks GET /api/tasks — JSON array ordered by task_id, [] when empty.
func (h *TaskHandler) ListTasks(c *gin.Context) {
	out := []models.Task{}
	if err := h.db.WithContext(c.Request.Context()).
		Order("task_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetTask GET /api/tasks/:id — 200 with the Task, or 404.
func (h *TaskHandler) GetTask(c *gin.Context) {
	var t models.Task
	if err := h.db.WithContext(c.Request.Context()).
		Where("task_id = ?", c.Param("id")).First(&t).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}

// CreateTask POST /api/tasks — 201 with the Task (task_id from the DB DEFAULT,
// read back via RETURNING). 400 on bad json / validation.
func (h *TaskHandler) CreateTask(c *gin.Context) {
	var in taskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	in.normalize()
	if msg := in.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}
	t := models.Task{
		Title:       in.Title,
		Description: in.Description,
		MachineID:   in.MachineID,
		WorkID:      in.WorkID,
		Shift:       in.Shift,
		Status:      in.Status,
	}
	if err := h.db.WithContext(c.Request.Context()).
		Clauses(clause.Returning{}).Create(&t).Error; err != nil {
		writeDBError(c, err)
		return
	}
	c.JSON(http.StatusCreated, t)
}

// UpdateTask PUT /api/tasks/:id — task_id is never in the update set, so it
// cannot change. 404 when no row matches; 400 on bad json / validation.
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	id := c.Param("id")
	var in taskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	in.normalize()
	if msg := in.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}
	var t models.Task
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&models.Task{}).Where("task_id = ?", id).Updates(map[string]any{
			"title":       in.Title,
			"description": in.Description,
			"machine_id":  in.MachineID, // nil -> SQL NULL
			"work_id":     in.WorkID,    // nil -> SQL NULL (PUT can set OR clear the link)
			"shift":       in.Shift,
			"status":      in.Status,
		})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return tx.Where("task_id = ?", id).First(&t).Error
	})
	if err != nil {
		writeDBError(c, err)
		return
	}
	c.JSON(http.StatusOK, t)
}

// DeleteTask DELETE /api/tasks/:id
//
// FactoryFlow tables only. If the task still has task_assignments the delete is
// REFUSED with 409 (no silent cascade of the assigned people — same rule as
// FRESH-05 employee delete). 404 when the task does not exist.
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	id := c.Param("id")
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var n int64
		if err := tx.Model(&models.Task{}).Where("task_id = ?", id).Count(&n).Error; err != nil {
			return err
		}
		if n == 0 {
			return gorm.ErrRecordNotFound
		}
		var refs int64
		if err := tx.Table("task_assignments").Where("task_id = ?", id).Count(&refs).Error; err != nil {
			return err
		}
		if refs > 0 {
			return errTaskHasAssignments
		}
		res := tx.Where("task_id = ?", id).Delete(&models.Task{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, errTaskHasAssignments) {
			c.JSON(http.StatusConflict, gin.H{"error": "task has employee assignments; remove them before deleting"})
			return
		}
		writeDBError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
