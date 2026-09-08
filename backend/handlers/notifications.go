package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// NotificationHandler รวม dependency ของ endpoint ฝั่งการแจ้งเตือน (Notifications)
type NotificationHandler struct {
	db *gorm.DB
}

// NewNotificationHandler สร้าง NotificationHandler ตัวใหม่
func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

// ListNotifications คืนการแจ้งเตือนของ role ที่ระบุ เรียงล่าสุดก่อน (limit 50)
// query param: role (เช่น ?role=planner) ถ้าไม่ส่งมาจะคืนทั้งหมด
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	role := c.Query("role")
	out := []models.Notification{}
	q := h.db.Order("created_at DESC").Limit(50)
	if role != "" {
		q = q.Where("recipient_role = ?", role)
	}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// MarkNotificationRead ทำเครื่องหมายว่าอ่านแล้วตาม notificationID
// (path param: /api/notifications/:id/read)
func (h *NotificationHandler) MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Model(&models.Notification{}).Where("notification_id = ?", id).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// MarkAllNotificationsRead ทำเครื่องหมายว่าอ่านแล้วทั้งหมดของ role ที่ระบุ
// (query param: role)
func (h *NotificationHandler) MarkAllNotificationsRead(c *gin.Context) {
	role := c.Query("role")
	q := h.db.Model(&models.Notification{})
	if role != "" {
		q = q.Where("recipient_role = ?", role)
	}
	if err := q.Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// CreateNotification เป็น helper กลาง ให้ handler อื่น (Issue, Wip ฯลฯ) เรียกใช้ตอนต้องการ
// ยิงแจ้งเตือนไปหา role ปลายทาง โดยไม่ต้องรู้จัก NotificationHandler โดยตรง
// (อยู่ package handlers เดียวกัน จึงเรียกใช้ตรงๆ ได้เลย)
func CreateNotification(db *gorm.DB, role, title, description, typ, refID string) error {
	n := models.Notification{
		NotificationID: fmt.Sprintf("NTF-%d", time.Now().UnixNano()),
		RecipientRole:  role,
		Title:          title,
		Description:    description,
		Type:           typ,
		RefID:          refID,
		IsRead:         false,
		CreatedAt:      time.Now(),
	}
	return db.Create(&n).Error
}