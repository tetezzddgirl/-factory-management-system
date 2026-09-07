package main

// FRESH-10.6C — FactoryFlow demo seed data (blueprint from
// FRESH-10.6B_SEED_ROLE_MAPPING_AUDIT.md).
//
// 7 departments × 5 employees = 35 employees, each with exactly one
// user_accounts row (1:1). Everything here is DEMO data — fictitious names,
// @factoryflow.local emails, one shared demo password (see DemoPassword).
//
// This file is DATA ONLY. It defines no behaviour and imports nothing from the
// Friend codebase. The seed logic lives in seed.go; the entrypoint in main.go.

// DemoPassword is the single shared password for all 35 seeded accounts.
//
// DEMO ONLY. It is intentionally not a secret: every account it unlocks is
// fictitious, the data is demo data, and the seeded employees.role values are
// descriptive only (no backend authorization is keyed off them in this phase).
// It satisfies the API's ">= 8 characters" rule that the Employee create path
// enforces. It is documented verbatim in
// FRESH-10.6C_SEED_IMPLEMENTATION_REPORT.md.
const DemoPassword = "FactoryFlowDemo#2026"

// EmailDomain is appended to every seeded username to form the demo email.
// ".local" cannot collide with a real domain or with Friend's demo user
// (demo@factoryflow.app), and it passes the backend email regex
// ^[^\s@]+@[^\s@]+\.[^\s@]+$ .
const EmailDomain = "factoryflow.local"

// Departments — the 7 confirmed strings, verbatim (FRESH-10.6A/B). The exact
// casing and the spaces around "&" in "Planning & Purchasing" matter: the
// column has no CHECK, so a typo would be silently accepted.
var Departments = []string{
	"Production",
	"Quality",
	"Maintenance",
	"Warehouse",
	"Planning & Purchasing",
	"HR",
	"IT",
}

// seedPerson is one blueprint row. EmployeeID and the account's UserID are NOT
// listed — Postgres triggers assign them (EMP-#### / USR-####).
type seedPerson struct {
	Department string
	FirstName  string
	LastName   string
	Position   string // employees.position (free text)
	Role       string // employees.role — one of the 9 CHECK values, never "unassigned"
	Shift      string // morning | afternoon | night
	Username   string // user_accounts.username (unique, deterministic)
}

// People is the full 35-row blueprint, in department order, 5 per department.
//
// Role distribution (matches the per-department blueprint tables in
// FRESH-10.6B; the §7 summary table there had an arithmetic slip of
// supervisor 7 / staff 8 — the authoritative per-department tables give
// supervisor 6 / staff 9, which is what is encoded here):
//
//	admin              2   (IT only — EXACTLY 2)
//	factory_manager    1   (Production — prod.manager01, advisory RoleKey supervisor)
//	department_manager 6   (IT, Quality, Maintenance, Warehouse, Planning & Purchasing, HR)
//	supervisor         6   (Production, Quality, Maintenance, Warehouse, Planning & Purchasing, HR)
//	operator           4   (Production ×3, Warehouse ×1)
//	qc_inspector       3   (Quality)
//	technician         4   (IT ×1, Maintenance ×3)
//	staff              9   (IT ×1, Warehouse ×2, Planning & Purchasing ×3, HR ×3)
//	unassigned         0   (deliberately unused)
//	-------------------------
//	total             35
var People = []seedPerson{
	// ── IT (5) — EXACTLY 2 admin ───────────────────────────────────────────
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

// email returns the deterministic demo email for a blueprint row.
func (p seedPerson) email() string { return p.Username + "@" + EmailDomain }
