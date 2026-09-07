package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"factoryflow/database"
	"factoryflow/middleware"
	"factoryflow/models"
	"factoryflow/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// FRESH-04 / FRESH-05 — tests for the FactoryFlow Employee API.
//
// Auth-only cases (no token / bad token -> 401) need no database: Friend's
// middleware.Auth aborts before the handler runs, so the router is built with a
// nil *gorm.DB. The rest need the real FRESH-03 schema; they connect to a
// THROWAWAY Postgres database named by FF_TEST_DATABASE_DSN, run database.Migrate
// on it, and DELETE every FactoryFlow row before and after each test. They skip
// when the DSN is unset, so `go test ./...` still passes with no database. The
// DSN must point at a dedicated test database, never a Friend/production one.

var testSecret = []byte("fresh05-test-secret")

// newRouter wires all five Employee routes behind Friend's real middleware.Auth,
// exactly as main.go does.
func newRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewEmployeeHandler(db)
	api := r.Group("/api")
	api.Use(middleware.Auth(testSecret))
	api.GET("/employees", h.ListEmployees)
	api.GET("/employees/:id", h.GetEmployee)
	api.POST("/employees", h.CreateEmployee)
	api.PUT("/employees/:id", h.UpdateEmployee)
	api.DELETE("/employees/:id", h.DeleteEmployee)
	return r
}

// validToken mints a token with Friend's own utils.GenerateToken (same claims,
// HS256, secret contract) — i.e. exactly what POST /auth/login returns. Its
// "email" claim (demo@factoryflow.app) matches no employee row, so after
// FRESH-14 it authenticates for READ endpoints but is NOT an admin.
func validToken(t *testing.T) string {
	t.Helper()
	tok, err := utils.GenerateToken(testSecret, 1, "demo@factoryflow.app")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	return tok
}

// FRESH-14 — write endpoints now require the caller to resolve (via the JWT
// "email" claim) to an employees row with role='admin'. seedAdmin inserts that
// row DIRECTLY (bypassing the now-guarded CreateEmployee handler) with the
// e-mail carried by validToken, so the existing write tests keep exercising the
// happy path. It returns the admin's employee_id.
func seedAdmin(t *testing.T, db *gorm.DB) string {
	t.Helper()
	if err := db.Exec(
		`INSERT INTO employees (first_name, last_name, phone, email, department, position, role, status, shift)
		 VALUES ('Test','Admin','', 'demo@factoryflow.app', 'IT', 'System Administrator', 'admin', 'working', 'morning')`,
	).Error; err != nil {
		t.Fatalf("seedAdmin: %v", err)
	}
	var id string
	db.Raw(`SELECT employee_id FROM employees WHERE email = 'demo@factoryflow.app' LIMIT 1`).Scan(&id)
	return id
}

// seedEmployeeRow inserts an employees row directly (no account, no guard) and
// returns (employeeID, token-for-that-email). Used to test the non-admin paths.
func seedEmployeeRow(t *testing.T, db *gorm.DB, role, email string) (string, string) {
	t.Helper()
	if err := db.Exec(
		`INSERT INTO employees (first_name, last_name, phone, email, department, position, role, status, shift)
		 VALUES ('Reg','User','', ?, 'Production', 'Operator', ?, 'working', 'morning')`,
		email, role,
	).Error; err != nil {
		t.Fatalf("seedEmployeeRow: %v", err)
	}
	var id string
	db.Raw(`SELECT employee_id FROM employees WHERE email = ? LIMIT 1`, email).Scan(&id)
	tok, err := utils.GenerateToken(testSecret, 2, email)
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	return id, tok
}

var ffTables = []string{
	"task_assignments", "employee_email_history", "user_accounts", "tasks", "employees",
}

func cleanFF(t *testing.T, db *gorm.DB) {
	t.Helper()
	for _, tbl := range ffTables {
		if err := db.Exec("DELETE FROM " + tbl).Error; err != nil {
			t.Fatalf("clean %s: %v", tbl, err)
		}
	}
}

