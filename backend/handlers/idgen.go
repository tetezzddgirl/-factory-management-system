package handlers

import (
	"fmt"

	"gorm.io/gorm"
)

// nextSeqID สร้างรหัสรูปแบบ PREFIX-datePart-NNN
// ไล่เลข NNN (เริ่มที่ 1) จนกว่าจะไม่ชนกับ record ที่มีอยู่แล้วในคอลัมน์ที่ระบุ
//   - model:    pointer ไปยัง struct ปลายทาง เช่น &models.ProductionOrder{}
//   - column:   ชื่อคอลัมน์ (snake_case ใน DB) เช่น "order_id", "plan_id"
//   - prefix:   เช่น "WO", "PLAN", "PLT", "LOT"
//   - datePart: ส่วนวันที่ที่ format มาแล้วจากฝั่งเรียก เช่น "260902" หรือ "2026-09-02"
//   - width:    จำนวนหลักของ NNN เช่น 3 => 001, 002, ...
func nextSeqID(db *gorm.DB, model interface{}, column, prefix, datePart string, width int) (string, error) {
	base := fmt.Sprintf("%s-%s-", prefix, datePart)
	for seq := 1; seq <= 999; seq++ {
		candidate := fmt.Sprintf("%s%0*d", base, width, seq)
		var count int64
		if err := db.Model(model).Where(column+" = ?", candidate).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("nextSeqID: exhausted sequence for %s", base)
}