package models

import "time"

// EmployeeEmailHistory is one append-only audit row for a change to
// employees.email.
//
// FRESH-03 — DATA FOUNDATION ONLY. Ported from the FactoryFlow reference
// (migration 008 + the NULL-guard from 009). It is NOT exposed by any API — no
// handler, route, or JSON response returns it. Rows are written by the
// record_employee_email_change() trigger on employees, never by Go.
//
// ID "EEH-####" and CreatedAt come from column DEFAULTs (`->`, read-only to
// GORM). EmployeeID and ChangedBy are *string (nullable) — FK -> employees with
// ON DELETE SET NULL, so a history row SURVIVES deletion of the employee it
// refers to (or of the actor who made the change). OldEmail is nil for the
// first row of an employee's lineage. NewEmail is NOT NULL, so the trigger
// SKIPS writing a row when an employee's email is set to NULL (an email-less
// employee simply has no history row) — this is the FRESH-03 / reference
// behaviour that lets Employee.email be nullable.
type EmployeeEmailHistory struct {
	ID         string    `json:"id" gorm:"column:id;primaryKey;->"`
	EmployeeID *string   `json:"employeeId" gorm:"column:employee_id"`
	OldEmail   *string   `json:"oldEmail" gorm:"column:old_email"`
	NewEmail   string    `json:"newEmail" gorm:"column:new_email"`
	ChangedAt  time.Time `json:"changedAt" gorm:"column:changed_at"`
	ChangedBy  *string   `json:"changedBy" gorm:"column:changed_by"`
	Source     string    `json:"source" gorm:"column:source"`
	CreatedAt  time.Time `json:"createdAt" gorm:"column:created_at;->"`
}

func (EmployeeEmailHistory) TableName() string { return "employee_email_history" }
