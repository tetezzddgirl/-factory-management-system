package main

import (
	"time"

	"factoryflow/models"

	"gorm.io/gorm"
)

// SeedMachines ใส่ข้อมูลตัวอย่างของโดเมน "เครื่องจักรและการซ่อมบำรุง"
// (ข้อมูลชุดเดียวกับ seeder ของระบบ Machinery-maintenance แต่ผูกกับสายการผลิตของ FactoryFlow)
//
// ต้องเรียก "หลัง" SeedProductionLines เพราะเครื่องจักรอ้างอิง production_line_id
func SeedMachines(db *gorm.DB) {
	seedMachineMasterData(db)

	// type: 1=เครื่องจักรกล 2=เครื่องลำเลียง 3=เครื่องบรรจุ
	// line: 1=สายการเป่าขวด L-01  2=สายการบรรจุ L-02  3=สายการฉีด L-03 (ดู production_lines.go)
	upsert(db, "machinery_id", []models.Machinery{
		machinery(seedMachine{
			ID: "M-01", Name: "เครื่องฉีดขึ้นรูป A", Description: "ฉีดพลาสติกที่บดอัดและละลายแล้วเข้าสู่แม่พิมพ์",
			Staff: "นายใจดี มีสุข", OwnerRole: "เจ้าหน้าที่ฝ่ายผลิต", Hours: 1284,
			Status: "running", RepairStatus: "done", TypeID: 1, LineID: 3, LineOrder: 1, WorkID: "WO-2400",
		}),
		machinery(seedMachine{
			ID: "M-02", Name: "เครื่องเป่าขึ้นรูปขวด B", Description: "เครื่องเป่าขึ้นรูปขวดพลาสติก",
			Staff: "นายสมชาย ใจเย็น", OwnerRole: "เจ้าหน้าที่ฝ่ายผลิต", Hours: 942,
			Status: "idle", RepairStatus: "done", TypeID: 1, LineID: 1, LineOrder: 1,
		}),
		machinery(seedMachine{
			ID: "M-03", Name: "เครื่องฉีดขึ้นรูป C", Description: "เครื่องฉีดพลาสติกกำลังสูง",
			Staff: "นางสาวมานี รักงาน", OwnerRole: "เจ้าหน้าที่ฝ่ายผลิต", Hours: 1560,
			Status: "running", RepairStatus: "done", TypeID: 1, LineID: 3, LineOrder: 2, WorkID: "WO-2400",
		}),
		machinery(seedMachine{
			ID: "M-04", Name: "เครื่องติดฉลาก D", Description: "เครื่องติดฉลากอัตโนมัติ",
			Staff: "นายช่างสมศักดิ์", OwnerRole: "เจ้าหน้าที่บำรุงรักษา", Hours: 892,
			Status: "maintenance", RepairStatus: "in_progress", TypeID: 2, LineID: 2, LineOrder: 1,
		}),
		machinery(seedMachine{
			ID: "M-05", Name: "เครื่องขึ้นรูปฝาขวด E", Description: "เครื่องขึ้นรูปฝาขวดเกลียว",
			Staff: "นายวิชัย ตั้งใจ", OwnerRole: "เจ้าหน้าที่ฝ่ายผลิต", Hours: 1102,
			Status: "running", RepairStatus: "done", TypeID: 1, LineID: 3, LineOrder: 3, WorkID: "WO-2400",
		}),
		machinery(seedMachine{
			ID: "M-06", Name: "สายพานบรรจุภัณฑ์ F", Description: "สายพานบรรจุภัณฑ์ปลายทาง",
			Staff: "นายอนันต์ สุขใจ", OwnerRole: "เจ้าหน้าที่ฝ่ายผลิต", Hours: 704,
			Status: "idle", RepairStatus: "pending", TypeID: 3, LineID: 2, LineOrder: 2,
		}),
	})

	seedRepairRequests(db)
	seedMaintenanceLogs(db)
	seedMachineWorkHistories(db)
}

