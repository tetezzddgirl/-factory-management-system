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
	if err := db.AutoMigrate(
		// ผู้ใช้งาน / auth
		&models.User{},

		// ฝ่ายผลิต (Production)
		&models.Machine{},
		&models.ProductionLine{},
		&models.Product{},
		&models.FormulaItem{},
		&models.FormulaStep{},
		&models.RefFormula{},
		&models.ProductionPlan{},
		&models.ProductionOrder{},
		&models.Resources{},
		&models.Work{},
		&models.Issue{},
		&models.FinishedGoods{},

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

		// ฝ่ายผลิต (Production)
		&models.ProductionStatusHistory{},
		&models.ProductionEvent{},
		&models.ProductionReport{},
		&models.TransferRecord{},

		// ฝ่ายควบคุมคุณภาพ (Quality)
		&models.InspectionPoint{},
		&models.InspectionParameter{},
		&models.InspectionRequirement{},
		&models.Inspection{},
		&models.InspectionItem{},
		&models.CorrectionRecord{},

		// ── FactoryFlow foundation (FRESH-03) — ADDITIVE ─────────────────────
		// Five ported FactoryFlow tables for a later Personnel / User-account /
		// Task capability. Added to the SAME AutoMigrate call so Friend's flow
		// is unchanged; the FactoryFlow-specific machinery (id generators, CHECK
		// constraints, FKs among these five, triggers, the email-history
		// recorder) is applied additively by ensureFactoryFlowSchema below.
		// GORM creates the bare tables; it never drops or renames anything.
		&models.Employee{},
		&models.UserAccount{},
		&models.Task{},
		&models.TaskAssignment{},
		&models.EmployeeEmailHistory{},
	); err != nil {
		return err
	}

	if err := db.Exec(`ALTER TABLE raw_material_records DROP COLUMN IF EXISTS rm_id`).Error; err != nil {
		return err
	}
	if err := db.Exec(`ALTER TABLE work_in_process_records DROP COLUMN IF EXISTS wip_id`).Error; err != nil {
		return err
	}

	// FRESH-03 — finish the FactoryFlow foundation tables with the DDL GORM
	// AutoMigrate cannot express (idempotent; touches only the five tables
	// above; never references a Friend table). See database/factoryflow_schema.go.
	if err := ensureFactoryFlowSchema(db); err != nil {
		return err
	}

	return nil
}
