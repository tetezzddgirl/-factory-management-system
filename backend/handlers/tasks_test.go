package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"factoryflow/middleware"
	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// FRESH-08 — Task + Task Assignment API tests. Shares the DB helpers from
// employees_test.go (testDB, testSecret, cleanFF, do) and the auth helpers from
// auth_login_test.go (seedFriendUser, provisionAccount, loginCode).

// tasksEnv wires the FRESH-08 task/assignment routes + FRESH-05 employee routes +
// /auth/login on one shared DB connection, all behind Friend's middleware.Auth
// (except POST /auth/login), exactly as main.go composes them.
func tasksEnv(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	db := testDB(t)
	gin.SetMode(gin.TestMode)
	r := gin.New()

	ah := NewAuthHandler(db, testSecret)
	r.POST("/auth/login", ah.Login)

	th := NewTaskHandler(db)
	tah := NewTaskAssignmentHandler(db)
	eh := NewEmployeeHandler(db)

	// unauthenticated seeding route (mirrors auth_login_test.go's authEnv) so the
	// shared provisionAccount / makeEmployee helpers can create fixtures.
	// FRESH-14 — CreateEmployee is now admin-only, so seed an admin and give the
	// seeding route that identity.
	seedAdmin(t, db)
	r.POST("/api/employees", func(c *gin.Context) {
		c.Set(ctxUserKey, jwt.MapClaims{"email": "demo@factoryflow.app"})
		eh.CreateEmployee(c)
	})

	api := r.Group("/api")
	api.Use(middleware.Auth(testSecret))
	api.GET("/tasks", th.ListTasks)
	api.GET("/tasks/:id", th.GetTask)
	api.POST("/tasks", th.CreateTask)
	api.PUT("/tasks/:id", th.UpdateTask)
	api.DELETE("/tasks/:id", th.DeleteTask)
	api.GET("/tasks/:id/assignments", tah.ListAssignments)
	api.POST("/tasks/:id/assignments", tah.CreateAssignment)
	api.DELETE("/tasks/:id/assignments/:assignmentId", tah.DeleteAssignment)
	api.DELETE("/employees/:id", eh.DeleteEmployee) // authenticated — exercised with a token
	return r, db
}

func mustToken(t *testing.T, r *gin.Engine, id, pw string) string {
	t.Helper()
	code, tok, raw := loginCode(t, r, id, pw)
	if code != http.StatusOK || tok == "" {
		t.Fatalf("login %s: %d %q", id, code, raw)
	}
	return tok
}