// seedMachineMasterData ใส่ประเภทเครื่องจักร / สถานะเครื่องจักร / สถานะงานซ่อม / ประเภทงานซ่อม
func seedMachineMasterData(db *gorm.DB) {
	upsert(db, "type_id", []models.TypeofMachinery{
		{TypeID: 1, TypeName: "เครื่องจักรกล"},
		{TypeID: 2, TypeName: "เครื่องลำเลียง"},
		{TypeID: 3, TypeName: "เครื่องบรรจุ"},
	})
	// seeder ใส่ type_id ตรงๆ จึงไม่ผ่าน nextval() — ต้องเลื่อน sequence ตามไม่งั้น
	// การเพิ่มประเภทใหม่ผ่าน API จะไปชนกับแถวที่ seed ไว้
	resyncSequence(db, "typeof_machineries", "type_id")

	upsert(db, "status_id", []models.MachineStatus{
		{StatusID: "running", StatusName: "ทำงาน"},
		{StatusID: "idle", StatusName: "ว่าง"},
		{StatusID: "maintenance", StatusName: "บำรุงรักษา"},
		{StatusID: "down", StatusName: "เสีย"},
	})
	upsert(db, "repair_status_id", []models.RepairStatus{
		{RepairStatusID: "pending", StatusName: "รอดำเนินการ"},
		{RepairStatusID: "in_progress", StatusName: "กำลังดำเนินการ"},
		{RepairStatusID: "done", StatusName: "เสร็จสิ้น"},
	})
	upsert(db, "repair_type_id", []models.TypeofRepair{
		{RepairTypeID: "PM", RepairTypeName: "Preventive Maintenance"},
		{RepairTypeID: "CM", RepairTypeName: "Corrective Maintenance"},
	})
}

// seedMachine คือค่าตั้งต้นของเครื่องจักรหนึ่งเครื่องแบบระบุชื่อฟิลด์
// ตั้งใจใช้ struct แทนพารามิเตอร์เรียงตำแหน่ง เพราะ typeID/lineID/lineOrder เป็นตัวเลขเหมือนกันหมด
// ถ้าเรียงตามตำแหน่งจะสลับกันได้โดยไม่มีอะไรฟ้อง
type seedMachine struct {
	ID           string
	Name         string
	Description  string
	Staff        string
	OwnerRole    string
	Hours        float64
	Status       string
	RepairStatus string
	TypeID       uint
	LineID       uint
	LineOrder    float64
	WorkID       string
}

// machinery ประกอบร่าง models.Machinery หนึ่งตัวจากค่าตั้งต้นด้านบน
func machinery(s seedMachine) models.Machinery {
	m := models.Machinery{
		MachineryID:      s.ID,
		MachineName:      s.Name,
		Description:      s.Description,
		Staff:            s.Staff,
		OwnerRole:        s.OwnerRole,
		WorkingHours:     s.Hours,
		StatusID:         &s.Status,
		RepairStatusID:   &s.RepairStatus,
		TypeID:           &s.TypeID,
		ProductionLineID: &s.LineID,
		LineOrder:        s.LineOrder,
	}
	if s.WorkID != "" {
		m.WorkID = &s.WorkID
	}
	return m
}

func seedRepairRequests(db *gorm.DB) {
	d := func(s string) *time.Time { t, _ := time.Parse("2006-01-02", s); return &t }
	p := func(s string) *string { return &s }

	upsert(db, "request_id", []models.MachineRepairRequest{
		{RequestID: "MT-1020", MachineName: "เครื่องฉีดขึ้นรูป C", Description: "ฟันเฟืองขบกันจนเครื่องดับ",
			Staff: "ช่างพิชิต", RepairDate: d("2026-06-30"), FinishedAt: d("2026-06-30"),
			MachineryID: p("M-03"), RepairTypeID: p("CM"), RepairStatusID: p("done")},
		{RequestID: "MT-1021", MachineName: "เครื่องขึ้นรูปฝาขวด E", Description: "เครื่องเปิดไม่ติด",
			Staff: "ช่างมานะ", RepairDate: d("2026-07-03"), FinishedAt: d("2026-07-03"),
			MachineryID: p("M-05"), RepairTypeID: p("CM"), RepairStatusID: p("done")},
		{RequestID: "MT-1022", MachineName: "เครื่องเป่าขึ้นรูปขวด B", Description: "สายพานขาด",
			Staff: "ช่างพิชิต", RepairDate: d("2026-07-10"), FinishedAt: d("2026-07-10"),
			MachineryID: p("M-02"), RepairTypeID: p("CM"), RepairStatusID: p("done")},
		{RequestID: "MT-1023", MachineName: "เครื่องฉีดขึ้นรูป A", Description: "ทำความสะอาดท่อส่งพลาสติก",
			Staff: "ช่างสมศักดิ์", RepairDate: d("2026-07-12"), FinishedAt: d("2026-07-12"),
			MachineryID: p("M-01"), RepairTypeID: p("PM"), RepairStatusID: p("done")},
		{RequestID: "MT-1024", MachineName: "เครื่องติดฉลาก D", Description: "หัวฉีดอุดตัน ต้องล้าง",
			Staff: "ช่างสมศักดิ์", RepairDate: d("2026-08-27"),
			MachineryID: p("M-04"), RepairTypeID: p("PM"), RepairStatusID: p("in_progress")},
		{RequestID: "MT-1025", MachineName: "สายพานบรรจุภัณฑ์ F", Description: "เปลี่ยนน้ำมันหล่อลื่นตามรอบ",
			Staff: "ช่างมานะ", RepairDate: d("2026-08-28"),
			MachineryID: p("M-06"), RepairTypeID: p("PM"), RepairStatusID: p("pending")},
		{RequestID: "MT-1026", MachineName: "สายพานบรรจุภัณฑ์ F", Description: "สายพานลำเลียงหลวม",
			Staff: "ช่างพิชิต", RepairDate: d("2026-07-30"),
			MachineryID: p("M-06"), RepairTypeID: p("CM"), RepairStatusID: p("pending")},
	})
}

