package handlers

import (
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
func (h *AuthHandler) Login(c *gin.Context) {
	var cred models.Credentials
	if err := c.ShouldBindJSON(&cred); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	var user models.User
	if err := h.db.Where("email = ?", cred.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(cred.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	h.writeToken(c, user.ID, user.Email)
}

func (h *AuthHandler) writeToken(c *gin.Context, id uint, email string) {
	tok, err := utils.GenerateToken(h.secret, int(id), email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tok})
}
