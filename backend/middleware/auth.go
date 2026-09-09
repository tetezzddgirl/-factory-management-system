package middleware

import (
	"net/http"
	"strings"

	"factoryflow/utils"

	"github.com/gin-gonic/gin"
)

const UserKey = "user"

// Auth คือ Gin middleware ที่ตรวจสอบ JWT ใน Authorization header
// ก่อนปล่อยให้ request เข้าถึง route ที่ต้อง login
func Auth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		tok, err := utils.ParseToken(secret, strings.TrimPrefix(h, "Bearer "))
		if err != nil || !tok.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set(UserKey, tok.Claims)
		c.Next()
	}
}
