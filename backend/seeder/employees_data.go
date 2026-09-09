package main

// เดิมไฟล์นี้เป็นส่วนหนึ่งของ cmd/seedff (seeder แยกต่างหากของเพื่อน T06 สำหรับ
// FactoryFlow employees/user_accounts) — ย้ายมารวมไว้ใน seeder/ หลัก เพื่อให้
// รันข้อมูลตัวอย่างทั้งหมดด้วยคำสั่งเดียว `go run ./seeder` (ดู seeder/employees.go
// สำหรับจุดเรียกเข้า และ seeder/main.go สำหรับลำดับการ seed)
//
// 7 แผนก × 5 พนักงาน = 35 คน แต่ละคนมี user_accounts 1 แถว (1:1) ทุกบัญชี
// เป็น demo data ล้วน — ชื่อสมมติ, อีเมล @factoryflow.local, รหัสผ่านเดียวกันทุกคน

// DemoPassword คือรหัสผ่านเดียวที่ใช้ร่วมกันของทั้ง 35 บัญชีที่ seed
//
// เป็น demo เท่านั้น ไม่ใช่ความลับ: ทุกบัญชีที่มันปลดล็อกเป็นข้อมูลสมมติ,
// employees.role ที่ seed มาเป็นแค่ข้อมูลอธิบาย (ยังไม่มีการอ้างอิง role นี้เพื่อ
// authorization ฝั่ง backend ในเฟสนี้) ผ่านกฎ ">= 8 ตัวอักษร" ของ Employee create path
const DemoPassword = "FactoryFlowDemo#2026"

// EmailDomain ต่อท้าย username ของแต่ละคนเพื่อสร้างอีเมล demo
// ".local" ไม่ชนกับโดเมนจริงหรือ demo user ของ Friend (demo@factoryflow.app)
// และผ่าน regex ของ backend ^[^\s@]+@[^\s@]+\.[^\s@]+$
const EmailDomain = "factoryflow.local"

// Departments — 7 แผนกตามที่ยืนยันแล้ว (ตัวสะกด/เว้นวรรครอบ "&" ใน
// "Planning & Purchasing" มีผล เพราะคอลัมน์ไม่มี CHECK จะพิมพ์ผิดแล้วไม่มีอะไรเตือน)
var Departments = []string{
	"Production",
	"Quality",
	"Maintenance",
	"Warehouse",
	"Planning & Purchasing",
	"HR",
	"IT",
}

// seedPerson คือข้อมูลพนักงาน 1 แถวใน blueprint
// EmployeeID และ UserID ของบัญชีไม่ได้ระบุไว้ — Postgres trigger เป็นคนกำหนด
// (EMP-#### / USR-####)
type seedPerson struct {
	Department string
	FirstName  string
	LastName   string
	Position   string // employees.position (free text)
	Role       string // employees.role — 1 ใน 9 ค่าตาม CHECK, ห้ามเป็น "unassigned"
	Shift      string // morning | afternoon | night
	Username   string // user_accounts.username (unique, กำหนดตายตัว)
}

