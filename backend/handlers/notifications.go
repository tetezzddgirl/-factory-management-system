package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	db *gorm.DB
}

func NewNotificationHandler(db *gorm.DB) *NotificationHandler {
	return &NotificationHandler{db: db}
}

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

func (h *NotificationHandler) MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Model(&models.Notification{}).Where("notification_id = ?", id).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

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