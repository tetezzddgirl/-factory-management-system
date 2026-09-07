package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EmployeeHandler รวม dependency ของ endpoint ฝั่งบุคลากร FactoryFlow (Employee)
//
// FRESH-04 added the two GET paths. FRESH-05 adds POST / PUT / DELETE plus 1:1
// UserAccount provisioning. Ported from the FactoryFlow reference
// (factoryflow/backend/handlers/employees.go + utils/validate.go), adapted to
// Friend's handler shape (a struct with a *gorm.DB, a New… constructor, methods
// that write with c.JSON). Auth is Friend's existing middleware.Auth — every
// method here runs only behind it and does NO authorization of its own
// (role/capability policy is a later phase).
//
// What was intentionally NOT ported from the reference:
//   - the "role == admin" auto-provisioned UserAccount (needs SEED_DEFAULT_PASSWORD
//     and a role→account policy; out of scope). An account is created here ONLY
//     when the request supplies username + password.
//   - the admin role-transition account reconciliation in Update.
//   - the pgx pool / capability / identity-resolver plumbing.
type EmployeeHandler struct {
	db *gorm.DB
}

// NewEmployeeHandler สร้าง EmployeeHandler ตัวใหม่
func NewEmployeeHandler(db *gorm.DB) *EmployeeHandler {
	return &EmployeeHandler{db: db}
}

// ---- FRESH-14 authorization (FactoryFlow-owned) --------------------------------
//
// The permission signal is the REAL authenticated user — never the freely
// switchable frontend RoleContext. Friend's middleware.Auth has already
// validated the JWT and stored its claims in the gin context under "user"
// (== middleware.UserKey). We read those claims (no Friend code is touched) and
// resolve the caller to an employees row:
//   1. a FactoryFlow login carries sub="USR-####", which maps 1:1 to
//      "EMP-####" (FRESH-03 user_accounts_assign_id trigger) — preferred, since
//      it is stable across a self-service e-mail edit;
//   2. otherwise fall back to matching the "email" claim against employees.email
//      (employees_email_key is UNIQUE).
// From that row we take employees.role.
//
//   admin           -> full Personnel CRUD + account controls
//   the row's owner  -> may edit ONLY their own first/last name, phone, email
//                       and reset their own password; department / position /
//                       role / status / shift are forced back to the stored
//                       values so a self-edit can never escalate
//   anyone else      -> 403
//
// A session whose email matches no employee (e.g. the Friend demo login) has no
// FactoryFlow employee identity -> treated as a non-owner non-admin: 403 on
// every write. Read endpoints (List / Get / GetEmployeeAccount) are unaffected —
// Personnel is viewable by every authenticated user.

// ctxUserKey mirrors middleware.UserKey ("user"); kept local so this
// FactoryFlow-owned file does not import Friend's middleware package.
const ctxUserKey = "user"

// callerEmployee resolves the authenticated caller to their FactoryFlow employee
// row (see the block comment above for the sub / email strategy). ok=false when
// there is no such employee (e.g. the Friend demo login).
func (h *EmployeeHandler) callerEmployee(c *gin.Context) (models.Employee, bool) {
	v, exists := c.Get(ctxUserKey)
	if !exists {
		return models.Employee{}, false
	}
	claims, ok := v.(jwt.MapClaims)
	if !ok {
		return models.Employee{}, false
	}

	// 1) FactoryFlow login: sub = "USR-####" -> "EMP-####"
	if sub, ok := claims["sub"].(string); ok && strings.HasPrefix(sub, "USR-") {
		empID := "EMP-" + strings.TrimPrefix(sub, "USR-")
		var e models.Employee
		if err := h.db.WithContext(c.Request.Context()).
			Where("employee_id = ?", empID).First(&e).Error; err == nil {
			return e, true
		}
	}

	// 2) fall back to the email claim
	email, _ := claims["email"].(string)
	email = strings.TrimSpace(email)
	if email == "" {
		return models.Employee{}, false
	}
	var e models.Employee
	if err := h.db.WithContext(c.Request.Context()).
		Where("lower(email) = lower(?)", email).First(&e).Error; err != nil {
		return models.Employee{}, false
	}
	return e, true
}

