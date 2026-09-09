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
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// FRESH-07 — the Friend /auth/login endpoint now also authenticates FactoryFlow
// user_accounts (by username or the linked employee email), additively: the
// original Friend-user-by-email path is unchanged. These tests share the DB
// helpers from employees_test.go (testDB, testSecret, cleanFF, do).

// authEnv wires /auth/login + /auth/signup + one middleware-protected route on a
// single shared DB connection (so seeding and assertions see the same data).
func authEnv(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	db := testDB(t) // skips when FF_TEST_DATABASE_DSN is unset
	gin.SetMode(gin.TestMode)
	r := gin.New()
	ah := NewAuthHandler(db, testSecret)
	r.POST("/auth/login", ah.Login)
	r.POST("/auth/signup", ah.Signup)

	eh := NewEmployeeHandler(db)
	// FRESH-14 — CreateEmployee is now admin-only. Seed an admin row and give the
	// unauthenticated seeding route that admin's identity so fixture creation
	// keeps working. (main.go always mounts this route behind middleware.Auth.)
	seedAdmin(t, db)
	r.POST("/api/employees", func(c *gin.Context) {
		c.Set(ctxUserKey, jwt.MapClaims{"email": "demo@factoryflow.app"})
		eh.CreateEmployee(c)
	})
	r.GET("/api/employees/:id/account", eh.GetEmployeeAccount)

	prot := r.Group("/protected")
	prot.Use(middleware.Auth(testSecret))
	prot.GET("/ping", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })
	return r, db
}

