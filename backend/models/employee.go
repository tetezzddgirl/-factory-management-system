package models

import "time"

// Employee is the FactoryFlow "person" record (HR / directory).
//
// FRESH-03 — DATA FOUNDATION ONLY. Ported from the FactoryFlow reference
// implementation (factoryflow-integrated/factoryflow/backend/models/models.go)
// so a later phase can add Personnel/User-account functionality on top of the
// Friend base. No handler, route, or API touches this model yet.
//
// EmployeeID is the immutable per-person key "EMP-0001", "EMP-0002", … It is
// filled by the employees_assign_id BEFORE INSERT trigger (from the emp_seq
// sequence) when a blank id is inserted — see database/factoryflow_schema.go.
// EmployeeID / CreatedAt / UpdatedAt are `->` (read-only to GORM): Postgres
// alone computes them (trigger + column DEFAULT now() + the
// employees_set_updated_at BEFORE UPDATE trigger).
//
// Email is a *string: an employee MAY have no email (the column is nullable).
// nil marshals to JSON null. Uniqueness of a PRESENT email is enforced by the
// employees_email_key UNIQUE index (Postgres allows many NULLs under it). Email
// is a mutable, audited attribute (see EmployeeEmailHistory) — never an
// identity key.
//
// Role stores a FactoryFlow role value ('admin' … 'staff', plus the
// transitional 'unassigned'). This is BACKEND DATA on the Employee record only
// — it is NOT wired into Friend's client-side role system, and Friend roles are
// NOT auto-mapped to it. See the FRESH_INTEGRATION_INVENTORY role strategy.
type Employee struct {
	EmployeeID string    `json:"employeeId" gorm:"column:employee_id;primaryKey;->"`
	FirstName  string    `json:"firstName" gorm:"column:first_name"`
	LastName   string    `json:"lastName" gorm:"column:last_name"`
	Phone      string    `json:"phone" gorm:"column:phone"`
	Email      *string   `json:"email" gorm:"column:email"`
	Department string    `json:"department" gorm:"column:department"`
	Position   string    `json:"position" gorm:"column:position"`
	Role       string    `json:"role" gorm:"column:role"`
	Status     string    `json:"status" gorm:"column:status"`
	Shift      string    `json:"shift" gorm:"column:shift"`
	CreatedAt  time.Time `json:"createdAt" gorm:"column:created_at;->"`
	UpdatedAt  time.Time `json:"updatedAt" gorm:"column:updated_at;->"`
}

// TableName pins the table name so GORM's pluralizer cannot surprise us
// (Employee -> "employees" anyway, but explicit here alongside the other
// FRESH-03 models).
func (Employee) TableName() string { return "employees" }