func (h *EmployeeHandler) callerIsAdmin(c *gin.Context) bool {
	e, ok := h.callerEmployee(c)
	return ok && e.Role == "admin"
}

// requireAdmin writes 403 and returns false when the caller is not an admin.
func (h *EmployeeHandler) requireAdmin(c *gin.Context) bool {
	if h.callerIsAdmin(c) {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "admin role required"})
	return false
}

// ---- validation (mirrors the FactoryFlow reference utils/validate.go) --------

var (
	employeeRoles    = []string{"admin", "factory_manager", "department_manager", "supervisor", "operator", "qc_inspector", "technician", "staff", "unassigned"}
	employeeStatuses = []string{"working", "leave", "off"}
	employeeShifts   = []string{"morning", "afternoon", "night"}
	emailRE          = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

func oneOf(v string, allowed []string) bool {
	for _, a := range allowed {
		if a == v {
			return true
		}
	}
	return false
}

// emailOrNil maps "" -> nil (stored as SQL NULL) so employees_email_key
// UNIQUE(email) permits any number of email-less employees while keeping every
// present address unique (FRESH-03 schema; owner decision B3 in the reference).
func emailOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// employeeInput is the writable shape for POST/PUT. employeeId is NEVER accepted
// from the client — Postgres generates it (EMP-####, FRESH-03 ff_employees_assign_id
// trigger). username/password are consumed by Create only; Update ignores them.
type employeeInput struct {
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
	Phone      string `json:"phone"`
	Email      string `json:"email"`
	Department string `json:"department"`
	Position   string `json:"position"`
	Role       string `json:"role"`
	Status     string `json:"status"`
	Shift      string `json:"shift"`
	Username   string `json:"username"`
	Password   string `json:"password"`
}

func (in *employeeInput) normalize() {
	in.FirstName = strings.TrimSpace(in.FirstName)
	in.LastName = strings.TrimSpace(in.LastName)
	in.Phone = strings.TrimSpace(in.Phone)
	in.Email = strings.TrimSpace(in.Email)
	in.Department = strings.TrimSpace(in.Department)
	in.Position = strings.TrimSpace(in.Position)
	in.Role = strings.TrimSpace(in.Role)
	in.Status = strings.TrimSpace(in.Status)
	in.Shift = strings.TrimSpace(in.Shift)
	in.Username = strings.TrimSpace(in.Username)
	if in.Status == "" {
		in.Status = "working"
	}
	if in.Shift == "" {
		in.Shift = "morning"
	}
}

// validate returns "" when ok, else a client-safe message. Enum checks mirror the
// FRESH-03 CHECK constraints exactly (role incl. "unassigned"; status; shift).
func (in *employeeInput) validate() string {
	if in.FirstName == "" || in.LastName == "" {
		return "firstName and lastName are required"
	}
	if in.Department == "" {
		return "department is required"
	}
	if !oneOf(in.Role, employeeRoles) {
		return "role is not one of the allowed values"
	}
	if !oneOf(in.Status, employeeStatuses) {
		return "status is not one of the allowed values"
	}
	if !oneOf(in.Shift, employeeShifts) {
		return "shift is not one of the allowed values"
	}
	if in.Email != "" && !emailRE.MatchString(in.Email) {
		return "email must be a valid email address when provided"
	}
	return ""
}

// errHasTaskAssignments blocks deleting an employee still referenced by
// task_assignments (the FRESH-03 FK is ON DELETE CASCADE, but silently discarding
// work assignments is not acceptable — require explicit unassignment first).
var errHasTaskAssignments = errors.New("employee has task assignments")

// writeDBError maps a database error to a safe (status, message). It never echoes
// the raw error and never mentions a password/hash.
func writeDBError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	var pg *pgconn.PgError
	if errors.As(err, &pg) {
		switch pg.Code {
		case "23505": // unique_violation
			msg := "a unique field already exists"
			switch pg.ConstraintName {
			case "user_accounts_username_key":
				msg = "username already exists"
			case "user_accounts_employee_id_key":
				msg = "this employee already has an account"
			case "employees_email_key":
				msg = "email already exists"
			case "task_assignments_task_id_employee_id_key":
				msg = "this employee is already assigned to this task"
			}
			c.JSON(http.StatusConflict, gin.H{"error": msg})
			return
		case "23503": // foreign_key_violation
			c.JSON(http.StatusBadRequest, gin.H{"error": "a referenced record does not exist"})
			return
		case "23514": // check_violation
			c.JSON(http.StatusBadRequest, gin.H{"error": "a field has an invalid value"})
			return
		case "23502": // not_null_violation
			c.JSON(http.StatusBadRequest, gin.H{"error": "a required field is missing"})
			return
		}
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
}

// ---- read (FRESH-04, unchanged) --------------------------------------------

// ListEmployees GET /api/employees — JSON array, ordered by employee_id, [] when empty.
func (h *EmployeeHandler) ListEmployees(c *gin.Context) {
	out := []models.Employee{}
	if err := h.db.WithContext(c.Request.Context()).
		Order("employee_id").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// GetEmployee GET /api/employees/:id — 200 with the Employee, or 404.
func (h *EmployeeHandler) GetEmployee(c *gin.Context) {
	id := c.Param("id")
	var e models.Employee
	if err := h.db.WithContext(c.Request.Context()).
		Where("employee_id = ?", id).First(&e).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, e)
}

// employeeAccountView is the read-only, safe projection of a UserAccount for the
// Personnel page — NO password_hash, no secret fields.
type employeeAccountView struct {
	UserID    string  `json:"userId"`
	Username  string  `json:"username"`
	Active    bool    `json:"active"`
	LastLogin *string `json:"lastLogin"`
}

// GetEmployeeAccount GET /api/employees/:id/account
//
// FRESH-07. Behind Friend's middleware.Auth (registered in the /api group).
// 404 if the employee does not exist; 200 {"account": null} if the employee has
// no login account; 200 {"account": {...}} with the safe fields otherwise. The
// bcrypt hash is never selected into the response.
func (h *EmployeeHandler) GetEmployeeAccount(c *gin.Context) {
	id := c.Param("id")

	var n int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&models.Employee{}).Where("employee_id = ?", id).Count(&n).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var a models.UserAccount
	err := h.db.WithContext(c.Request.Context()).
		Where("employee_id = ?", id).First(&a).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusOK, gin.H{"account": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	var lastLogin *string
	if a.LastLogin != nil {
		s := a.LastLogin.Format("2006-01-02T15:04:05Z07:00")
		lastLogin = &s
	}
	c.JSON(http.StatusOK, gin.H{"account": employeeAccountView{
		UserID:    a.UserID,
		Username:  a.Username,
		Active:    a.Active,
		LastLogin: lastLogin,
	}})
}

// ---- write (FRESH-05) -----------------------------------------------------

// CreateEmployee POST /api/employees
//
// Creates the Employee (employee_id assigned by the FRESH-03 trigger — never by
// the client). If BOTH username and password are supplied, a 1:1 UserAccount is
// created in the SAME transaction: the password is bcrypt-hashed, never stored or
// returned in plaintext, and the hash is never serialised. If the account insert
// fails (e.g. duplicate username -> 23505), the whole transaction — including the
// employee row — is rolled back, so an employee is never left without the account
// the request asked for.
func (h *EmployeeHandler) CreateEmployee(c *gin.Context) {
	if !h.requireAdmin(c) { // FRESH-14 — admin only
		return
	}
	var in employeeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	in.normalize()
	if msg := in.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	wantAccount := in.Username != "" || in.Password != ""
	if wantAccount {
		if in.Username == "" || in.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username and password must be provided together"})
			return
		}
		if len(in.Password) < 8 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
			return
		}
	}

	e := models.Employee{
		FirstName:  in.FirstName,
		LastName:   in.LastName,
		Phone:      in.Phone,
		Email:      emailOrNil(in.Email),
		Department: in.Department,
		Position:   in.Position,
		Role:       in.Role,
		Status:     in.Status,
		Shift:      in.Shift,
	}

	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		// EmployeeID / CreatedAt / UpdatedAt are gorm:"->" (read-only), so the
		// INSERT omits them; clause.Returning{} fetches back exactly what Postgres
		// stored (trigger-assigned employee_id + DEFAULT now()).
		if err := tx.Clauses(clause.Returning{}).Create(&e).Error; err != nil {
			return err
		}
		if wantAccount {
			hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
			if err != nil {
				return err
			}
			// user_id is derived by the FRESH-03 ff_user_accounts_assign_id
			// trigger (EMP-#### -> USR-####). password_hash is bcrypt.
			if err := tx.Exec(
				`INSERT INTO user_accounts (employee_id, username, password_hash, active) VALUES (?, ?, ?, TRUE)`,
				e.EmployeeID, in.Username, string(hash),
			).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeDBError(c, err)
		return
	}
	c.JSON(http.StatusCreated, e)
}