func loginCode(t *testing.T, r *gin.Engine, id, pw string) (int, string, string) {
	t.Helper()
	w := do(r, http.MethodPost, "/auth/login", "", map[string]any{"email": id, "password": pw})
	var body struct {
		Token string `json:"token"`
		Error string `json:"error"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &body)
	return w.Code, body.Token, w.Body.String()
}

func seedFriendUser(t *testing.T, db *gorm.DB, email, pw string) {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	if err := db.Exec(
		`INSERT INTO users (email, password_hash, role, created_at) VALUES (?, ?, 'operator', now())`,
		email, string(hash),
	).Error; err != nil {
		t.Fatalf("seed friend user: %v", err)
	}
	t.Cleanup(func() { db.Exec("DELETE FROM users WHERE email = ?", email) })
}

// provisionAccount creates an employee + 1:1 account through the real
// POST /api/employees flow and returns the employee id.
//
// FRESH-14 — the fixture is created with role 'admin' so a token minted for it
// can exercise the now-admin-only Employee write paths. Login-behaviour tests
// here do not depend on the role value.
func provisionAccount(t *testing.T, r *gin.Engine, username, password, email string) string {
	t.Helper()
	body := map[string]any{
		"firstName": "Acct", "lastName": "Login", "department": "IT", "role": "admin",
		"username": username, "password": password,
	}
	if email != "" {
		body["email"] = email
	}
	w := do(r, http.MethodPost, "/api/employees", "", body)
	if w.Code != http.StatusCreated {
		t.Fatalf("provision employee+account: %d (%s)", w.Code, w.Body.String())
	}
	var e models.Employee
	_ = json.Unmarshal(w.Body.Bytes(), &e)
	return e.EmployeeID
}

// ---- Friend account (regression) -----------------------------------------

func TestLogin_FriendUser_EmailPassword_OK(t *testing.T) {
	r, db := authEnv(t)
	seedFriendUser(t, db, "friend.user@example.com", "friendpw123")

	code, tok, raw := loginCode(t, r, "friend.user@example.com", "friendpw123")
	if code != http.StatusOK || tok == "" {
		t.Fatalf("friend login: want 200 + token, got %d %q", code, raw)
	}
	w := do(r, http.MethodGet, "/protected/ping", tok, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("friend token rejected by middleware: %d", w.Code)
	}
}

func TestLogin_FriendUser_WrongPassword_401(t *testing.T) {
	r, db := authEnv(t)
	seedFriendUser(t, db, "friend2@example.com", "correcthorse")
	code, _, _ := loginCode(t, r, "friend2@example.com", "wrong")
	if code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", code)
	}
}

// ---- FactoryFlow UserAccount login (the feature) ------------------------

func TestLogin_UserAccount_UsernamePassword_OK(t *testing.T) {
	r, _ := authEnv(t)
	provisionAccount(t, r, "acct.login01", "accountpw123", "")

	code, tok, raw := loginCode(t, r, "acct.login01", "accountpw123")
	if code != http.StatusOK || tok == "" {
		t.Fatalf("user-account login: want 200 + token, got %d %q", code, raw)
	}
	w := do(r, http.MethodGet, "/protected/ping", tok, nil)
	if w.Code != http.StatusOK {
		t.Fatalf("user-account token rejected by Friend middleware: %d", w.Code)
	}
}

func TestLogin_UserAccount_ByLinkedEmail_OK(t *testing.T) {
	r, _ := authEnv(t)
	provisionAccount(t, r, "acct.login02", "accountpw123", "acct.login02@corp.example")

	code, tok, raw := loginCode(t, r, "acct.login02@corp.example", "accountpw123")
	if code != http.StatusOK || tok == "" {
		t.Fatalf("login by linked email: want 200 + token, got %d %q", code, raw)
	}
}

func TestLogin_UserAccount_WrongPassword_401(t *testing.T) {
	r, _ := authEnv(t)
	provisionAccount(t, r, "acct.login03", "accountpw123", "")
	code, _, _ := loginCode(t, r, "acct.login03", "nope")
	if code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", code)
	}
}

func TestLogin_UnknownIdentifier_401(t *testing.T) {
	r, _ := authEnv(t)
	code, _, _ := loginCode(t, r, "nobody.at.all", "whatever12")
	if code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", code)
	}
}

// A Friend users row and a FactoryFlow employee sharing the same email:
// the Friend account must win for that email, its password is authoritative,
// and username login for the FactoryFlow account still works independently.
func TestLogin_EmailCollision_FriendWins_UsernameIndependent(t *testing.T) {
	r, db := authEnv(t)
	const shared = "same@example.com"
	seedFriendUser(t, db, shared, "friend-secret-1")
	provisionAccount(t, r, "collide01", "account-secret-2", shared)

	// email + Friend password -> Friend account authenticates
	if code, tok, raw := loginCode(t, r, shared, "friend-secret-1"); code != http.StatusOK || tok == "" {
		t.Fatalf("email+friend-pw: want 200 + token, got %d %q", code, raw)
	}
	// email + FactoryFlow password -> rejected (Friend password is authoritative for the email)
	if code, _, _ := loginCode(t, r, shared, "account-secret-2"); code != http.StatusUnauthorized {
		t.Fatalf("email+account-pw: want 401 (Friend must win), got %d", code)
	}
	// username + FactoryFlow password -> still works independently
	if code, tok, raw := loginCode(t, r, "collide01", "account-secret-2"); code != http.StatusOK || tok == "" {
		t.Fatalf("username+account-pw: want 200 + token, got %d %q", code, raw)
	}
}

func TestLogin_InactiveUserAccount_401(t *testing.T) {
	r, db := authEnv(t)
	provisionAccount(t, r, "acct.inactive", "accountpw123", "")
	if err := db.Exec("UPDATE user_accounts SET active = FALSE WHERE username = ?", "acct.inactive").Error; err != nil {
		t.Fatalf("deactivate: %v", err)
	}
	code, _, _ := loginCode(t, r, "acct.inactive", "accountpw123")
	if code != http.StatusUnauthorized {
		t.Fatalf("inactive account: want 401, got %d", code)
	}
}

func TestLogin_ResponseNeverLeaksSecret(t *testing.T) {
	r, _ := authEnv(t)
	provisionAccount(t, r, "acct.leak", "secretpw12345", "")
	_, _, okBody := loginCode(t, r, "acct.leak", "secretpw12345")
	_, _, badBody := loginCode(t, r, "acct.leak", "wrong")
	for _, b := range []string{okBody, badBody} {
		if strings.Contains(b, "secretpw12345") || strings.Contains(b, "$2a$") || strings.Contains(b, "password_hash") {
			t.Fatalf("login response leaked a secret: %s", b)
		}
	}
}

// ---- GET /api/employees/:id/account -----------------------------------

func TestGetEmployeeAccount_ReturnsUsername_NoHash(t *testing.T) {
	r, _ := authEnv(t)
	empID := provisionAccount(t, r, "acct.view", "accountpw123", "")

	w := do(r, http.MethodGet, "/api/employees/"+empID+"/account", "", nil)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d (%s)", w.Code, w.Body.String())
	}
	body := w.Body.String()
	if !strings.Contains(body, `"username":"acct.view"`) {
		t.Fatalf("username missing: %s", body)
	}
	if strings.Contains(body, "password") || strings.Contains(body, "$2a$") || strings.Contains(body, "hash") {
		t.Fatalf("account view leaked a secret: %s", body)
	}
}

func TestGetEmployeeAccount_NoAccount_NullBody(t *testing.T) {
	r, _ := authEnv(t)
	w := do(r, http.MethodPost, "/api/employees", "", map[string]any{
		"firstName": "No", "lastName": "Account", "department": "IT", "role": "staff",
	})
	var e models.Employee
	_ = json.Unmarshal(w.Body.Bytes(), &e)

	g := do(r, http.MethodGet, "/api/employees/"+e.EmployeeID+"/account", "", nil)
	if g.Code != http.StatusOK || !strings.Contains(g.Body.String(), `"account":null`) {
		t.Fatalf("want 200 {account:null}, got %d (%s)", g.Code, g.Body.String())
	}
}

func TestGetEmployeeAccount_MissingEmployee_404(t *testing.T) {
	r, _ := authEnv(t)
	w := do(r, http.MethodGet, "/api/employees/EMP-NOPE/account", "", nil)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", w.Code)
	}
}
