package models

import (
	"time"

	"gorm.io/gorm"
)

// ─────────────────────────────────────────────────────────────────────────────
// โดเมน "เครื่องจักรและการซ่อมบำรุง" (Machinery & Maintenance)
//
// พอร์ตมาจากระบบ Machinery-maintenance (backend/internal/models) แล้วปรับให้เข้ากับ
// โครงสร้างของ FactoryFlow:
//   - สายการผลิตใช้ models.ProductionLine เดิมของ FactoryFlow (ตาราง production_lines)
//     แทนตาราง productionlines ของระบบเดิม จะได้มีสายการผลิตชุดเดียวทั้งระบบ
//   - Machinery.WorkID เก็บรหัสงาน (เช่น "WO-2400") เป็น text ธรรมดา ไม่ผูก FK
//     เหมือน tasks.machine_id ของ FactoryFlow (ดู models/task.go) เพื่อไม่ให้เกิด
//     FK ข้ามโดเมนกับตาราง works ที่ฝ่ายวางแผนเป็นเจ้าของ
//   - ตาราง machines เดิม (models.Machine) ถูกแทนที่ด้วย Machinery ทั้งหมด
// ─────────────────────────────────────────────────────────────────────────────

// TypeofMachinery คือประเภทของเครื่องจักร (เครื่องจักรกล / เครื่องลำเลียง / เครื่องบรรจุ ...)
type TypeofMachinery struct {
	CreatedAt time.Time      `json:"-"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TypeID   uint   `json:"type_id" gorm:"column:type_id;primaryKey"`
	TypeName string `json:"type_name" gorm:"size:100;not null"`
}

// MachineStatus คือสถานะการใช้งานของเครื่องจักร (running / idle / maintenance / down)
type MachineStatus struct {
	CreatedAt time.Time      `json:"-"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	StatusID   string `json:"status_id" gorm:"column:status_id;size:100;primaryKey"`
	StatusName string `json:"status_name" gorm:"size:100;not null"`
}

func (MachineStatus) TableName() string { return "machine_statuses" }

// RepairStatus คือสถานะของใบแจ้งซ่อม (pending / in_progress / done)
type RepairStatus struct {
	CreatedAt time.Time      `json:"-"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	RepairStatusID string `json:"repair_status_id" gorm:"column:repair_status_id;size:100;primaryKey"`
	StatusName     string `json:"status_name" gorm:"size:100;not null"`
}

// TypeofRepair คือประเภทงานซ่อม — PM (ตามแผน) / CM (ซ่อมเมื่อเสีย)
type TypeofRepair struct {
	RepairTypeID   string `json:"repair_type_id" gorm:"column:repair_type_id;size:10;primaryKey"`
	RepairTypeName string `json:"repair_type_name" gorm:"size:100;not null"`
}

// Machinery คือเครื่องจักร/อุปกรณ์ในโรงงาน (แทนที่ models.Machine เดิม)
type Machinery struct {
	CreatedAt time.Time      `json:"-"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	MachineryID  string  `json:"machinery_id" gorm:"column:machinery_id;size:100;primaryKey"`
	MachineName  string  `json:"machinename" gorm:"column:machine_name;size:100;not null"`
	Description  string  `json:"description" gorm:"size:255"`
	Staff        string  `json:"staff" gorm:"size:100"`
	OwnerRole    string  `json:"owner_role" gorm:"size:100"`
	WorkingHours float64 `json:"working_hours" gorm:"not null;default:0"`

	// สายการผลิตที่เครื่องนี้อยู่ + ลำดับการผลิตในสายนั้น (nil = ยังไม่ถูกจัดเข้าสาย)
	ProductionLineID *uint   `json:"production_line_id" gorm:"column:production_line_id;index"`
	LineOrder        float64 `json:"line_order" gorm:"not null;default:0"`

	// รหัสงานปัจจุบันของเครื่อง (text ธรรมดา ไม่มี FK — ดูหมายเหตุหัวไฟล์)
	WorkID *string `json:"work_id" gorm:"column:work_id;size:100;index"`

	TypeID         *uint   `json:"type_id" gorm:"column:type_id;index"`
	StatusID       *string `json:"status_id" gorm:"column:status_id;size:100;index"`
	RepairStatusID *string `json:"repair_status_id" gorm:"column:repair_status_id;size:100;index"`

	ProductionLine *ProductionLine  `json:"production_line,omitempty" gorm:"foreignKey:ProductionLineID;references:ProductionlineID;constraint:-"`
	Type           *TypeofMachinery `json:"type,omitempty" gorm:"foreignKey:TypeID;references:TypeID;constraint:-"`
	Status         *MachineStatus   `json:"status,omitempty" gorm:"foreignKey:StatusID;references:StatusID;constraint:-"`
	RepairStatus   *RepairStatus    `json:"repair_status,omitempty" gorm:"foreignKey:RepairStatusID;references:RepairStatusID;constraint:-"`
}

