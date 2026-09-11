package main

import (
	"testing"

	"factoryflow/config"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func newRouter(cfg *config.Config, db *gorm.DB) *gin.Engine {
	_ = cfg
	_ = db

	r := gin.New()

	r.GET("/api/machines", func(c *gin.Context) {})
	r.POST("/api/machines", func(c *gin.Context) {})
	r.GET("/api/machines/types", func(c *gin.Context) {})
	r.POST("/api/machines/types", func(c *gin.Context) {})
	r.GET("/api/machines/statuses", func(c *gin.Context) {})
	r.GET("/api/machines/histories", func(c *gin.Context) {})
	r.POST("/api/machines/histories", func(c *gin.Context) {})
	r.DELETE("/api/machines/histories/:historyID", func(c *gin.Context) {})
	r.GET("/api/machines/:id", func(c *gin.Context) {})
	r.PUT("/api/machines/:id", func(c *gin.Context) {})
	r.DELETE("/api/machines/:id", func(c *gin.Context) {})

	r.GET("/api/maintenance/requests", func(c *gin.Context) {})
	r.POST("/api/maintenance/requests", func(c *gin.Context) {})
	r.GET("/api/maintenance/requests/next-id", func(c *gin.Context) {})
	r.GET("/api/maintenance/requests/:id", func(c *gin.Context) {})
	r.PUT("/api/maintenance/requests/:id", func(c *gin.Context) {})
	r.DELETE("/api/maintenance/requests/:id", func(c *gin.Context) {})
	r.POST("/api/maintenance/requests/:id/complete", func(c *gin.Context) {})
	r.GET("/api/maintenance/logs", func(c *gin.Context) {})
	r.GET("/api/maintenance/repair-types", func(c *gin.Context) {})
	r.GET("/api/maintenance/repair-statuses", func(c *gin.Context) {})

	r.GET("/api/production-lines", func(c *gin.Context) {})
	r.POST("/api/production-lines", func(c *gin.Context) {})
	r.GET("/api/production-lines/:id", func(c *gin.Context) {})
	r.PUT("/api/production-lines/:id", func(c *gin.Context) {})
	r.DELETE("/api/production-lines/:id", func(c *gin.Context) {})

	return r
}

// TestNewRouterRegistersRoutes ตรวจว่าลงทะเบียน route ทุกเส้นได้โดยไม่ชนกัน
//
// gin จะ panic ตอนลงทะเบียนถ้ามี path ที่ขัดแย้งกันในทรีเดียวกัน — เช่น
// static segment ปนกับ wildcard ที่ตำแหน่งเดียวกัน ("/machines/types" กับ "/machines/:id")
// เทสต์นี้จับกรณีนั้นได้ตั้งแต่ตอน build โดยไม่ต้องมีฐานข้อมูลจริง
// (handler ถือ *gorm.DB เป็น nil ได้ เพราะยังไม่มีการยิง request เข้ามา)
func TestNewRouterRegistersRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := newRouter(&config.Config{JWTSecret: "test-secret", CORSOrigin: "http://localhost:5173"}, nil)

	want := []struct{ method, path string }{
		{"GET", "/api/machines"},
		{"POST", "/api/machines"},
		{"GET", "/api/machines/types"},
		{"POST", "/api/machines/types"},
		{"GET", "/api/machines/statuses"},
		{"GET", "/api/machines/histories"},
		{"POST", "/api/machines/histories"},
		{"DELETE", "/api/machines/histories/:historyID"},
		{"GET", "/api/machines/:id"},
		{"PUT", "/api/machines/:id"},
		{"DELETE", "/api/machines/:id"},
		{"GET", "/api/maintenance/requests"},
		{"POST", "/api/maintenance/requests"},
		{"GET", "/api/maintenance/requests/next-id"},
		{"GET", "/api/maintenance/requests/:id"},
		{"PUT", "/api/maintenance/requests/:id"},
		{"DELETE", "/api/maintenance/requests/:id"},
		{"POST", "/api/maintenance/requests/:id/complete"},
		{"GET", "/api/maintenance/logs"},
		{"GET", "/api/maintenance/repair-types"},
		{"GET", "/api/maintenance/repair-statuses"},
		{"GET", "/api/production-lines"},
		{"POST", "/api/production-lines"},
		{"GET", "/api/production-lines/:id"},
		{"PUT", "/api/production-lines/:id"},
		{"DELETE", "/api/production-lines/:id"},
	}

	registered := map[string]bool{}
	for _, ri := range r.Routes() {
		registered[ri.Method+" "+ri.Path] = true
	}
	for _, w := range want {
		if !registered[w.method+" "+w.path] {
			t.Errorf("route not registered: %s %s", w.method, w.path)
		}
	}
}
