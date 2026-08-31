package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken สร้าง JWT token สำหรับผู้ใช้ที่ login/signup สำเร็จ
func GenerateToken(secret []byte, userID int, email string) (string, error) {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	})
	return tok.SignedString(secret)
}

// ParseToken ตรวจสอบและถอดรหัส JWT token
func ParseToken(secret []byte, tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		return secret, nil
	})
}
