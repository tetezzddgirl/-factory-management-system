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

// GenerateTokenForSubject is GenerateToken with a string subject instead of a
// numeric user id. Added in FRESH-07 for FactoryFlow UserAccount logins, whose
// identifier is the text user_id "USR-####". The token is otherwise identical to
// GenerateToken's — same signing method, same {sub, email, exp} claim set, same
// 24h expiry — so middleware.Auth and the frontend session handling accept it
// unchanged. GenerateToken and the Friend email/signup path are untouched.
func GenerateTokenForSubject(secret []byte, subject, email string) (string, error) {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   subject,
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