// UpdateEmployee PUT /api/employees/:id
//
// Updates the mutable Employee fields. employee_id is never in the update set, so
// it cannot change. The linked UserAccount is NOT touched — username stays as it
// is and no new account is ever created here. When email changes, the FRESH-03
// employees_email_history_update trigger records old->new automatically; setting
// email to NULL is fine (the trigger's NULL guard simply writes no history row).
func (h *EmployeeHandler) UpdateEmployee(c *gin.Context) {
	id := c.Param("id")

	// FRESH-14 — admin edits anyone; a non-admin may edit ONLY their own row.
	caller, hasCaller := h.callerEmployee(c)
	isAdmin := hasCaller && caller.Role == "admin"
	isSelf := hasCaller && caller.EmployeeID == id
	if !isAdmin && !isSelf {
		c.JSON(http.StatusForbidden, gin.H{"error": "you may only edit your own profile"})
		return
	}

	var in employeeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	in.normalize()

	// FRESH-14 — a non-admin editing self may change ONLY firstName / lastName /
	// phone / email. department / position / role / status / shift are pinned to
	// the stored values (defence in depth — the self-profile UI already omits
	// them), so a self-edit can never escalate privileges.
	if isSelf && !isAdmin {
		var cur models.Employee
		if err := h.db.WithContext(c.Request.Context()).
			Where("employee_id = ?", id).First(&cur).Error; err != nil {
			writeDBError(c, err)
			return
		}
		in.Department = cur.Department
		in.Position = cur.Position
		in.Role = cur.Role
		in.Status = cur.Status
		in.Shift = cur.Shift
	}

	if msg := in.validate(); msg != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msg})
		return
	}

	var e models.Employee
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		res := tx.Model(&models.Employee{}).Where("employee_id = ?", id).Updates(map[string]any{
			"first_name": in.FirstName,
			"last_name":  in.LastName,
			"phone":      in.Phone,
			"email":      emailOrNil(in.Email), // nil -> SQL NULL
			"department": in.Department,
			"position":   in.Position,
			"role":       in.Role,
			"status":     in.Status,
			"shift":      in.Shift,
		})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return tx.Where("employee_id = ?", id).First(&e).Error
	})
	if err != nil {
		writeDBError(c, err)
		return
	}
	c.JSON(http.StatusOK, e)
}

