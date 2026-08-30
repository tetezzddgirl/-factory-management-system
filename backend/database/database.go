package database

import (
	"fmt"

	"factoryflow/config"
	"factoryflow/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect เปิดการเชื่อมต่อ PostgreSQL ผ่าน GORM จากค่าใน config
func Connect(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Bangkok",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort,
	)
	return gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
}

// Migrate สร้าง/อัปเดตตารางที่จำเป็นด้วย GORM AutoMigrate
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		// ผู้ใช้งาน / auth
		&models.User{},

		// ฝ่ายผลิต (Production)
		&models.Machine{},
		&models.ProductionLine{},
		&models.Product{},
		&models.FormulaItem{},
		&models.FormulaStep{},
		&models.RefBOM{},
		&models.ProductionPlan{},
		&models.ProductionOrder{},
		&models.Resources{},
		&models.Work{},
		&models.Issue{},

		// บุคลากร (Personnel)
		&models.Personnel{},

		// ฝ่ายคลังสินค้า (Warehouse & Inventory)
		&models.RawMaterial{},
		&models.RawMaterialLocation{},
		&models.RawMaterialRecord{},
		&models.WorkInProcess{},
		&models.WIPLocation{},
		&models.WorkInProcessRecord{},
		&models.RequisitionSlip{},
	)
}
