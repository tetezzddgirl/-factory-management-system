package handlers

import (
	"errors"
	"net/http"

	"factoryflow/models"
	"factoryflow/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthHandler รวม dependency ที่ handler ฝั่ง auth ต้องใช้
type AuthHandler struct {
	db     *gorm.DB
	secret []byte
}

// NewAuthHandler สร้าง AuthHandler ตัวใหม่
func NewAuthHandler(db *gorm.DB, secret []byte) *AuthHandler {
	return &AuthHandler{db: db, secret: secret}
}

// Signup สมัครสมาชิกใหม่แล้วคืน JWT token
func (h *AuthHandler) Signup(c *gin.Context) {
	var cred models.Credentials
	if err := c.ShouldBindJSON(&cred); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cred.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	user := models.User{Email: cred.Email, PasswordHash: string(hash)}
	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.writeToken(c, user.ID, user.Email)
}

// Login ตรวจสอบ credentials แล้วคืน JWT token
//
// The request body is still {email, password} (models.Credentials, unchanged).
// The "email" field is treated as an IDENTIFIER:
//
//  1. a Friend account — models.User looked up by users.email (the original,
//     unchanged path). If the email matches a Friend user, that user's password
//     is the only one accepted.
//  2. FRESH-07 additive fallback — if no Friend user matches, a FactoryFlow
//     models.UserAccount is looked up by user_accounts.username OR the linked
//     employees.email. An inactive account, an unknown identifier, and a wrong
//     password all return the same 401 "invalid credentials" (no enumeration,
//     no hint whether it was a username or an email, password hash never
//     surfaced). On success a Friend-format JWT is minted via Friend's own
//     utils, so middleware.Auth and the frontend session handling are unchanged.
//
// No separate endpoint, no second auth server, no change to the Friend users or
// personnels tables, no duplicate identity is created.
func (h *AuthHandler) Login(c *gin.Context) {
	var cred models.Credentials
	if err := c.ShouldBindJSON(&cred); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	// 1) Friend account by email (unchanged).
	var user models.User
	err := h.db.WithContext(c.Request.Context()).Where("email = ?", cred.Email).First(&user).Error
	if err == nil {
		if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(cred.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		h.writeToken(c, user.ID, user.Email)
		return
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	// 2) FactoryFlow UserAccount fallback (additive).
	if h.loginWithUserAccount(c, cred.Email, cred.Password) {
		return
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
}

// loginWithUserAccount tries to authenticate identifier/password against a
// FactoryFlow user_accounts row (joined 1:1 to employees). It returns true when
// it has written a response (a success token, OR a 500 for a real DB error);
// it returns false WITHOUT writing on a genuine credential miss (no such
// account, inactive, or wrong password), so the caller sends the shared 401.
func (h *AuthHandler) loginWithUserAccount(c *gin.Context, identifier, password string) bool {
	var acct models.UserAccount
	err := h.db.WithContext(c.Request.Context()).
		Joins("JOIN employees ON employees.employee_id = user_accounts.employee_id").
		Where("user_accounts.username = ? OR employees.email = ?", identifier, identifier).
		First(&acct).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false // genuine miss -> shared 401, no enumeration
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return true // a real DB error is never treated as "no such account"
	}
	if !acct.Active {
		return false
	}
	if bcrypt.CompareHashAndPassword([]byte(acct.PasswordHash), []byte(password)) != nil {
		return false
	}

	// email claim: the linked employee's email if it has one, else the username
	// (the frontend only uses it for display / handler-name matching).
	tokenEmail := acct.Username
	var emp models.Employee
	if e := h.db.WithContext(c.Request.Context()).
		Where("employee_id = ?", acct.EmployeeID).First(&emp).Error; e == nil {
		if emp.Email != nil && *emp.Email != "" {
			tokenEmail = *emp.Email
		}
	}

	// best-effort last_login stamp (Postgres clock); never fails the login.
	h.db.WithContext(c.Request.Context()).
		Model(&models.UserAccount{}).Where("user_id = ?", acct.UserID).
		Update("last_login", gorm.Expr("now()"))

	tok, err := utils.GenerateTokenForSubject(h.secret, acct.UserID, tokenEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return true // response already written
	}
	c.JSON(http.StatusOK, gin.H{"token": tok})
	return true
}

func (h *AuthHandler) writeToken(c *gin.Context, id uint, email string) {
	tok, err := utils.GenerateToken(h.secret, int(id), email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tok})
}
