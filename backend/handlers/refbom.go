package handlers

import (
	"fmt"

	"factoryflow/models"

	"gorm.io/gorm"
)

// resolveRefBOM หาแถว RefBOM ที่ตรงกับคู่ (productID, bomID) นี้ ถ้ายังไม่มีก็สร้างใหม่ให้
// คืนค่า refBomID ที่ ProductionPlan/ProductionOrder เอาไปเก็บเป็น FK แทนการเก็บ productID/bomID ตรงๆ
// ถ้าไม่ได้เลือก product/bom เลย (แผนเก่า หรือยังไม่ได้เลือกตอนสร้าง) จะคืนค่าว่างเฉยๆ ไม่ถือเป็น error
func resolveRefFormula(db *gorm.DB, productID, formulaID string) (string, error) {
	if productID == "" && formulaID == "" {
		return "", nil
	}
	refFormulaID := fmt.Sprintf("REFFormula-%s-%s", productID, formulaID)
	rb := models.RefFormula{RefFormulaID: refFormulaID, ProductID: productID, FormulaID: formulaID}
	// FirstOrCreate ด้วย refBomID ที่ deterministic จากคู่ product+bom เอง — ถ้ามีแถวนี้อยู่แล้วใช้ของเดิม
	// เผื่อกรณีมีคนสร้างแผน/ใบสั่งผลิตอีกใบด้วย product+bom คู่เดียวกัน จะได้ refBomID เดียวกัน ไม่สร้างซ้ำ
	if err := db.Where(models.RefFormula{RefFormulaID: refFormulaID}).FirstOrCreate(&rb).Error; err != nil {
		return "", err
	}
	return rb.RefFormulaID, nil
}

// dedupeNonEmpty คัดเฉพาะค่าที่ไม่ซ้ำและไม่ว่างออกมาจาก slice ของ id
func dedupeNonEmpty(ids []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

// refBOMMap ดึงแถว RefBOM ของ refBomID ทั้งหมดที่ระบุ คืนเป็น map[refBomID]RefBOM ไว้ join กลับเข้า response
func refFormulaMap(db *gorm.DB, refFormulaIDs []string) (map[string]models.RefFormula, error) {
	out := map[string]models.RefFormula{}
	ids := dedupeNonEmpty(refFormulaIDs)
	if len(ids) == 0 {
		return out, nil
	}
	var rows []models.RefFormula
	if err := db.Where("ref_formula_id IN ?", ids).Find(&rows).Error; err != nil {
		return nil, err
	}
	for _, r := range rows {
		out[r.RefFormulaID] = r
	}
	return out, nil
}
