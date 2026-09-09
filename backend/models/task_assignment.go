package models

import "time"

// TaskAssignment is the join row for the many-to-many between Task and Employee.
//
// FRESH-03 — DATA FOUNDATION ONLY. Ported from the FactoryFlow reference. No
// handler/route/API uses it yet.
//
// There is deliberately NO direct Employee -> Task foreign key anywhere; the
// relationship lives only here. AssignmentID "TAS-####" comes from a column
// DEFAULT; AssignmentID / AssignedAt are `->` (read-only to GORM). There is no
// updated_at column and no trigger — assignments are create + delete only.
//
// task_id -> tasks(task_id) ON DELETE CASCADE and employee_id ->
// employees(employee_id) ON DELETE CASCADE; UNIQUE (task_id, employee_id)
// prevents assigning the same employee to the same task twice. All three
// referenced tables are FactoryFlow-foundation tables (no Friend table is
// touched).
type TaskAssignment struct {
	AssignmentID string    `json:"assignmentId" gorm:"column:assignment_id;primaryKey;->"`
	TaskID       string    `json:"taskId" gorm:"column:task_id"`
	EmployeeID   string    `json:"employeeId" gorm:"column:employee_id"`
	AssignedAt   time.Time `json:"assignedAt" gorm:"column:assigned_at;->"`
}

func (TaskAssignment) TableName() string { return "task_assignments" }