// DeleteEmployee DELETE /api/employees/:id
//
// Touches FactoryFlow tables only. Behaviour, per the real FRESH-03 FKs:
//   - task_assignments (FK ON DELETE CASCADE): if the employee is still assigned
//     to any task, the delete is REFUSED with 409 — assignments must be removed
//     explicitly first (no silent cascade of work records).
//   - user_accounts (1:1, FK ON DELETE CASCADE): the single login record is
//     deleted explicitly in the same transaction (documented, not a guessed cascade).
//   - employee_email_history (FK ON DELETE SET NULL): history rows are retained
//     with employee_id nulled — audit trail survives, left untouched here.
//
// Friend's personnels / users tables are never referenced.
func (h *EmployeeHandler) DeleteEmployee(c *gin.Context) {
	if !h.requireAdmin(c) { // FRESH-14 — admin only
		return
	}
	id := c.Param("id")
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var n int64
		if err := tx.Model(&models.Employee{}).Where("employee_id = ?", id).Count(&n).Error; err != nil {
			return err
		}
		if n == 0 {
			return gorm.ErrRecordNotFound
		}

		var taRefs int64
		if err := tx.Table("task_assignments").Where("employee_id = ?", id).Count(&taRefs).Error; err != nil {
			return err
		}
		if taRefs > 0 {
			return errHasTaskAssignments
		}

		if err := tx.Exec(`DELETE FROM user_accounts WHERE employee_id = ?`, id).Error; err != nil {
			return err
		}
		res := tx.Where("employee_id = ?", id).Delete(&models.Employee{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, errHasTaskAssignments) {
			c.JSON(http.StatusConflict, gin.H{"error": "employee has task assignments; remove them before deleting"})
			return
		}
		writeDBError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ---- account controls (FRESH-12) -------------------------------------------
//
// Two small, ADDITIVE endpoints the ported FactoryFlow Personnel edit dialog
// needs. Both touch FactoryFlow tables only (user_accounts / employees), make
// NO schema change (user_accounts.active + password_hash exist since FRESH-03),
// and never read, write, or serialise the bcrypt hash beyond replacing it.
// The username is never changed here. Behind Friend's middleware.Auth like the
// rest of this handler; no authorization policy of its own (a later phase).

// errNoAccount — the employee exists but has no linked user_accounts row.
var errNoAccount = errors.New("employee has no account")

// accountActiveInput is the body for PATCH /api/employees/:id/account.
// active is a *bool so a missing/!bool value is rejected rather than defaulted.
type accountActiveInput struct {
	Active *bool `json:"active"`
}

// SetAccountActive PATCH /api/employees/:id/account   { "active": true|false }
//
//	employee not found     -> 404
//	employee has no account -> 404
//	ok                     -> 200 { "account": {userId, username, active, lastLogin} }
func (h *EmployeeHandler) SetAccountActive(c *gin.Context) {
	if !h.requireAdmin(c) { // FRESH-14 — account activation is an admin action only
		return
	}
	id := c.Param("id")
	var in accountActiveInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Active == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "active (boolean) is required"})
		return
	}

	var acct models.UserAccount
	err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var emp int64
		if err := tx.Model(&models.Employee{}).Where("employee_id = ?", id).Count(&emp).Error; err != nil {
			return err
		}
		if emp == 0 {
			return gorm.ErrRecordNotFound
		}
		res := tx.Model(&models.UserAccount{}).Where("employee_id = ?", id).Update("active", *in.Active)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errNoAccount
		}
		return tx.Where("employee_id = ?", id).First(&acct).Error
	})
	if err != nil {
		if errors.Is(err, errNoAccount) {
			c.JSON(http.StatusNotFound, gin.H{"error": "this employee has no login account"})
			return
		}
		writeDBError(c, err)
		return
	}

	var lastLogin *string
	if acct.LastLogin != nil {
		s := acct.LastLogin.Format("2006-01-02T15:04:05Z07:00")
		lastLogin = &s
	}
	c.JSON(http.StatusOK, gin.H{"account": employeeAccountView{
		UserID:    acct.UserID,
		Username:  acct.Username,
		Active:    acct.Active,
		LastLogin: lastLogin,
	}})
}

