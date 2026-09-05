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

	if db.Migrator().HasTable("w_ip_locations") {
		if err := db.Exec(`ALTER TABLE work_in_process_records DROP CONSTRAINT IF EXISTS fk_w_ip_locations_records`).Error; err != nil {
			return err
		}
		if err := db.Migrator().DropTable("w_ip_locations"); err != nil {
			return err
		}
	}

	// เก็บกวาดสคีมาเก่าของ production_lines — เช็ค HasTable ก่อนเหมือน w_ip_locations ด้านบน
	if db.Migrator().HasTable("production_lines") {
		if err := db.Exec(`ALTER TABLE production_lines DROP CONSTRAINT IF EXISTS production_lines_pkey`).Error; err != nil {
			return err
		}
		if err := db.Exec(`ALTER TABLE production_lines DROP COLUMN IF EXISTS id`).Error; err != nil {
			return err
		}
		if err := db.Exec(`ALTER TABLE production_lines DROP COLUMN IF EXISTS name`).Error; err != nil {
			return err
		}
		if err := db.Exec(`ALTER TABLE production_lines DROP COLUMN IF EXISTS status`).Error; err != nil {
			return err
		}
	}

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

		// การแจ้งเตือน (์Notification)
		&models.Notification{},
		
	); err != nil {
		return err
	}

	// ตอนนี้ AutoMigrate สร้างคอลัมน์ production_line_id ให้แล้วแน่นอน ค่อยตั้ง PK
	if err := db.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'production_lines_pkey'
			) THEN
				ALTER TABLE production_lines ADD PRIMARY KEY (production_line_id);
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`ALTER TABLE raw_material_records DROP COLUMN IF EXISTS rm_id`).Error; err != nil {
		return err
	}
	if err := db.Exec(`ALTER TABLE work_in_process_records DROP COLUMN IF EXISTS wip_id`).Error; err != nil {
		return err
	}
	if err := db.Exec(`ALTER TABLE production_orders DROP COLUMN IF EXISTS machines`).Error; err != nil {
		return err
	}
	db.Exec(`ALTER TABLE production_orders DROP COLUMN IF EXISTS machines`)

	return nil
}