// createTask POSTs and returns the new task_id (fails on non-201).
func createTask(t *testing.T, r *gin.Engine, tok string, body map[string]any) string {
	t.Helper()
	w := do(r, http.MethodPost, "/api/tasks", tok, body)
	if w.Code != http.StatusCreated {
		t.Fatalf("create task: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var tk models.Task
	if err := json.Unmarshal(w.Body.Bytes(), &tk); err != nil {
		t.Fatalf("decode task: %v (%s)", err, w.Body.String())
	}
	return tk.TaskID
}

// makeEmployee creates a bare employee (no account) and returns its id.
func makeEmployee(t *testing.T, r *gin.Engine, tok, first, last string) string {
	t.Helper()
	w := do(r, http.MethodPost, "/api/employees", tok, map[string]any{
		"firstName": first, "lastName": last, "department": "Production", "role": "operator",
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("create employee: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var e models.Employee
	_ = json.Unmarshal(w.Body.Bytes(), &e)
	return e.EmployeeID
}

// ---- auth on the Task API (§10 / §11.14-17) -----------------------------

func TestTasks_NoToken_401(t *testing.T) {
	r, _ := tasksEnv(t)
	for _, tc := range [][2]string{
		{http.MethodGet, "/api/tasks"},
		{http.MethodPost, "/api/tasks"},
		{http.MethodGet, "/api/tasks/TSK-0001"},
		{http.MethodPut, "/api/tasks/TSK-0001"},
		{http.MethodDelete, "/api/tasks/TSK-0001"},
		{http.MethodGet, "/api/tasks/TSK-0001/assignments"},
		{http.MethodPost, "/api/tasks/TSK-0001/assignments"},
		{http.MethodDelete, "/api/tasks/TSK-0001/assignments/TAS-0001"},
	} {
		w := do(r, tc[0], tc[1], "", map[string]any{"x": 1})
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: want 401, got %d", tc[0], tc[1], w.Code)
		}
	}
}

func TestTasks_InvalidToken_401(t *testing.T) {
	r, _ := tasksEnv(t)
	w := do(r, http.MethodGet, "/api/tasks", "garbage-token", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", w.Code)
	}
}

func TestTasks_FriendToken_Success(t *testing.T) {
	r, db := tasksEnv(t)
	seedFriendUser(t, db, "friend.tasks@example.com", "friendpw123")
	tok := mustToken(t, r, "friend.tasks@example.com", "friendpw123")
	w := do(r, http.MethodGet, "/api/tasks", tok, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("friend token on /api/tasks: want 200, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestTasks_FactoryFlowToken_Success(t *testing.T) {
	r, _ := tasksEnv(t)
	provisionAccount(t, r, "tasks.acct01", "acctpw12345", "")
	tok := mustToken(t, r, "tasks.acct01", "acctpw12345")
	w := do(r, http.MethodGet, "/api/tasks", tok, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("factoryflow token on /api/tasks: want 200, got %d (%s)", w.Code, w.Body.String())
	}
}

// ---- Task CRUD (§11.1-7) --------------------------------------------------

func TestTask_List_Empty_200(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	w := do(r, http.MethodGet, "/api/tasks", tok, nil)
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatalf("want 200 [], got %d (%s)", w.Code, w.Body.String())
	}
}

func TestTask_Create_And_Get_And_List(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)

	id := createTask(t, r, tok, map[string]any{"title": "Weld frame", "shift": "afternoon", "status": "in_progress"})
	if !strings.HasPrefix(id, "TSK-") {
		t.Fatalf("want DB-generated TSK-#### id, got %q", id)
	}

	g := do(r, http.MethodGet, "/api/tasks/"+id, tok, nil)
	if g.Code != http.StatusOK {
		t.Fatalf("get task: want 200, got %d (%s)", g.Code, g.Body.String())
	}
	var got models.Task
	json.Unmarshal(g.Body.Bytes(), &got)
	if got.TaskID != id || got.Title != "Weld frame" || got.Shift != "afternoon" || got.Status != "in_progress" {
		t.Fatalf("task round-trip wrong: %+v", got)
	}
	if got.MachineID != nil {
		t.Fatalf("machineId should be nil, got %q", *got.MachineID)
	}

	l := do(r, http.MethodGet, "/api/tasks", tok, nil)
	var list []models.Task
	json.Unmarshal(l.Body.Bytes(), &list)
	if len(list) != 1 {
		t.Fatalf("want 1 task, got %d", len(list))
	}
}

func TestTask_Get_Missing_404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	w := do(r, http.MethodGet, "/api/tasks/TSK-NOPE", tok, nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", w.Code)
	}
}

func TestTask_Create_Invalid_400(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	// missing title
	if w := do(r, http.MethodPost, "/api/tasks", tok, map[string]any{"status": "pending"}); w.Code != http.StatusBadRequest {
		t.Fatalf("missing title: want 400, got %d (%s)", w.Code, w.Body.String())
	}
	// bad status
	if w := do(r, http.MethodPost, "/api/tasks", tok, map[string]any{"title": "x", "status": "nope"}); w.Code != http.StatusBadRequest {
		t.Fatalf("bad status: want 400, got %d (%s)", w.Code, w.Body.String())
	}
	// bad shift
	if w := do(r, http.MethodPost, "/api/tasks", tok, map[string]any{"title": "x", "shift": "nope"}); w.Code != http.StatusBadRequest {
		t.Fatalf("bad shift: want 400, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestTask_Update_Success_IDImmutable_And_MissingIs404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	id := createTask(t, r, tok, map[string]any{"title": "Old title"})

	w := do(r, http.MethodPut, "/api/tasks/"+id, tok, map[string]any{
		"title": "New title", "description": "d", "status": "done", "shift": "night",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var got models.Task
	json.Unmarshal(w.Body.Bytes(), &got)
	if got.TaskID != id || got.Title != "New title" || got.Status != "done" || got.Shift != "night" {
		t.Fatalf("update not applied / id changed: %+v", got)
	}

	if m := do(r, http.MethodPut, "/api/tasks/TSK-NOPE", tok, map[string]any{"title": "x"}); m.Code != http.StatusNotFound {
		t.Fatalf("update missing: want 404, got %d", m.Code)
	}
}

func TestTask_Delete_Success_And_Missing_404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	id := createTask(t, r, tok, map[string]any{"title": "Delete me"})

	if w := do(r, http.MethodDelete, "/api/tasks/"+id, tok, nil); w.Code != http.StatusNoContent {
		t.Fatalf("delete: want 204, got %d (%s)", w.Code, w.Body.String())
	}
	if g := do(r, http.MethodGet, "/api/tasks/"+id, tok, nil); g.Code != http.StatusNotFound {
		t.Fatalf("after delete: want 404, got %d", g.Code)
	}
	if m := do(r, http.MethodDelete, "/api/tasks/TSK-NOPE", tok, nil); m.Code != http.StatusNotFound {
		t.Fatalf("delete missing: want 404, got %d", m.Code)
	}
}

// ---- Assignment (§11.8-12) ---------------------------------------------

func TestAssignment_Assign_List_Unassign(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "Assemble"})
	empID := makeEmployee(t, r, tok, "Assign", "Ee")

	w := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": empID})
	if w.Code != http.StatusCreated {
		t.Fatalf("assign: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var av struct {
		AssignmentID string `json:"assignmentId"`
		EmployeeID   string `json:"employeeId"`
		LastName     string `json:"lastName"`
	}
	json.Unmarshal(w.Body.Bytes(), &av)
	if !strings.HasPrefix(av.AssignmentID, "TAS-") || av.EmployeeID != empID || av.LastName != "Ee" {
		t.Fatalf("assignment view wrong: %s", w.Body.String())
	}
	if strings.Contains(w.Body.String(), "password") || strings.Contains(w.Body.String(), "hash") {
		t.Fatalf("assignment response leaked a secret: %s", w.Body.String())
	}

	l := do(r, http.MethodGet, "/api/tasks/"+taskID+"/assignments", tok, nil)
	var list []map[string]any
	json.Unmarshal(l.Body.Bytes(), &list)
	if l.Code != http.StatusOK || len(list) != 1 || list[0]["employeeId"] != empID {
		t.Fatalf("list assignments: want [1 for %s], got %d (%s)", empID, l.Code, l.Body.String())
	}

	if u := do(r, http.MethodDelete, "/api/tasks/"+taskID+"/assignments/"+av.AssignmentID, tok, nil); u.Code != http.StatusNoContent {
		t.Fatalf("unassign: want 204, got %d (%s)", u.Code, u.Body.String())
	}
	l2 := do(r, http.MethodGet, "/api/tasks/"+taskID+"/assignments", tok, nil)
	if strings.TrimSpace(l2.Body.String()) != "[]" {
		t.Fatalf("after unassign: want [], got %s", l2.Body.String())
	}
}

func TestAssignment_Duplicate_409(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "Dup"})
	empID := makeEmployee(t, r, tok, "Dup", "Emp")

	first := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": empID})
	if first.Code != http.StatusCreated {
		t.Fatalf("first assign: %d (%s)", first.Code, first.Body.String())
	}
	second := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": empID})
	if second.Code != http.StatusConflict {
		t.Fatalf("duplicate assign: want 409, got %d (%s)", second.Code, second.Body.String())
	}
}

func TestAssignment_MissingTask_404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	empID := makeEmployee(t, r, tok, "Orphan", "Task")
	w := do(r, http.MethodPost, "/api/tasks/TSK-NOPE/assignments", tok, map[string]any{"employeeId": empID})
	if w.Code != http.StatusNotFound {
		t.Fatalf("assign to missing task: want 404, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestAssignment_MissingEmployee_404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "NoEmp"})
	w := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": "EMP-NOPE"})
	if w.Code != http.StatusNotFound {
		t.Fatalf("assign missing employee: want 404, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestAssignment_MissingEmployeeIdField_400(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "Blank"})
	w := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("blank employeeId: want 400, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestAssignment_Unassign_Missing_404(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "U"})
	w := do(r, http.MethodDelete, "/api/tasks/"+taskID+"/assignments/TAS-NOPE", tok, nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("unassign missing: want 404, got %d", w.Code)
	}
}

// ---- Task delete blocked while assigned (§6) --------------------------

func TestTask_Delete_Blocked_While_Assigned_409(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "Busy task"})
	empID := makeEmployee(t, r, tok, "Busy", "Person")

	if a := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": empID}); a.Code != http.StatusCreated {
		t.Fatalf("assign: %d (%s)", a.Code, a.Body.String())
	}
	if d := do(r, http.MethodDelete, "/api/tasks/"+taskID, tok, nil); d.Code != http.StatusConflict {
		t.Fatalf("delete task with assignment: want 409, got %d (%s)", d.Code, d.Body.String())
	}
	// task survives
	if g := do(r, http.MethodGet, "/api/tasks/"+taskID, tok, nil); g.Code != http.StatusOK {
		t.Fatalf("task should survive a refused delete, got %d", g.Code)
	}
}

// ---- Employee delete blocked while assigned — FRESH-05 regression (§8) ----

func TestEmployeeDelete_Blocked_While_Assigned_Then_Succeeds_After_Unassign(t *testing.T) {
	r, _ := tasksEnv(t)
	tok := factoryToken(t, r)
	taskID := createTask(t, r, tok, map[string]any{"title": "Emp-del task"})
	empID := makeEmployee(t, r, tok, "Del", "Guard")

	w := do(r, http.MethodPost, "/api/tasks/"+taskID+"/assignments", tok, map[string]any{"employeeId": empID})
	var av struct {
		AssignmentID string `json:"assignmentId"`
	}
	json.Unmarshal(w.Body.Bytes(), &av)

	if d := do(r, http.MethodDelete, "/api/employees/"+empID, tok, nil); d.Code != http.StatusConflict {
		t.Fatalf("employee delete while assigned: want 409 (FRESH-05), got %d (%s)", d.Code, d.Body.String())
	}
	if u := do(r, http.MethodDelete, "/api/tasks/"+taskID+"/assignments/"+av.AssignmentID, tok, nil); u.Code != http.StatusNoContent {
		t.Fatalf("unassign: want 204, got %d", u.Code)
	}
	if d := do(r, http.MethodDelete, "/api/employees/"+empID, tok, nil); d.Code != http.StatusNoContent {
		t.Fatalf("employee delete after unassign: want 204 (FRESH-05), got %d (%s)", d.Code, d.Body.String())
	}
}

// factoryToken provisions a throwaway FactoryFlow account and returns a valid JWT
// (keeps the CRUD tests independent of any Friend users row).
//
// FRESH-14 — the employee-DELETE path exercised by these tests is now admin-only,
// so the runner account is provisioned WITH an email and promoted to admin; the
// email lets the JWT "email" claim resolve back to this employee row.
func factoryToken(t *testing.T, r *gin.Engine) string {
	t.Helper()
	provisionAccount(t, r, "tasks.runner", "runnerpw12345", "tasks.runner@factoryflow.local")
	return mustToken(t, r, "tasks.runner", "runnerpw12345")
}