// resetPasswordInput is the body for POST /api/employees/:id/account/reset-password.
type resetPasswordInput struct {
	Password string `json:"password"`
}

// ResetAccountPassword POST /api/employees/:id/account/reset-password   { "password": "…" }
//
//	password < 8 chars      -> 400
//	employee not found      -> 404
//	employee has no account -> 404
//	ok                      -> 204
//
// The plaintext is bcrypt-hashed, replaces password_hash, and is never stored,
// returned, or logged. Username and active flag are untouched.
func (h *EmployeeHandler) ResetAccountPassword(c *gin.Context) {
	id := c.Param("id")

	// FRESH-14 — a user may reset ONLY their own password; admin may reset anyone's.
	caller, hasCaller := h.callerEmployee(c)
	if !((hasCaller && caller.Role == "admin") || (hasCaller && caller.EmployeeID == id)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you may only reset your own password"})
		return
	}

	var in resetPasswordInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if len(in.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password must be at least 8 characters"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	err = h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var emp int64
		if err := tx.Model(&models.Employee{}).Where("employee_id = ?", id).Count(&emp).Error; err != nil {
			return err
		}
		if emp == 0 {
			return gorm.ErrRecordNotFound
		}
		res := tx.Model(&models.UserAccount{}).Where("employee_id = ?", id).Update("password_hash", string(hash))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errNoAccount
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, errNoAccount) {
			c.JSON(http.StatusNotFound, gin.H{"error": "this employee has no login account"})
			return
		}
		writeDBError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
