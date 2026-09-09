package main

import (
	"fmt"
	"sort"

	"gorm.io/gorm"
)

// เดิมไฟล์นี้เป็นส่วนหนึ่งของ cmd/seedff — คิวรีตรวจสอบผล seed แบบ read-only

// seedSummary คือสถานะหลัง seed ที่อ่านกลับจากฐานข้อมูล (SELECT อย่างเดียว)
type seedSummary struct {
	Employees          int64
	Accounts           int64
	ActiveAccounts     int64
	EmployeesWithAcct  int64 // จำนวนพนักงาน (distinct) ที่มีบัญชี >= 1
	EmployeesMultiAcct int64 // พนักงานที่มีบัญชี > 1 (ต้องเป็น 0)
	PerDeptEmployees   map[string]int64
	PerDeptAccounts    map[string]int64 // บัญชีที่ไล่ผ่าน FK ของพนักงาน
	RoleCounts         map[string]int64
	ITAdmins           int64
	ProdMgrRole        string
	Unassigned         int64
	DupEmails          int64
	DupUsernames       int64
	Tasks              int64
	TaskAssignments    int64
}

// verifyEmployeeSeed รัน aggregate query แบบ read-only บนตาราง FactoryFlow
func verifyEmployeeSeed(db *gorm.DB) (seedSummary, error) {
	s := seedSummary{
		PerDeptEmployees: map[string]int64{},
		PerDeptAccounts:  map[string]int64{},
		RoleCounts:       map[string]int64{},
	}
	q := func(dst *int64, sql string, args ...any) error {
		return db.Raw(sql, args...).Scan(dst).Error
	}

	if err := q(&s.Employees, `SELECT count(*) FROM employees`); err != nil {
		return s, err
	}
	if err := q(&s.Accounts, `SELECT count(*) FROM user_accounts`); err != nil {
		return s, err
	}
	if err := q(&s.ActiveAccounts, `SELECT count(*) FROM user_accounts WHERE active = TRUE`); err != nil {
		return s, err
	}
	if err := q(&s.EmployeesWithAcct, `SELECT count(DISTINCT employee_id) FROM user_accounts`); err != nil {
		return s, err
	}
	if err := q(&s.EmployeesMultiAcct,
		`SELECT count(*) FROM (SELECT employee_id FROM user_accounts GROUP BY employee_id HAVING count(*) > 1) x`); err != nil {
		return s, err
	}
	if err := q(&s.ITAdmins, `SELECT count(*) FROM employees WHERE department = 'IT' AND role = 'admin'`); err != nil {
		return s, err
	}
	if err := q(&s.Unassigned, `SELECT count(*) FROM employees WHERE role = 'unassigned'`); err != nil {
		return s, err
	}
	if err := q(&s.DupEmails,
		`SELECT count(*) FROM (SELECT email FROM employees WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1) x`); err != nil {
		return s, err
	}
	if err := q(&s.DupUsernames,
		`SELECT count(*) FROM (SELECT username FROM user_accounts GROUP BY username HAVING count(*) > 1) x`); err != nil {
		return s, err
	}
	if err := db.Raw(`SELECT coalesce((SELECT role FROM employees e JOIN user_accounts u ON u.employee_id = e.employee_id WHERE u.username = 'prod.manager01'), '')`).
		Scan(&s.ProdMgrRole).Error; err != nil {
		return s, err
	}
	// tasks / task_assignments ต้อง "ไม่ถูกแตะ" โดย seed ชุดนี้
	_ = db.Raw(`SELECT count(*) FROM tasks`).Scan(&s.Tasks).Error
	_ = db.Raw(`SELECT count(*) FROM task_assignments`).Scan(&s.TaskAssignments).Error

	type kv struct {
		K string
		V int64
	}
	var rows []kv
	if err := db.Raw(`SELECT department AS k, count(*) AS v FROM employees GROUP BY department`).Scan(&rows).Error; err != nil {
		return s, err
	}
	for _, r := range rows {
		s.PerDeptEmployees[r.K] = r.V
	}
	rows = nil
	if err := db.Raw(`SELECT e.department AS k, count(*) AS v
	                  FROM user_accounts u JOIN employees e ON e.employee_id = u.employee_id
	                  GROUP BY e.department`).Scan(&rows).Error; err != nil {
		return s, err
	}
	for _, r := range rows {
		s.PerDeptAccounts[r.K] = r.V
	}
	rows = nil
	if err := db.Raw(`SELECT role AS k, count(*) AS v FROM employees GROUP BY role`).Scan(&rows).Error; err != nil {
		return s, err
	}
	for _, r := range rows {
		s.RoleCounts[r.K] = r.V
	}
	return s, nil
}

// ok บอกว่า summary ตรงกับ blueprint ทุกจุดหรือไม่
func (s seedSummary) ok() bool {
	if s.Employees != 35 || s.Accounts != 35 || s.ActiveAccounts != 35 {
		return false
	}
	if s.EmployeesWithAcct != 35 || s.EmployeesMultiAcct != 0 {
		return false
	}
	if s.ITAdmins != 2 || s.Unassigned != 0 {
		return false
	}
	if s.DupEmails != 0 || s.DupUsernames != 0 {
		return false
	}
	if s.ProdMgrRole != "factory_manager" {
		return false
	}
	for _, d := range Departments {
		if s.PerDeptEmployees[d] != 5 || s.PerDeptAccounts[d] != 5 {
			return false
		}
	}
	return true
}

func printEmployeeSeedSummary(s seedSummary) {
	line := func(label string, got any, want any, ok bool) {
		mark := "OK"
		if !ok {
			mark = "FAIL"
		}
		fmt.Printf("  [%-4s] %-34s got=%v want=%v\n", mark, label, got, want)
	}
	fmt.Println("\nseedff: post-seed verification (read-only):")
	line("employees", s.Employees, 35, s.Employees == 35)
	line("user_accounts", s.Accounts, 35, s.Accounts == 35)
	line("accounts active", s.ActiveAccounts, 35, s.ActiveAccounts == 35)
	line("employees with an account", s.EmployeesWithAcct, 35, s.EmployeesWithAcct == 35)
	line("employees with >1 account", s.EmployeesMultiAcct, 0, s.EmployeesMultiAcct == 0)
	line("IT admins", s.ITAdmins, 2, s.ITAdmins == 2)
	line("prod.manager01 role", s.ProdMgrRole, "factory_manager", s.ProdMgrRole == "factory_manager")
	line("role=unassigned", s.Unassigned, 0, s.Unassigned == 0)
	line("duplicate emails", s.DupEmails, 0, s.DupEmails == 0)
	line("duplicate usernames", s.DupUsernames, 0, s.DupUsernames == 0)

	for _, d := range Departments {
		e := s.PerDeptEmployees[d]
		a := s.PerDeptAccounts[d]
		line("dept "+d, fmt.Sprintf("emp=%d acct=%d", e, a), "emp=5 acct=5", e == 5 && a == 5)
	}

	keys := make([]string, 0, len(s.RoleCounts))
	for k := range s.RoleCounts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%d", k, s.RoleCounts[k]))
	}
	fmt.Printf("  [info] role distribution: %v\n", parts)
	fmt.Printf("  [info] tasks=%d task_assignments=%d (ต้องไม่เปลี่ยนจาก seed ชุดนี้)\n", s.Tasks, s.TaskAssignments)
}
