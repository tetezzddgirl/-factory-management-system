package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type IssueHandler struct {
	db *gorm.DB
}

func NewIssueHandler(db *gorm.DB) *IssueHandler {
	return &IssueHandler{db: db}
}

func (h *IssueHandler) ListIssues(c *gin.Context) {
	out := []models.Issue{}
	if err := h.db.Order("timestamp DESC").Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *IssueHandler) CreateIssue(c *gin.Context) {
	var iss models.Issue
	if err := c.ShouldBindJSON(&iss); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}

	if iss.IssueID == "" {
		iss.IssueID = fmt.Sprintf("ISS-%d", time.Now().UnixNano())
	}
	if iss.Status == "" {
		iss.Status = "รอแก้ไข"
	}
	if iss.Timestamp.IsZero() {
		iss.Timestamp = time.Now()
	}
	if err := h.db.Create(&iss).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := CreateNotification(h.db, "planner",
		fmt.Sprintf("แจ้งปัญหาใหม่: %s", iss.Issue),
		iss.Description,
		"warning",
		iss.IssueID,
	); err != nil {
		fmt.Println("⚠️ สร้างการแจ้งเตือนไม่สำเร็จ:", err) 
	}
	c.JSON(http.StatusOK, iss)
}

func (h *IssueHandler) UpdateIssue(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		SolutionProviderID string `json:"solution_provider_id"`
		Solutions           string `json:"solutions"`
		Status              string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if err := h.db.Model(&models.Issue{}).Where("issue_id = ?", id).
		Updates(map[string]any{
			"solution_provider_id": body.SolutionProviderID,
			"solutions":            body.Solutions,
			"status":               body.Status,
		}).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