func seedMaintenanceLogs(db *gorm.DB) {
	d := func(s string) time.Time { t, _ := time.Parse("2006-01-02", s); return t }
	p := func(s string) *string { return &s }

	upsert(db, "log_id", []models.MaintenanceLog{
		{LogID: "LOG-0001", Description: "ทำความสะอาดท่อส่งพลาสติก", Staff: "ช่างสมศักดิ์",
			RepairDate: d("2026-07-12"), TotalCost: 1500, RequestID: p("MT-1023"), MachineryID: p("M-01")},
		{LogID: "LOG-0002", Description: "เปลี่ยนสายพาน", Staff: "ช่างพิชิต",
			RepairDate: d("2026-07-10"), TotalCost: 2800, RequestID: p("MT-1022"), MachineryID: p("M-02")},
		{LogID: "LOG-0003", Description: "เปลี่ยนชุดเฟืองขับ", Staff: "ช่างพิชิต",
			RepairDate: d("2026-06-30"), TotalCost: 4200, RequestID: p("MT-1020"), MachineryID: p("M-03")},
		{LogID: "LOG-0004", Description: "ซ่อมสวิตช์เปิดเครื่อง", Staff: "ช่างมานะ",
			RepairDate: d("2026-07-03"), TotalCost: 900, RequestID: p("MT-1021"), MachineryID: p("M-05")},
	})
}

func seedMachineWorkHistories(db *gorm.DB) {
	d := func(s string) time.Time { t, _ := time.Parse("2006-01-02", s); return t }
	p := func(s string) *string { return &s }

	upsert(db, "history_id", []models.MachineWorkHistory{
		{HistoryID: "HIS-0001", JobCode: "WO-0001", Description: "ฉีดชิ้นงานฝาขวด ล็อต A 12,000 ชิ้น",
			Staff: "นายใจดี มีสุข", Date: d("2026-07-18"), MachineryID: p("M-01")},
		{HistoryID: "HIS-0002", JobCode: "WO-0002", Description: "ฉีดชิ้นงานตัวขวด ล็อต B 8,500 ชิ้น",
			Staff: "นายสมชาย ใจเย็น", Date: d("2026-06-29"), MachineryID: p("M-02")},
		{HistoryID: "HIS-0003", JobCode: "WO-0003", Description: "เป่าขึ้นรูปขวด 500 ml จำนวน 20,000 ใบ",
			Staff: "นายสมชาย ใจเย็น", Date: d("2026-06-20"), MachineryID: p("M-02")},
		{HistoryID: "HIS-0004", JobCode: "WO-0004", Description: "ฉีดชิ้นงานหูหิ้ว ล็อต C 5,000 ชิ้น",
			Staff: "นางสาวมานี รักงาน", Date: d("2026-07-05"), MachineryID: p("M-03")},
		{HistoryID: "HIS-0005", JobCode: "WO-0005", Description: "ขึ้นรูปฝาขวดเกลียว 30,000 ชิ้น",
			Staff: "นายวิชัย ตั้งใจ", Date: d("2026-07-09"), MachineryID: p("M-05")},
	})
}