// People คือ blueprint พนักงานทั้ง 35 คน เรียงตามแผนก แผนกละ 5 คน
//
// สัดส่วน role (ตรงกับตาราง per-department ใน FRESH-10.6B):
//
//	admin              2   (IT เท่านั้น — ต้องเป็น 2 พอดี)
//	factory_manager    1   (Production — prod.manager01)
//	department_manager 6   (IT, Quality, Maintenance, Warehouse, Planning & Purchasing, HR)
//	supervisor         6   (Production, Quality, Maintenance, Warehouse, Planning & Purchasing, HR)
//	operator           4   (Production ×3, Warehouse ×1)
//	qc_inspector       3   (Quality)
//	technician         4   (IT ×1, Maintenance ×3)
//	staff              9   (IT ×1, Warehouse ×2, Planning & Purchasing ×3, HR ×3)
//	unassigned         0   (ตั้งใจไม่ใช้)
//	-------------------------
//	รวม               35
var People = []seedPerson{
	// ── IT (5) — admin ต้องเป็น 2 พอดี ─────────────────────────────────────
	{"IT", "Isara", "Manothai", "IT Manager", "department_manager", "morning", "it.manager01"},
	{"IT", "Anan", "Adisai", "System Administrator", "admin", "morning", "it.admin01"},
	{"IT", "Adul", "Meesuk", "System Administrator", "admin", "afternoon", "it.admin02"},
	{"IT", "Sunan", "Prasert", "IT Support Officer", "staff", "morning", "it.support01"},
	{"IT", "Thanet", "Chaiyo", "Systems Technician", "technician", "afternoon", "it.tech01"},

	// ── Production (5) — prod.manager01 = factory_manager ──────────────────
	{"Production", "Prasit", "Mankhong", "Production Manager", "factory_manager", "morning", "prod.manager01"},
	{"Production", "Sombat", "Rungruang", "Line Supervisor", "supervisor", "morning", "prod.supervisor01"},
	{"Production", "Oran", "Thongdee", "Machine Operator", "operator", "morning", "prod.operator01"},
	{"Production", "Manop", "Saengchai", "Machine Operator", "operator", "afternoon", "prod.operator02"},
	{"Production", "Chatri", "Boonmee", "Machine Operator", "operator", "night", "prod.operator03"},

	// ── Quality (5) ──────────────────────────────────────────────────────
	{"Quality", "Qanittha", "Wongsa", "QC Manager", "department_manager", "morning", "qa.manager01"},
	{"Quality", "Supavadee", "Chantho", "QC Supervisor", "supervisor", "morning", "qa.supervisor01"},
	{"Quality", "Kwan", "Srisuk", "QC Inspector", "qc_inspector", "morning", "qa.inspector01"},
	{"Quality", "Nattaya", "Phimon", "QC Inspector", "qc_inspector", "afternoon", "qa.inspector02"},
	{"Quality", "Pakorn", "Yindee", "QC Inspector", "qc_inspector", "night", "qa.inspector03"},

	// ── Maintenance (5) ─────────────────────────────────────────────────
	{"Maintenance", "Manas", "Kittisak", "Maintenance Manager", "department_manager", "morning", "maint.manager01"},
	{"Maintenance", "Surachai", "Denchai", "Maintenance Supervisor", "supervisor", "morning", "maint.supervisor01"},
	{"Maintenance", "Weerapong", "Namphon", "Maintenance Technician", "technician", "morning", "maint.tech01"},
	{"Maintenance", "Decha", "Rojana", "Maintenance Technician", "technician", "afternoon", "maint.tech02"},
	{"Maintenance", "Kittipong", "Suwan", "Maintenance Technician", "technician", "night", "maint.tech03"},

	// ── Warehouse (5) ──────────────────────────────────────────────────
	{"Warehouse", "Wichai", "Rungrueang", "Warehouse Manager", "department_manager", "morning", "wh.manager01"},
	{"Warehouse", "Sunee", "Saengthong", "Warehouse Supervisor", "supervisor", "morning", "wh.supervisor01"},
	{"Warehouse", "Malee", "Srisuk", "Warehouse Staff", "staff", "morning", "wh.staff01"},
	{"Warehouse", "Prayut", "Thongdi", "Warehouse Staff", "staff", "afternoon", "wh.staff02"},
	{"Warehouse", "Arun", "Phongphrai", "Inventory Operator", "operator", "night", "wh.operator01"},

	// ── Planning & Purchasing (5) ──────────────────────────────────────
	{"Planning & Purchasing", "Pichai", "Charoen", "Planning Manager", "department_manager", "morning", "plan.manager01"},
	{"Planning & Purchasing", "Sarawut", "Intara", "Planning Supervisor", "supervisor", "morning", "plan.supervisor01"},
	{"Planning & Purchasing", "Pornthip", "Kanya", "Production Planner", "staff", "morning", "plan.planner01"},
	{"Planning & Purchasing", "Chalard", "Mongkut", "Production Planner", "staff", "afternoon", "plan.planner02"},
	{"Planning & Purchasing", "Wanida", "Suksan", "Purchasing Officer", "staff", "morning", "plan.purchasing01"},

	// ── HR (5) ────────────────────────────────────────────────────────
	{"HR", "Hansa", "Charoensuk", "HR Manager", "department_manager", "morning", "hr.manager01"},
	{"HR", "Siriporn", "Chaidi", "HR Supervisor", "supervisor", "morning", "hr.supervisor01"},
	{"HR", "Orawan", "Phanit", "HR Officer", "staff", "morning", "hr.officer01"},
	{"HR", "Kanokwan", "Ruengsri", "HR Officer", "staff", "afternoon", "hr.officer02"},
	{"HR", "Nualjan", "Pongprai", "Recruitment Officer", "staff", "morning", "hr.officer03"},
}

// email คืนอีเมล demo ที่กำหนดตายตัวของแถว blueprint นี้
func (p seedPerson) email() string { return p.Username + "@" + EmailDomain }
