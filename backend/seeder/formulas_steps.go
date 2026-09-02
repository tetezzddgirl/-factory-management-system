package main

import (
	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedFormulaSteps ใส่ขั้นตอนการผลิตตัวอย่างของแต่ละสูตร (BOM) — เรียงลำดับด้วย StepNo
// (ขั้นตอนเป็นตัวอย่างสำหรับสาธิตระบบเท่านั้น ไม่ใช่ขั้นตอนจริงของโรงงาน)
// ล้างของเดิมแล้วใส่ใหม่ทุกครั้งที่ seed เหมือนกับ SeedFormulas เพราะใช้ autoincrement id
func SeedFormulaSteps(db *gorm.DB) {
	db.Exec("DELETE FROM formula_steps")

	steps := []models.FormulaStep{
		// BOM-001: ขวด PET 500ml
		{FormulaID: "FOR-001", StepNo: 1, StepName: "เตรียมเม็ดพลาสติก", Description: "ชั่งเม็ดพลาสติก PET ตามสูตร อบไล่ความชื้นก่อนเข้าเครื่องฉีด", Machine: "เครื่องอบเม็ดพลาสติก D-01", DurationMinutes: 30},
		{FormulaID: "FOR-001", StepNo: 2, StepName: "ฉีดพรีฟอร์ม", Description: "ฉีดเม็ดพลาสติกขึ้นรูปเป็นพรีฟอร์ม (preform)", Machine: "เครื่องฉีดพรีฟอร์ม M-01", DurationMinutes: 45},
		{FormulaID: "FOR-001", StepNo: 3, StepName: "เป่าขึ้นรูปขวด", Description: "เป่าพรีฟอร์มขึ้นรูปเป็นขวดตามแบบ", Machine: "เครื่องเป่าขวด M-02", DurationMinutes: 40},
		{FormulaID: "FOR-001", StepNo: 4, StepName: "ติดฉลากและปิดฝา", Description: "ติดฉลากรอบขวด ปิดฝาเกลียวให้แน่น", Machine: "สายการบรรจุ L-02", DurationMinutes: 25},
		{FormulaID: "FOR-001", StepNo: 5, StepName: "ตรวจสอบคุณภาพและบรรจุ", Description: "ตรวจนับ ตรวจสอบตำหนิ แล้วบรรจุลงลัง", Machine: "-", DurationMinutes: 20},

		// BOM-002: ขวด PET 1L
		{FormulaID: "FOR-002", StepNo: 1, StepName: "เตรียมเม็ดพลาสติก", Description: "ชั่งเม็ดพลาสติก PET ตามสูตร อบไล่ความชื้นก่อนเข้าเครื่องฉีด", Machine: "เครื่องอบเม็ดพลาสติก D-01", DurationMinutes: 35},
		{FormulaID: "FOR-002", StepNo: 2, StepName: "ฉีดพรีฟอร์ม", Description: "ฉีดเม็ดพลาสติกขึ้นรูปเป็นพรีฟอร์มขนาด 1L", Machine: "เครื่องฉีดพรีฟอร์ม M-01", DurationMinutes: 50},
		{FormulaID: "FOR-002", StepNo: 3, StepName: "เป่าขึ้นรูปขวด", Description: "เป่าพรีฟอร์มขึ้นรูปเป็นขวดขนาด 1 ลิตร", Machine: "เครื่องเป่าขวด M-02", DurationMinutes: 45},
		{FormulaID: "FOR-002", StepNo: 4, StepName: "ติดฉลากและปิดฝา", Description: "ติดฉลากรอบขวด ปิดฝาเกลียวให้แน่น", Machine: "สายการบรรจุ L-02", DurationMinutes: 30},
		{FormulaID: "FOR-002", StepNo: 5, StepName: "ตรวจสอบคุณภาพและบรรจุ", Description: "ตรวจนับ ตรวจสอบตำหนิ แล้วบรรจุลงลัง", Machine: "-", DurationMinutes: 20},

		// BOM-003: ฝาเกลียว
		{FormulaID: "FOR-003", StepNo: 1, StepName: "เตรียมเม็ดพลาสติก HDPE", Description: "ชั่งเม็ดพลาสติกสำหรับฝาเกลียวตามสูตร", Machine: "เครื่องอบเม็ดพลาสติก D-01", DurationMinutes: 15},
		{FormulaID: "FOR-003", StepNo: 2, StepName: "ฉีดขึ้นรูปฝา", Description: "ฉีดขึ้นรูปฝาเกลียวด้วยแม่พิมพ์", Machine: "เครื่องฉีดฝา M-04", DurationMinutes: 20},
		{FormulaID: "FOR-003", StepNo: 3, StepName: "ตรวจสอบและบรรจุ", Description: "ตรวจสอบรอยตำหนิ คัดแยก แล้วบรรจุถุง", Machine: "-", DurationMinutes: 15},

		// BOM-004: ขวด HDPE
		{FormulaID: "FOR-004", StepNo: 1, StepName: "เตรียมเม็ดพลาสติก HDPE", Description: "ชั่งเม็ดพลาสติก HDPE ตามสูตร", Machine: "เครื่องอบเม็ดพลาสติก D-01", DurationMinutes: 25},
		{FormulaID: "FOR-004", StepNo: 2, StepName: "เป่าขึ้นรูปขวด", Description: "เป่าขึ้นรูปขวด HDPE โดยตรง (extrusion blow molding)", Machine: "เครื่องเป่าขวด M-03", DurationMinutes: 40},
		{FormulaID: "FOR-004", StepNo: 3, StepName: "ติดฉลากและปิดฝา", Description: "ติดฉลากรอบขวด ปิดฝาเกลียวให้แน่น", Machine: "สายการบรรจุ L-02", DurationMinutes: 25},
		{FormulaID: "FOR-004", StepNo: 4, StepName: "ตรวจสอบคุณภาพและบรรจุ", Description: "ตรวจนับ ตรวจสอบตำหนิ แล้วบรรจุลงลัง", Machine: "-", DurationMinutes: 20},
	}

	if err := db.Create(&steps).Error; err != nil {
		panic("seed ตาราง formula_steps ไม่สำเร็จ: " + err.Error())
	}
}
