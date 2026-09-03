package handlers

import (
	"fmt"

	"gorm.io/gorm"
)

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