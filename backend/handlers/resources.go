package handlers

import (
	"fmt"
	"net/http"
	"time"

	"factoryflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ResourceHandler รวม dependency ของ endpoint บันทึกผลการ "ตรวจสอบทรัพยากร" ของใบสั่งผลิตแต่ละครั้ง
// (ก่อนหน้านี้ตาราง resources มีอยู่ใน DB จาก AutoMigrate แต่ไม่มี handler ผูกอยู่เลย —
// ผลตรวจสอบทรัพยากรที่หน้า planning/work-orders คำนวณจึงไม่เคยถูกบันทึกลง DB จริง)
type ResourceHandler struct {
	db *gorm.DB
}

// NewResourceHandler สร้าง ResourceHandler ตัวใหม่
func NewResourceHandler(db *gorm.DB) *ResourceHandler {
	return &ResourceHandler{db: db}
}

// ListResourceChecks คืนประวัติผลตรวจสอบทรัพยากรของใบสั่งผลิตหนึ่งใบ (?orderID=WO-xxxx) เรียงล่าสุดก่อน
// ไม่ใส่ orderID มา จะคืนทั้งหมด (เรียงล่าสุดก่อนเหมือนกัน) ไว้ใช้ตรวจสอบ/debug
func (h *ResourceHandler) ListResourceChecks(c *gin.Context) {
	orderID := c.Query("orderID")
	q := h.db.Order("timestamp DESC")
	if orderID != "" {
		q = q.Where("order_id = ?", orderID)
	}
	out := []models.Resources{}
	if err := q.Find(&out).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

// CreateResourceChecks บันทึกผลตรวจสอบทรัพยากรของ "รอบตรวจ" หนึ่งรอบ — รับเป็น array เพราะ
// การตรวจ 1 รอบมีได้หลายวัตถุดิบ (1 แถวต่อวัตถุดิบ 1 ตัว) โดยทุกแถวของรอบเดียวกันแชร์
// machineStatus/workerStatus/orderID ก้อนเดียวกัน (สถานะรวมของเครื่องจักร/บุคลากรของรอบนั้น)
// เรียกจากหน้า planning/work-orders ทุกครั้งที่กด "ตรวจสอบ" หรือ "ตรวจใหม่"
func (h *ResourceHandler) CreateResourceChecks(c *gin.Context) {
	var in []models.Resources
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad json"})
		return
	}
	if len(in) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "empty resource check"})
		return
	}

	now := time.Now()
	for i := range in {
		if in[i].ResourceID == "" {
			in[i].ResourceID = fmt.Sprintf("RES-%d-%d", now.UnixNano(), i)
		}
		if in[i].Timestamp.IsZero() {
			in[i].Timestamp = now
		}
		if in[i].OrderID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "orderID is required on every row"})
			return
		}
	}

	if err := h.db.Create(&in).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, in)
}
