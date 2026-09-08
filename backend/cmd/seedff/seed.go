package main

import (
	"fmt"

	"factoryflow/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// FRESH-10.6C — idempotent seed logic for the 35 FactoryFlow demo employees
// and their 1:1 user_accounts.
//
// SEED-OWNED FIELDS (converge to the blueprint on every run):
//
//	employees:      first_name, last_name, phone, department, position, role, status, shift
//	user_accounts:  active  (always forced back to TRUE)
//
// NOT touched after first creation:
//
//	employees.email          — the idempotency identity of a row; changing it
//	                           would fire the email-history trigger
//	user_accounts.username   — the account identity
//	user_accounts.password_hash — written ONCE, at account creation, then never
//	                           re-hashed or overwritten (mirrors backend/seeder/users.go)
//
// IDENTITY KEYS: employees.email (unique on a present value) and, for the
// account, user_accounts.employee_id (unique 1:1 FK). A blueprint row is
// matched to an existing employee by its demo email; the account is matched by
// that employee's id. Nothing is ever deleted.
//
// Business ids are assigned by the existing Postgres triggers
// (ff_employees_assign_id -> EMP-####, ff_user_accounts_assign_id -> USR-####);
// this seed never sets them.

type rowOutcome struct {
	Username   string
	EmployeeID string
	UserID     string
	EmpAction  string // "created" | "updated" | "unchanged"
	AcctAction string // "created" | "reactivated" | "unchanged"
	Err        error
}

// seedAll runs one transaction per blueprint row. A failure on one row rolls
// that row back and is recorded; the remaining rows still run. seedAll returns
// the per-row outcomes and the number of rows that failed.
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
		// ---- employee: find by demo email, else create -------------------
		// Find (not First) so a legitimate "no such row yet" is RowsAffected==0
		// rather than gorm.ErrRecordNotFound noise in the logger.
		var emp models.Employee
		empLookup := tx.Where("email = ?", p.email()).Limit(1).Find(&emp)
		if empLookup.Error != nil {
			return fmt.Errorf("lookup employee %s: %w", p.Username, empLookup.Error)
		}

		switch {
		case empLookup.RowsAffected > 0:
			// converge seed-owned mutable fields
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

		default: // RowsAffected == 0 -> create
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
			// employee_id / created_at / updated_at are gorm:"->" (read-only);
			// clause.Returning{} reads back what the trigger + DEFAULTs stored.
			if err := tx.Clauses(clause.Returning{}).Create(&emp).Error; err != nil {
				return fmt.Errorf("create employee %s: %w", p.Username, err)
			}
			res.EmpAction = "created"
		}
		res.EmployeeID = emp.EmployeeID

		// ---- account: find by employee_id (1:1), else create ------------
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

		default: // RowsAffected == 0 -> create (password_hash written once, here only)
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
			// user_id is derived by ff_user_accounts_assign_id (EMP-#### -> USR-####).
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

// demoPhone is a deterministic fake phone for a blueprint row (10 digits,
// leading "08"). Not a real number.
func demoPhone(p seedPerson) string {
	// stable per username so reruns don't churn the field
	sum := 0
	for i, c := range p.Username {
		sum += (i + 1) * int(c)
	}
	return fmt.Sprintf("08%08d", sum%100000000)
}
