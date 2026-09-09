package models

import "time"

// UserAccount is the login record for an Employee (1:1).
//
// FRESH-03 — DATA FOUNDATION ONLY. Ported from the FactoryFlow reference
// implementation. No handler/route/API uses it yet.
//
// UserID "USR-####" mirrors the linked employee's number — the
// user_accounts_assign_id BEFORE INSERT trigger derives it from employee_id
// (replace 'EMP-' -> 'USR-') when a blank id is inserted. UserID / CreatedAt /
// UpdatedAt are `->` (read-only to GORM); Postgres computes them.
//
// EmployeeID is NOT NULL + UNIQUE + FK -> employees(employee_id) ON DELETE
// CASCADE — a strict 1:1. Username is NOT NULL + UNIQUE and is meant to be
// immutable. PasswordHash is bcrypt and is never serialised (`json:"-"`).
type UserAccount struct {
	UserID       string     `json:"userId" gorm:"column:user_id;primaryKey;->"`
	EmployeeID   string     `json:"employeeId" gorm:"column:employee_id"`
	Username     string     `json:"username" gorm:"column:username"`
	PasswordHash string     `json:"-" gorm:"column:password_hash"`
	Active       bool       `json:"active" gorm:"column:active"`
	LastLogin    *time.Time `json:"lastLogin" gorm:"column:last_login"`
	CreatedAt    time.Time  `json:"createdAt" gorm:"column:created_at;->"`
	UpdatedAt    time.Time  `json:"updatedAt" gorm:"column:updated_at;->"`
}

func (UserAccount) TableName() string { return "user_accounts" }
