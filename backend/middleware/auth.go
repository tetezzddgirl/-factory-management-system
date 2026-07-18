package middleware

import (
	"context"
	"net/http"
	"strings"

	"factoryflow/utils"
)

type ctxKey string

const UserKey ctxKey = "user"

// Auth คือ middleware ที่ตรวจสอบ JWT ใน Authorization header
// ก่อนปล่อยให้ request เข้าถึง route ที่ต้อง login
func Auth(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			tok, err := utils.ParseToken(secret, strings.TrimPrefix(h, "Bearer "))
			if err != nil || !tok.Valid {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), UserKey, tok.Claims)))
		})
	}
}