// MachineRepairRequest คือใบแจ้งซ่อม/ใบงานบำรุงรักษาหนึ่งใบ
type MachineRepairRequest struct {
	RequestID   string     `json:"request_id" gorm:"column:request_id;size:100;primaryKey"`
	MachineName string     `json:"machinename" gorm:"column:machine_name;size:100"`
	Description string     `json:"description" gorm:"size:255"`
	Staff       string     `json:"staff" gorm:"size:100"`
	RepairDate  *time.Time `json:"repair_date" gorm:"column:repair_date"`
	FinishedAt  *time.Time `json:"finished_at" gorm:"column:finished_at"`

	MachineryID    *string `json:"machinery_id" gorm:"column:machinery_id;size:100;index"`
	RepairTypeID   *string `json:"repair_type_id" gorm:"column:repair_type_id;size:10;index"`
	RepairStatusID *string `json:"repair_status_id" gorm:"column:repair_status_id;size:100;index"`

	Machinery    *Machinery    `json:"machinery,omitempty" gorm:"foreignKey:MachineryID;references:MachineryID;constraint:-"`
	RepairType   *TypeofRepair `json:"repair_type,omitempty" gorm:"foreignKey:RepairTypeID;references:RepairTypeID;constraint:-"`
	RepairStatus *RepairStatus `json:"repair_status,omitempty" gorm:"foreignKey:RepairStatusID;references:RepairStatusID;constraint:-"`
}

// MaintenanceLog คือประวัติการซ่อมบำรุง — ถูกสร้างอัตโนมัติตอนปิดงานซ่อม
type MaintenanceLog struct {
	LogID       string    `json:"log_id" gorm:"column:log_id;size:100;primaryKey"`
	Description string    `json:"description" gorm:"size:255"`
	Staff       string    `json:"staff" gorm:"size:100"`
	RepairDate  time.Time `json:"repair_date" gorm:"column:repair_date"`
	TotalCost   float64   `json:"total_cost" gorm:"column:total_cost"`

	RequestID   *string `json:"request_id" gorm:"column:request_id;size:100;index"`
	MachineryID *string `json:"machinery_id" gorm:"column:machinery_id;size:100;index"`

	MachineRepairRequest *MachineRepairRequest `json:"machine_repair_request,omitempty" gorm:"foreignKey:RequestID;references:RequestID;constraint:-"`
	Machinery            *Machinery            `json:"machinery,omitempty" gorm:"foreignKey:MachineryID;references:MachineryID;constraint:-"`
}

// MachineWorkHistory คือประวัติการทำงานของเครื่องจักร (งานที่เครื่องนี้ทำเสร็จไปแล้ว)
type MachineWorkHistory struct {
	HistoryID   string    `json:"history_id" gorm:"column:history_id;size:100;primaryKey"`
	Description string    `json:"description" gorm:"size:255"`
	JobCode     string    `json:"job_code" gorm:"column:job_code;size:100"`
	Staff       string    `json:"staff" gorm:"size:100"`
	Date        time.Time `json:"date"`

	MachineryID *string `json:"machinery_id" gorm:"column:machinery_id;size:100;index"`

	Machinery *Machinery `json:"machinery,omitempty" gorm:"foreignKey:MachineryID;references:MachineryID;constraint:-"`
}

func (MachineWorkHistory) TableName() string { return "machine_work_histories" }
