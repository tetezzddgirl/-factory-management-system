package handlers

import (
	"fmt"

	"factoryflow/models"

	"gorm.io/gorm"
)


func resolveRefFormula(db *gorm.DB, productID, formulaID string) (string, error) {
	if productID == "" && formulaID == "" {
		return "", nil
	}
	var existing models.RefFormula
	err := db.Where("product_id = ? AND formula_id = ?", productID, formulaID).
		First(&existing).Error
	if err == nil {
		return existing.RefFormulaID, nil
	}
	if err != gorm.ErrRecordNotFound {
		return "", err
	}
	refFormulaID := fmt.Sprintf("REFFormula-%s-%s", productID, formulaID)
	rb := models.RefFormula{RefFormulaID: refFormulaID, ProductID: productID, FormulaID: formulaID}
	if err := db.Create(&rb).Error; err != nil {
		return "", err
	}
	return rb.RefFormulaID, nil
}

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
