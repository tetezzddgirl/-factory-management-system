package handlers

import (
	"fmt"

	"factoryflow/models"

	"gorm.io/gorm"
)

// resolveRefFormula หาแถว RefFormula ที่ตรงกับคู่ (productID, formulaID) นี้ ถ้ายังไม่มีก็สร้างใหม่ให้
// คืนค่า refFormulaID ที่ ProductionPlan/ProductionOrder เอาไปเก็บเป็น FK แทนการเก็บ productID/formulaID ตรงๆ
// ถ้าไม่ได้เลือก product/formula เลย จะคืนค่าว่างเฉยๆ ไม่ถือเป็น error
func resolveRefFormula(db *gorm.DB, productID, formulaID string) (string, error) {
	if productID == "" && formulaID == "" {
		return "", nil
	}
	var existing models.RefFormula
	err := db.Where("product_id = ? AND formula_id = ?", productID, formulaID).
		First(&existing).Error
	if err == nil {
		// มีอยู่แล้ว ใช้ตัวเดิม ไม่ต้องสร้างซ้ำ
		return existing.RefFormulaID, nil
	}
	if err != gorm.ErrRecordNotFound {
		return "", err
	}
	// หาไม่เจอจริงๆ ค่อยสร้างใหม่
	refFormulaID := fmt.Sprintf("REFFormula-%s-%s", productID, formulaID)
	rb := models.RefFormula{RefFormulaID: refFormulaID, ProductID: productID, FormulaID: formulaID}
	if err := db.Create(&rb).Error; err != nil {
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

// refFormulaMap ดึงแถว RefFormula ของ refFormulaID ทั้งหมดที่ระบุ คืนเป็น map[refFormulaID]RefFormula ไว้ join กลับเข้า response
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