// testDB connects to the throwaway Postgres database, applies the full
// production migration (database.Migrate — AutoMigrate + ensureFactoryFlowSchema),
// and hands back an empty set of FactoryFlow tables.
func testDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("FF_TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("FF_TEST_DATABASE_DSN not set; skipping DB-backed Employee test")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Skipf("cannot open FF_TEST_DATABASE_DSN: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Skipf("cannot access sql.DB: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		t.Skipf("cannot reach FF_TEST_DATABASE_DSN: %v", err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatalf("database.Migrate: %v", err)
	}
	cleanFF(t, db)
	t.Cleanup(func() { cleanFF(t, db) })
	return db
}

func do(r *gin.Engine, method, path, bearer string, body any) *httptest.ResponseRecorder {
	var rdr *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	} else {
		rdr = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rdr)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// createEmployee POSTs and returns the decoded Employee (fails the test on non-201).
func createEmployee(t *testing.T, r *gin.Engine, tok string, body map[string]any) models.Employee {
	t.Helper()
	w := do(r, http.MethodPost, "/api/employees", tok, body)
	if w.Code != http.StatusCreated {
		t.Fatalf("create: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var e models.Employee
	if err := json.Unmarshal(w.Body.Bytes(), &e); err != nil {
		t.Fatalf("create: decode: %v (%s)", err, w.Body.String())
	}
	return e
}

// ---- GET (FRESH-04 regression) ----------------------------------------------

func TestListEmployees_NoToken_401(t *testing.T) {
	w := do(newRouter(nil), http.MethodGet, "/api/employees", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestListEmployees_BadToken_401(t *testing.T) {
	w := do(newRouter(nil), http.MethodGet, "/api/employees", "not-a-real-jwt", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestListEmployees_ValidToken_EmptyTable_200(t *testing.T) {
	db := testDB(t)
	w := do(newRouter(db), http.MethodGet, "/api/employees", validToken(t), nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if got := strings.TrimSpace(w.Body.String()); got != "[]" {
		t.Fatalf("want [], got %q", got)
	}
}

func TestGetEmployee_NoToken_401(t *testing.T) {
	w := do(newRouter(nil), http.MethodGet, "/api/employees/EMP-0001", "", nil)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestGetEmployee_ValidToken_Missing_404(t *testing.T) {
	db := testDB(t)
	w := do(newRouter(db), http.MethodGet, "/api/employees/EMP-NOPE", validToken(t), nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d (%s)", w.Code, w.Body.String())
	}
}

// ---- Create (FRESH-05) -----------------------------------------------------

func TestCreateEmployee_NoAccount_201(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	e := createEmployee(t, r, validToken(t), map[string]any{
		"firstName": "Ann", "lastName": "Ng", "department": "Production", "role": "operator",
	})
	if !strings.HasPrefix(e.EmployeeID, "EMP-") {
		t.Fatalf("want DB-generated EMP-#### id, got %q", e.EmployeeID)
	}
	// no account row was created
	var n int64
	db.Table("user_accounts").Where("employee_id = ?", e.EmployeeID).Count(&n)
	if n != 0 {
		t.Fatalf("no account expected, found %d", n)
	}
}

func TestCreateEmployee_WithAccount_201_BcryptHash_NoPasswordLeak(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	const pw = "s3cret-passw0rd"
	w := do(r, http.MethodPost, "/api/employees", tok, map[string]any{
		"firstName": "Bob", "lastName": "Lee", "department": "IT", "role": "admin",
		"email": "bob@example.com", "username": "bob.lee", "password": pw,
	})
	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d (%s)", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if strings.Contains(body, pw) || strings.Contains(strings.ToLower(body), "password") || strings.Contains(body, "hash") {
		t.Fatalf("response leaked password/hash: %s", body)
	}
	var e models.Employee
	json.Unmarshal(w.Body.Bytes(), &e)

	// account exists, linked 1:1, password stored as a bcrypt hash of pw
	var acct struct {
		UserID       string
		EmployeeID   string
		Username     string
		PasswordHash string
	}
	if err := db.Raw(
		`SELECT user_id, employee_id, username, password_hash FROM user_accounts WHERE employee_id = ?`, e.EmployeeID,
	).Scan(&acct).Error; err != nil {
		t.Fatalf("load account: %v", err)
	}
	if acct.Username != "bob.lee" || acct.EmployeeID != e.EmployeeID {
		t.Fatalf("account not linked 1:1: %+v", acct)
	}
	if acct.UserID != strings.Replace(e.EmployeeID, "EMP-", "USR-", 1) {
		t.Fatalf("user_id not derived from employee_id: %q vs %q", acct.UserID, e.EmployeeID)
	}
	if acct.PasswordHash == pw {
		t.Fatal("password stored in plaintext")
	}
	if !strings.HasPrefix(acct.PasswordHash, "$2") {
		t.Fatalf("password_hash is not bcrypt: %q", acct.PasswordHash)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(acct.PasswordHash), []byte(pw)); err != nil {
		t.Fatalf("bcrypt hash does not verify against the password: %v", err)
	}
}

func TestCreateEmployee_MissingRequired_400(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	w := do(newRouter(db), http.MethodPost, "/api/employees", validToken(t), map[string]any{
		"firstName": "NoLast", "department": "IT", "role": "operator",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestCreateEmployee_BadEmail_400(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	w := do(newRouter(db), http.MethodPost, "/api/employees", validToken(t), map[string]any{
		"firstName": "E", "lastName": "Mail", "department": "IT", "role": "operator", "email": "not-an-email",
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestCreateEmployee_NoToken_401(t *testing.T) {
	w := do(newRouter(nil), http.MethodPost, "/api/employees", "", map[string]any{"firstName": "x"})
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d (%s)", w.Code, w.Body.String())
	}
}

// ---- Duplicate username -> 409 + full rollback ----------------------------

func TestCreateEmployee_DuplicateUsername_409_AndEmployeeRolledBack(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)

	createEmployee(t, r, tok, map[string]any{
		"firstName": "First", "lastName": "One", "department": "IT", "role": "staff",
		"username": "dup.name", "password": "password-1234",
	})

	var before int64
	db.Model(&models.Employee{}).Count(&before)

	w := do(r, http.MethodPost, "/api/employees", tok, map[string]any{
		"firstName": "Second", "lastName": "Two", "department": "IT", "role": "staff",
		"username": "dup.name", "password": "password-5678",
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("duplicate username: want 409, got %d (%s)", w.Code, w.Body.String())
	}

	var after int64
	db.Model(&models.Employee{}).Count(&after)
	if after != before {
		t.Fatalf("employee not rolled back: count %d -> %d", before, after)
	}
	// the failed second employee must not exist
	var leaked int64
	db.Model(&models.Employee{}).Where("first_name = ? AND last_name = ?", "Second", "Two").Count(&leaked)
	if leaked != 0 {
		t.Fatalf("rolled-back employee 'Second Two' still present (%d rows)", leaked)
	}
	// the first account is intact
	var acct int64
	db.Table("user_accounts").Where("username = ?", "dup.name").Count(&acct)
	if acct != 1 {
		t.Fatalf("want exactly 1 'dup.name' account, got %d", acct)
	}
}

// ---- Update (FRESH-05) ---------------------------------------------------

func TestUpdateEmployee_Success_IDUnchanged(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	e := createEmployee(t, r, tok, map[string]any{
		"firstName": "Up", "lastName": "Date", "department": "IT", "role": "operator", "email": "up@a.co",
	})

	w := do(r, http.MethodPut, "/api/employees/"+e.EmployeeID, tok, map[string]any{
		"firstName": "Up", "lastName": "Dated", "department": "Quality", "role": "qc_inspector",
		"status": "leave", "email": "up@a.co",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var got models.Employee
	json.Unmarshal(w.Body.Bytes(), &got)
	if got.EmployeeID != e.EmployeeID {
		t.Fatalf("employee_id changed: %q -> %q", e.EmployeeID, got.EmployeeID)
	}
	if got.LastName != "Dated" || got.Department != "Quality" || got.Role != "qc_inspector" || got.Status != "leave" {
		t.Fatalf("fields not updated: %+v", got)
	}
}

func TestUpdateEmployee_Missing_404(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	w := do(newRouter(db), http.MethodPut, "/api/employees/EMP-NOPE", validToken(t), map[string]any{
		"firstName": "A", "lastName": "B", "department": "IT", "role": "staff",
	})
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestUpdateEmployee_EmailChange_RecordsHistory(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	e := createEmployee(t, r, tok, map[string]any{
		"firstName": "Mail", "lastName": "Hist", "department": "IT", "role": "staff", "email": "old@x.io",
	})

	// create wrote one history row ('create', old NULL -> old@x.io)
	var h1 int64
	db.Table("employee_email_history").Where("employee_id = ?", e.EmployeeID).Count(&h1)
	if h1 != 1 {
		t.Fatalf("want 1 history row after create, got %d", h1)
	}

	w := do(r, http.MethodPut, "/api/employees/"+e.EmployeeID, tok, map[string]any{
		"firstName": "Mail", "lastName": "Hist", "department": "IT", "role": "staff", "email": "new@x.io",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var row struct {
		OldEmail *string
		NewEmail string
		Source   string
	}
	if err := db.Raw(
		`SELECT old_email, new_email, source FROM employee_email_history
		 WHERE employee_id = ? ORDER BY changed_at DESC LIMIT 1`, e.EmployeeID,
	).Scan(&row).Error; err != nil {
		t.Fatalf("load history: %v", err)
	}
	if row.OldEmail == nil || *row.OldEmail != "old@x.io" || row.NewEmail != "new@x.io" || row.Source != "update" {
		t.Fatalf("history row wrong: %+v", row)
	}
}

func TestUpdateEmployee_EmailToNull_OK_NoHistoryRow(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	e := createEmployee(t, r, tok, map[string]any{
		"firstName": "Null", "lastName": "Mail", "department": "IT", "role": "staff", "email": "has@mail.io",
	})

	var before int64
	db.Table("employee_email_history").Where("employee_id = ?", e.EmployeeID).Count(&before)

	w := do(r, http.MethodPut, "/api/employees/"+e.EmployeeID, tok, map[string]any{
		"firstName": "Null", "lastName": "Mail", "department": "IT", "role": "staff", // email omitted -> ""
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update to NULL email: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var got models.Employee
	if err := db.Where("employee_id = ?", e.EmployeeID).First(&got).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if got.Email != nil {
		t.Fatalf("email should be NULL, got %q", *got.Email)
	}
	var after int64
	db.Table("employee_email_history").Where("employee_id = ?", e.EmployeeID).Count(&after)
	if after != before {
		t.Fatalf("NULL email must not add a history row: %d -> %d", before, after)
	}
}

// ---- Delete (FRESH-05) -------------------------------------------------

func TestDeleteEmployee_Success_ThenGone(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	e := createEmployee(t, r, tok, map[string]any{
		"firstName": "Del", "lastName": "Me", "department": "IT", "role": "staff",
		"username": "del.me", "password": "password-1234",
	})

	w := do(r, http.MethodDelete, "/api/employees/"+e.EmployeeID, tok, nil)
	if w.Code != http.StatusNoContent {
		t.Fatalf("delete: want 204, got %d (%s)", w.Code, w.Body.String())
	}
	g := do(r, http.MethodGet, "/api/employees/"+e.EmployeeID, tok, nil)
	if g.Code != http.StatusNotFound {
		t.Fatalf("after delete: want 404, got %d (%s)", g.Code, g.Body.String())
	}
	// the 1:1 account is gone too
	var acct int64
	db.Table("user_accounts").Where("employee_id = ?", e.EmployeeID).Count(&acct)
	if acct != 0 {
		t.Fatalf("linked account not removed (%d rows)", acct)
	}
}

func TestDeleteEmployee_Missing_404(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	w := do(newRouter(db), http.MethodDelete, "/api/employees/EMP-NOPE", validToken(t), nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d (%s)", w.Code, w.Body.String())
	}
}

func TestDeleteEmployee_WithTaskAssignment_409(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	e := createEmployee(t, r, tok, map[string]any{
		"firstName": "Busy", "lastName": "Person", "department": "Production", "role": "operator",
	})
	if err := db.Exec(`INSERT INTO tasks (title) VALUES ('t-fresh05')`).Error; err != nil {
		t.Fatalf("insert task: %v", err)
	}
	var taskID string
	db.Raw(`SELECT task_id FROM tasks WHERE title = 't-fresh05' LIMIT 1`).Scan(&taskID)
	if err := db.Exec(
		`INSERT INTO task_assignments (task_id, employee_id) VALUES (?, ?)`, taskID, e.EmployeeID,
	).Error; err != nil {
		t.Fatalf("insert assignment: %v", err)
	}

	w := do(r, http.MethodDelete, "/api/employees/"+e.EmployeeID, tok, nil)
	if w.Code != http.StatusConflict {
		t.Fatalf("delete with assignment: want 409, got %d (%s)", w.Code, w.Body.String())
	}
	// employee still there
	var n int64
	db.Model(&models.Employee{}).Where("employee_id = ?", e.EmployeeID).Count(&n)
	if n != 1 {
		t.Fatalf("employee should survive a refused delete, found %d", n)
	}
}

// ---- Auth on the write paths --------------------------------------------

func TestWritePaths_NoToken_401(t *testing.T) {
	r := newRouter(nil)
	for _, tc := range []struct {
		method, path string
	}{
		{http.MethodPost, "/api/employees"},
		{http.MethodPut, "/api/employees/EMP-0001"},
		{http.MethodDelete, "/api/employees/EMP-0001"},
	} {
		w := do(r, tc.method, tc.path, "", map[string]any{"firstName": "x"})
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: want 401, got %d", tc.method, tc.path, w.Code)
		}
		w = do(r, tc.method, tc.path, "garbage-token", map[string]any{"firstName": "x"})
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s (bad token): want 401, got %d", tc.method, tc.path, w.Code)
		}
	}
}

// ---- Round-trip regression: GET list still works after writes ----------

func TestList_ReflectsWrites(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db) // FRESH-14 — write paths require an admin caller
	r := newRouter(db)
	tok := validToken(t)
	createEmployee(t, r, tok, map[string]any{"firstName": "L1", "lastName": "A", "department": "IT", "role": "staff"})
	createEmployee(t, r, tok, map[string]any{"firstName": "L2", "lastName": "B", "department": "IT", "role": "staff"})

	w := do(r, http.MethodGet, "/api/employees", tok, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("list: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var list []models.Employee
	if err := json.Unmarshal(w.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(list) != 3 { // 2 created + 1 seeded admin (FRESH-14)
		t.Fatalf("want 3 employees, got %d", len(list))
	}
}

// ---- FRESH-14: role-based authorization on the write paths -----------------

// A token whose email resolves to a NON-admin employee (or to no employee) may
// still LIST/GET, but every write path is 403.
func TestFRESH14_NonAdmin_CanRead_CannotWrite(t *testing.T) {
	db := testDB(t)
	admin := seedAdmin(t, db)
	_, regTok := seedEmployeeRow(t, db, "operator", "reg.user@factoryflow.local")
	r := newRouter(db)

	// read is allowed
	if w := do(r, http.MethodGet, "/api/employees", regTok, nil); w.Code != http.StatusOK {
		t.Fatalf("non-admin list: want 200, got %d (%s)", w.Code, w.Body.String())
	}

	// create / delete are admin-only
	if w := do(r, http.MethodPost, "/api/employees", regTok, map[string]any{
		"firstName": "X", "lastName": "Y", "department": "IT", "role": "staff",
	}); w.Code != http.StatusForbidden {
		t.Fatalf("non-admin create: want 403, got %d (%s)", w.Code, w.Body.String())
	}
	if w := do(r, http.MethodDelete, "/api/employees/"+admin, regTok, nil); w.Code != http.StatusForbidden {
		t.Fatalf("non-admin delete: want 403, got %d (%s)", w.Code, w.Body.String())
	}

	// the same, from a token whose email resolves to NO employee at all
	ghost, err := utils.GenerateToken(testSecret, 99, "nobody@nowhere.invalid")
	if err != nil {
		t.Fatalf("GenerateToken: %v", err)
	}
	if w := do(r, http.MethodPost, "/api/employees", ghost, map[string]any{
		"firstName": "X", "lastName": "Y", "department": "IT", "role": "staff",
	}); w.Code != http.StatusForbidden {
		t.Fatalf("no-identity create: want 403, got %d (%s)", w.Code, w.Body.String())
	}
}

// A non-admin may PUT their OWN row, but only firstName/lastName/phone/email
// take effect — department/position/role/status/shift are pinned to storage.
func TestFRESH14_NonAdmin_Self_Update_NameOnly_PrivilegedFieldsPinned(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db)
	selfID, selfTok := seedEmployeeRow(t, db, "operator", "self.edit@factoryflow.local")
	r := newRouter(db)

	w := do(r, http.MethodPut, "/api/employees/"+selfID, selfTok, map[string]any{
		"firstName": "Self", "lastName": "Edited", "phone": "0812345678",
		"email": "self.new@factoryflow.local",
		// attempts to escalate — must be ignored:
		"department": "IT", "role": "admin", "status": "leave", "shift": "night",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("self update: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var got models.Employee
	json.Unmarshal(w.Body.Bytes(), &got)
	if got.FirstName != "Self" || got.LastName != "Edited" || got.Phone != "0812345678" ||
		got.Email == nil || *got.Email != "self.new@factoryflow.local" {
		t.Fatalf("allowed fields not saved: %+v", got)
	}
	if got.Role != "operator" || got.Department != "Production" || got.Status != "working" || got.Shift != "morning" {
		t.Fatalf("privileged fields changed by a self-edit: %+v", got)
	}
}

// A non-admin PUT-ing a DIFFERENT employee id is 403.
func TestFRESH14_NonAdmin_Update_OtherEmployee_403(t *testing.T) {
	db := testDB(t)
	adminID := seedAdmin(t, db)
	_, regTok := seedEmployeeRow(t, db, "operator", "other.reg@factoryflow.local")
	r := newRouter(db)

	w := do(r, http.MethodPut, "/api/employees/"+adminID, regTok, map[string]any{
		"firstName": "H", "lastName": "Acker", "department": "IT", "role": "staff",
	})
	if w.Code != http.StatusForbidden {
		t.Fatalf("non-admin editing another employee: want 403, got %d (%s)", w.Code, w.Body.String())
	}
}

// An admin can PUT any employee, including changing role/department.
func TestFRESH14_Admin_Update_OtherEmployee_OK(t *testing.T) {
	db := testDB(t)
	seedAdmin(t, db)
	targetID, _ := seedEmployeeRow(t, db, "operator", "target.emp@factoryflow.local")
	r := newRouter(db)

	w := do(r, http.MethodPut, "/api/employees/"+targetID, validToken(t), map[string]any{
		"firstName": "Reg", "lastName": "User", "department": "Quality",
		"role": "qc_inspector", "status": "leave", "email": "target.emp@factoryflow.local",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("admin update: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	var got models.Employee
	json.Unmarshal(w.Body.Bytes(), &got)
	if got.Department != "Quality" || got.Role != "qc_inspector" || got.Status != "leave" {
		t.Fatalf("admin edit did not apply privileged fields: %+v", got)
	}
}
