package models

import "time"

// Task is a FactoryFlow unit of work that MAY involve a machine.
//
// FRESH-03 — DATA FOUNDATION ONLY. Ported from the FactoryFlow reference. No
// handler/route/API uses it yet.
//
// TaskID "TSK-####" comes from a column DEFAULT ('TSK-' || lpad(nextval(
// 'task_seq')…)). TaskID / CreatedAt / UpdatedAt are `->` (read-only to GORM);
// updated_at is kept fresh by the tasks_set_updated_at BEFORE UPDATE trigger.
//
// FRIEND ADAPTATION: the FactoryFlow reference declares machine_id as
// "TEXT REFERENCES machines(machine_id) ON DELETE SET NULL", but Friend already
// owns the machine domain and its machines table's primary key is `id`, not
// `machine_id`. To avoid adding a cross-domain FK constraint onto a Friend-owned
// table (and to match Friend's own FK-light convention), machine_id here is a
// PLAIN nullable text column with an index but NO foreign key. Referential
// integrity to Friend's machines is an application concern for a later phase.
// It still holds a machine id string.
//
// FRESH-13 — WorkID is an OPTIONAL link to a Friend Work item (models.Work,
// column work_id holds Work.workID e.g. "WRK-0002"). It follows the exact same
// convention as MachineID: a PLAIN nullable text column with an index but NO
// foreign key (Friend owns the `works` table and is FK-light). NULL = an ad-hoc
// task with no production origin. Traceability Task -> Work -> Work Order ->
// Plan is resolved by lookup against the existing Friend endpoints, NEVER by
// copying product / quantity / due-date / priority onto the Task. GORM
// AutoMigrate adds the column automatically from this field; nothing else about
// the model, its triggers, or Friend's schema changes.
type Task struct {
	TaskID      string    `json:"taskId" gorm:"column:task_id;primaryKey;->"`
	Title       string    `json:"title" gorm:"column:title"`
	Description string    `json:"description" gorm:"column:description"`
	MachineID   *string   `json:"machineId" gorm:"column:machine_id"`
	WorkID      *string   `json:"workId" gorm:"column:work_id"`
	Shift       string    `json:"shift" gorm:"column:shift"`
	Status      string    `json:"status" gorm:"column:status"`
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;->"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"column:updated_at;->"`
}

func (Task) TableName() string { return "tasks" }
