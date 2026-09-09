package main

import (
	"fmt"

	"factoryflow/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// เดิมไฟล์นี้เป็นส่วนหนึ่งของ cmd/seedff — ตรรกะ seed แบบ idempotent สำหรับ
// พนักงาน 35 คน + บัญชีผู้ใช้งาน 1:1 ของแต่ละคน
//
// ฟิลด์ที่ seed เป็นเจ้าของ (ทำให้ตรงกับ blueprint ทุกครั้งที่รัน):
//
//	employees:      first_name, last_name, phone, department, position, role, status, shift
//	user_accounts:  active  (บังคับกลับเป็น TRUE เสมอ)
//
// ฟิลด์ที่ "ไม่แตะ" หลังสร้างครั้งแรก:
//
//	employees.email          — ใช้เป็น identity สำหรับเช็คว่ามีอยู่แล้วหรือยัง
//	                            (เปลี่ยนจะไปสั่น trigger email-history)
//	user_accounts.username   — identity ของบัญชี
//	user_accounts.password_hash — เขียนครั้งเดียวตอนสร้างบัญชี แล้วไม่ hash ซ้ำอีก
//	                            (ตามแนวเดียวกับ backend/seeder/users.go เดิม)
//
// IDENTITY KEY: employees.email (unique เมื่อมีค่า) และของบัญชีคือ
// user_accounts.employee_id (unique 1:1 FK) — ไม่มีการลบแถวใดๆ ทั้งสิ้น
//
// รหัสธุรกิจ (EMP-####, USR-####) มาจาก Postgres trigger ที่มีอยู่แล้ว
// (ff_employees_assign_id, ff_user_accounts_assign_id) — โค้ดนี้ไม่ได้กำหนดเอง

type rowOutcome struct {
	Username   string
	EmployeeID string
	UserID     string
	EmpAction  string // "created" | "updated" | "unchanged"
	AcctAction string // "created" | "reactivated" | "unchanged"
	Err        error
}

// seedAll รันทีละแถวใน 1 transaction ต่อแถว ถ้าแถวไหนพังจะ rollback เฉพาะแถวนั้น
// และบันทึกไว้ แถวที่เหลือยังรันต่อ คืนผลลัพธ์รายแถว + จำนวนที่พัง
func seedAll(db *gorm.DB) ([]rowOutcome, int) {
	out := make([]rowOutcome, 0, len(People))
	failed := 0
	for _, p := range People {
		r := seedOne(db, p)
		if r.Err != nil {
			failed++
		}
		out = append(out, r)
	}
	return out, failed
}

func seedOne(db *gorm.DB, p seedPerson) rowOutcome {
	res := rowOutcome{Username: p.Username}

	txErr := db.Transaction(func(tx *gorm.DB) error {
		// ---- employee: หาโดยอีเมล demo ถ้าไม่เจอค่อยสร้างใหม่ -------------
		// ใช้ Find (ไม่ใช่ First) เพื่อให้ "ยังไม่มีแถวนี้" คือ RowsAffected==0
		// เฉยๆ ไม่ต้องมี gorm.ErrRecordNotFound รกๆ ใน log
		var emp models.Employee
		empLookup := tx.Where("email = ?", p.email()).Limit(1).Find(&emp)
		if empLookup.Error != nil {
			return fmt.Errorf("lookup employee %s: %w", p.Username, empLookup.Error)
		}

		switch {
		case empLookup.RowsAffected > 0:
			// ปรับฟิลด์ที่ seed เป็นเจ้าของให้ตรงกับ blueprint
			updates := map[string]any{}
			if emp.FirstName != p.FirstName {
				updates["first_name"] = p.FirstName
			}
			if emp.LastName != p.LastName {
				updates["last_name"] = p.LastName
			}
			if emp.Phone != demoPhone(p) {
				updates["phone"] = demoPhone(p)
			}
			if emp.Department != p.Department {
				updates["department"] = p.Department
			}
			if emp.Position != p.Position {
				updates["position"] = p.Position
			}
			if emp.Role != p.Role {
				updates["role"] = p.Role
			}
			if emp.Status != "working" {
				updates["status"] = "working"
			}
			if emp.Shift != p.Shift {
				updates["shift"] = p.Shift
			}
			if len(updates) > 0 {
				if err := tx.Model(&models.Employee{}).
					Where("employee_id = ?", emp.EmployeeID).
					Updates(updates).Error; err != nil {
					return fmt.Errorf("update employee %s: %w", emp.EmployeeID, err)
				}
				res.EmpAction = "updated"
			} else {
				res.EmpAction = "unchanged"
			}

		default: // RowsAffected == 0 -> สร้างใหม่
			email := p.email()
			emp = models.Employee{
				FirstName:  p.FirstName,
				LastName:   p.LastName,
				Phone:      demoPhone(p),
				Email:      &email,
				Department: p.Department,
				Position:   p.Position,
				Role:       p.Role,
				Status:     "working",
				Shift:      p.Shift,
			}
			// employee_id / created_at / updated_at เป็น gorm:"->" (read-only);
			// clause.Returning{} อ่านค่ากลับที่ trigger + DEFAULT กำหนดให้
			if err := tx.Clauses(clause.Returning{}).Create(&emp).Error; err != nil {
				return fmt.Errorf("create employee %s: %w", p.Username, err)
			}
			res.EmpAction = "created"
		}
		res.EmployeeID = emp.EmployeeID

		// ---- account: หาโดย employee_id (1:1) ถ้าไม่เจอค่อยสร้างใหม่ ------
		var acct models.UserAccount
		acctLookup := tx.Where("employee_id = ?", emp.EmployeeID).Limit(1).Find(&acct)
		if acctLookup.Error != nil {
			return fmt.Errorf("lookup account %s: %w", p.Username, acctLookup.Error)
		}

		switch {
		case acctLookup.RowsAffected > 0:
			if !acct.Active {
				if err := tx.Model(&models.UserAccount{}).
					Where("user_id = ?", acct.UserID).
					Update("active", true).Error; err != nil {
					return fmt.Errorf("reactivate account %s: %w", acct.UserID, err)
				}
				res.AcctAction = "reactivated"
			} else {
				res.AcctAction = "unchanged"
			}
			res.UserID = acct.UserID

		default: // RowsAffected == 0 -> สร้างใหม่ (password_hash เขียนครั้งเดียวตรงนี้)
			hash, err := bcrypt.GenerateFromPassword([]byte(DemoPassword), bcrypt.DefaultCost)
			if err != nil {
				return fmt.Errorf("hash password for %s: %w", p.Username, err)
			}
			acct = models.UserAccount{
				EmployeeID:   emp.EmployeeID,
				Username:     p.Username,
				PasswordHash: string(hash),
				Active:       true,
			}
			// user_id มาจาก ff_user_accounts_assign_id (EMP-#### -> USR-####)
			if err := tx.Clauses(clause.Returning{}).Create(&acct).Error; err != nil {
				return fmt.Errorf("create account %s: %w", p.Username, err)
			}
			res.AcctAction = "created"
			res.UserID = acct.UserID
		}

		return nil
	})

	if txErr != nil {
		res.Err = txErr
	}
	return res
}

// demoPhone คือเบอร์ปลอมที่กำหนดตายตัวต่อแถว (10 หลัก ขึ้นต้น "08") ไม่ใช่เบอร์จริง
func demoPhone(p seedPerson) string {
	// stable ต่อ username เพื่อไม่ให้ค่าขยับเวลารันซ้ำ
	sum := 0
	for i, c := range p.Username {
		sum += (i + 1) * int(c)
	}
	return fmt.Sprintf("08%08d", sum%100000000)
}
