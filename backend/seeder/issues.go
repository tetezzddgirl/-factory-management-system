package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedIssues ใส่ปัญหาการผลิตตัวอย่าง (ครบทั้ง 3 สถานะ: รอแก้ไข / กำลังแก้ไข / แก้ไขแล้ว)
// หมายเหตุ: ต้องรันหลัง SeedWorkOrders เสมอ เพราะ OrderID ที่อ้างถึงต้องมีอยู่ในตาราง work_orders ก่อน
func SeedIssues(db *gorm.DB) {
	now := time.Now()

	upsert(db, "issue_id", []models.Issue{
		{Timestamp: now.Add(-6 * time.Hour), IssueID: "ISS-001", ReporterID: "PSN-001", Issue: "เครื่องจักรหยุดกลางคัน", Description: "เครื่อง M-01 หยุดทำงานกะทันหันช่วงเที่ยง", SolutionProviderID: "PSN-005", Solutions: "รีสตาร์ทเครื่องและตรวจสอบเซนเซอร์เรียบร้อยแล้ว", Status: "แก้ไขแล้ว", OrderID: "WO-20250702-001"},
		{Timestamp: now.Add(-3 * time.Hour), IssueID: "ISS-002", ReporterID: "PSN-002", Issue: "ฉลากติดเบี้ยว", Description: "พบขวดติดฉลากเบี้ยวประมาณ 5% ของล็อตการผลิต", Status: "กำลังแก้ไข", OrderID: "WO-20250703-001"},
		{Timestamp: now.Add(-1 * time.Hour), IssueID: "ISS-003", ReporterID: "PSN-004", Issue: "วัตถุดิบไม่พอ", Description: "ฝาพลาสติก HDPE เหลือน้อยกว่าที่ใบสั่งผลิตต้องการ", Status: "รอแก้ไข", OrderID: "WO-20250701-001"},
	})
}
