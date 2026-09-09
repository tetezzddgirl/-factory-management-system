package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// TaskAssignmentHandler — FactoryFlow Task ↔ Employee assignment (FRESH-08).
//
// Routes are nested under a task: /api/tasks/:id/assignments[/:assignmentId],
// behind Friend's middleware.Auth. An assignment references employees.employee_id
// ONLY — never Friend personnels, never users, no identity_links. Ported from the
// FactoryFlow reference handlers/task_assignments.go, adapted to Friend's handler
// shape and the FRESH-03 schema (UNIQUE(task_id, employee_id), FK cascades).
type TaskAssignmentHandler struct {
	db *gorm.DB
}

// NewTaskAssignmentHandler สร้าง TaskAssignmentHandler ตัวใหม่
func NewTaskAssignmentHandler(db *gorm.DB) *TaskAssignmentHandler {
	return &TaskAssignmentHandler{db: db}
}

var (
	errTaskNotFound     = errors.New("task not found")
	errEmployeeNotFound = errors.New("employee not found")
)

// assignmentView is the raw task_assignments row plus the assigned employee's
// display fields, so the UI can show a name without a second call. It carries NO
// user_accounts data and no secret fields.
type assignmentView struct {
	AssignmentID string    `json:"assignmentId"`
	TaskID       string    `json:"taskId"`
	EmployeeID   string    `json:"employeeId"`
	AssignedAt   time.Time `json:"assignedAt"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Department   string    `json:"department"`
	Position     string    `json:"position"`
}

// ListAssignments GET /api/tasks/:id/assignments
// 404 if the task does not exist; otherwise its assignments (each with the
// employee's name/department), ordered by assignment_id, [] when none.
func (h *TaskAssignmentHandler) ListAssignments(c *gin.Context) {
	taskID := c.Param("id")

	var n int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&models.Task{}).Where("task_id = ?", taskID).Count(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	out := []assignmentView{}
	err := h.db.WithContext(c.Request.Context()).
		Table("task_assignments AS ta").
		Select(`ta.assignment_id, ta.task_id, ta.employee_id, ta.assigned_at,
		        e.first_name, e.last_name, e.department, e.position`).
		Joins("JOIN employees e ON e.employee_id = ta.employee_id").
		Where("ta.task_id = ?", taskID).
		Order("ta.assignment_id").
		Scan(&out).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateAssignment POST /api/tasks/:id/assignments   { "employeeId": "EMP-####" }
//
//	blank employeeId               -> 400
//	task does not exist            -> 404
//	employee does not exist        -> 404
//	employee already on this task  -> 409  (UNIQUE task_id+employee_id)
//	ok                             -> 201  assignmentView
func (h *TaskAssignmentHandler) CreateAssignment(c *gin.Context) {
	taskID := c.Param("id")
	var in struct {
		EmployeeID string `json:"employeeId"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	empID := strings.TrimSpace(in.EmployeeID)
	if empID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "employeeId is required"})
		return
	}

	var a models.TaskAssignment
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var tn int64
		if err := tx.Model(&models.Task{}).Where("task_id = ?", taskID).Count(&tn).Error; err != nil {
			return err
		}
		if tn == 0 {
			return errTaskNotFound
		}
		var en int64
		if err := tx.Model(&models.Employee{}).Where("employee_id = ?", empID).Count(&en).Error; err != nil {
			return err
		}
		if en == 0 {
			return errEmployeeNotFound
		}
		a = models.TaskAssignment{TaskID: taskID, EmployeeID: empID}
		return tx.Clauses(clause.Returning{}).Create(&a).Error
	})
	if err != nil {
		switch {
		case errors.Is(err, errTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		case errors.Is(err, errEmployeeNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		default:
			writeDBError(c, err) // UNIQUE(task_id, employee_id) -> 409
		}
		return
	}

	var e models.Employee
	_ = h.db.WithContext(c.Request.Context()).Where("employee_id = ?", empID).First(&e).Error
	c.JSON(http.StatusCreated, assignmentView{
		AssignmentID: a.AssignmentID,
		TaskID:       a.TaskID,
		EmployeeID:   a.EmployeeID,
		AssignedAt:   a.AssignedAt,
		FirstName:    e.FirstName,
		LastName:     e.LastName,
		Department:   e.Department,
		Position:     e.Position,
	})
}

// ListAllAssignments GET /api/tasks/assignments
//
// FRESH-12 — every task_assignments row across all tasks, each with the assigned
// employee's display fields, ordered by task_id then assignment_id. ADDITIVE
// read; no schema change. The ported shift/assignment board uses it to render
// every task's assignees and to find an employee's still-open tasks in ONE
// round-trip instead of N per-task calls. Carries NO user_accounts data.
func (h *TaskAssignmentHandler) ListAllAssignments(c *gin.Context) {
	out := []assignmentView{}
	err := h.db.WithContext(c.Request.Context()).
		Table("task_assignments AS ta").
		Select(`ta.assignment_id, ta.task_id, ta.employee_id, ta.assigned_at,
		        e.first_name, e.last_name, e.department, e.position`).
		Joins("JOIN employees e ON e.employee_id = ta.employee_id").
		Order("ta.task_id, ta.assignment_id").
		Scan(&out).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// DeleteAssignment DELETE /api/tasks/:id/assignments/:assignmentId
// existing (and belongs to that task) -> 204 ; otherwise -> 404.
func (h *TaskAssignmentHandler) DeleteAssignment(c *gin.Context) {
	taskID := c.Param("id")
	assignmentID := c.Param("assignmentId")
	res := h.db.WithContext(c.Request.Context()).
		Where("assignment_id = ? AND task_id = ?", assignmentID, taskID).
		Delete(&models.TaskAssignment{})
	if res.Error != nil {
		writeDBError(c, res.Error)
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "assignment not found"})
		return
	}
	c.Status(http.StatusNoContent)
}
