package database

import "gorm.io/gorm"

// FRESH-03 — FactoryFlow backend DATA FOUNDATION.
//
// ensureFactoryFlowSchema adds the database machinery that GORM's AutoMigrate
// cannot express for the five ported FactoryFlow-foundation tables
// (employees, user_accounts, tasks, task_assignments, employee_email_history):
// business-id generators (sequences + BEFORE INSERT triggers / column
// DEFAULTs), CHECK constraints, the foreign keys AMONG THOSE FIVE TABLES, the
// updated_at triggers, and the append-only email-history trigger.
//
// It follows Friend's own migration convention: database.Migrate() already runs
// db.AutoMigrate(...) and then a couple of raw `db.Exec(...)` statements — this
// is simply more of the same. It is NOT a ported "migration runner"; there is
// no schema_migrations ledger and no //go:embed. Every statement is idempotent
// (CREATE ... IF NOT EXISTS, CREATE OR REPLACE, DROP TRIGGER IF EXISTS + CREATE,
// and DO-block guards for constraints), so it is safe to run on every startup.
//
// SCOPE GUARANTEES:
//   - It only ever touches the five FactoryFlow-foundation tables and creates
//     objects (sequences, functions, triggers ON `employees`) named with
//     FactoryFlow prefixes. It NEVER references, alters, drops, or renames any
//     Friend table (users, personnels, machines, works, production_*, …).
//   - tasks.machine_id is a plain nullable column with an index but NO foreign
//     key to Friend's `machines` (Friend owns that domain; its PK is `id`, and
//     Friend's own models are FK-light). See models/task.go.
//   - No data is inserted. No business row is created, migrated, or copied.
func ensureFactoryFlowSchema(db *gorm.DB) error {
	for _, stmt := range factoryFlowSchemaStatements {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	return nil
}

var factoryFlowSchemaStatements = []string{

	// ── shared + id generators ────────────────────────────────────────────
	`CREATE SEQUENCE IF NOT EXISTS emp_seq`,
	`CREATE SEQUENCE IF NOT EXISTS task_seq`,
	`CREATE SEQUENCE IF NOT EXISTS task_assignment_seq`,
	`CREATE SEQUENCE IF NOT EXISTS employee_email_history_seq`,

	`CREATE OR REPLACE FUNCTION ff_set_updated_at() RETURNS TRIGGER AS $$
	 BEGIN
	     NEW.updated_at := now();
	     RETURN NEW;
	 END;
	 $$ LANGUAGE plpgsql`,

	`CREATE OR REPLACE FUNCTION ff_next_employee_id() RETURNS TEXT AS $$
	 BEGIN
	     RETURN 'EMP-' || lpad(nextval('emp_seq')::TEXT, 4, '0');
	 END;
	 $$ LANGUAGE plpgsql`,

	`CREATE OR REPLACE FUNCTION ff_employees_assign_id() RETURNS TRIGGER AS $$
	 BEGIN
	     IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
	         NEW.employee_id := ff_next_employee_id();
	     END IF;
	     RETURN NEW;
	 END;
	 $$ LANGUAGE plpgsql`,

	`CREATE OR REPLACE FUNCTION ff_user_accounts_assign_id() RETURNS TRIGGER AS $$
	 BEGIN
	     IF NEW.user_id IS NULL OR NEW.user_id = '' THEN
	         NEW.user_id := replace(NEW.employee_id, 'EMP-', 'USR-');
	     END IF;
	     RETURN NEW;
	 END;
	 $$ LANGUAGE plpgsql`,

	// The append-only email-history recorder. NULL-guarded: an employee whose
	// email is NULL (or is cleared to NULL) produces NO history row, because
	// employee_email_history.new_email is NOT NULL. Mirrors FactoryFlow
	// migration 008 + the 009 NULL guard.
	`CREATE OR REPLACE FUNCTION ff_record_employee_email_change() RETURNS TRIGGER AS $$
	 DECLARE
	     v_actor TEXT := nullif(current_setting('app.acting_employee_id', true), '');
	 BEGIN
	     IF TG_OP = 'INSERT' THEN
	         IF NEW.email IS NOT NULL THEN
	             INSERT INTO employee_email_history
	                 (employee_id, old_email, new_email, changed_at, changed_by, source)
	             VALUES (NEW.employee_id, NULL, NEW.email, now(), v_actor, 'create');
	         END IF;
	         RETURN NEW;
	     END IF;
	     IF NEW.email IS DISTINCT FROM OLD.email THEN
	         IF NEW.email IS NOT NULL THEN
	             INSERT INTO employee_email_history
	                 (employee_id, old_email, new_email, changed_at, changed_by, source)
	             VALUES (NEW.employee_id, OLD.email, NEW.email, now(), v_actor, 'update');
	         END IF;
	     END IF;
	     RETURN NEW;
	 END;
	 $$ LANGUAGE plpgsql`,

	// ── employees ────────────────────────────────────────────────────────
	`ALTER TABLE employees ALTER COLUMN first_name  SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN last_name   SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN phone       SET DEFAULT ''`,
	`ALTER TABLE employees ALTER COLUMN phone       SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN department  SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN position    SET DEFAULT ''`,
	`ALTER TABLE employees ALTER COLUMN position    SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN role        SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN status      SET DEFAULT 'working'`,
	`ALTER TABLE employees ALTER COLUMN status      SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN shift       SET DEFAULT 'morning'`,
	`ALTER TABLE employees ALTER COLUMN shift       SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN created_at  SET DEFAULT now()`,
	`ALTER TABLE employees ALTER COLUMN created_at  SET NOT NULL`,
	`ALTER TABLE employees ALTER COLUMN updated_at  SET DEFAULT now()`,
	`ALTER TABLE employees ALTER COLUMN updated_at  SET NOT NULL`,

	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_check') THEN
	     ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN (
	       'admin','factory_manager','department_manager','supervisor',
	       'operator','qc_inspector','technician','staff','unassigned'));
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_check') THEN
	     ALTER TABLE employees ADD CONSTRAINT employees_status_check CHECK (status IN ('working','leave','off'));
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_shift_check') THEN
	     ALTER TABLE employees ADD CONSTRAINT employees_shift_check CHECK (shift IN ('morning','afternoon','night'));
	   END IF;
	 END $$`,

	// unique on a PRESENT email; Postgres allows many NULLs under a UNIQUE index
	`CREATE UNIQUE INDEX IF NOT EXISTS employees_email_key       ON employees (email)`,
	`CREATE        INDEX IF NOT EXISTS employees_email_lower_idx  ON employees (lower(email))`,

	`DROP TRIGGER IF EXISTS employees_assign_id ON employees`,
	`CREATE TRIGGER employees_assign_id BEFORE INSERT ON employees
	   FOR EACH ROW EXECUTE FUNCTION ff_employees_assign_id()`,
	`DROP TRIGGER IF EXISTS employees_set_updated_at ON employees`,
	`CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON employees
	   FOR EACH ROW EXECUTE FUNCTION ff_set_updated_at()`,
	`DROP TRIGGER IF EXISTS employees_email_history_insert ON employees`,
	`CREATE TRIGGER employees_email_history_insert AFTER INSERT ON employees
	   FOR EACH ROW EXECUTE FUNCTION ff_record_employee_email_change()`,
	`DROP TRIGGER IF EXISTS employees_email_history_update ON employees`,
	`CREATE TRIGGER employees_email_history_update AFTER UPDATE ON employees
	   FOR EACH ROW WHEN (NEW.email IS DISTINCT FROM OLD.email)
	   EXECUTE FUNCTION ff_record_employee_email_change()`,

	// ── user_accounts ───────────────────────────────────────────────────
	`ALTER TABLE user_accounts ALTER COLUMN employee_id   SET NOT NULL`,
	`ALTER TABLE user_accounts ALTER COLUMN username      SET NOT NULL`,
	`ALTER TABLE user_accounts ALTER COLUMN password_hash SET NOT NULL`,
	`ALTER TABLE user_accounts ALTER COLUMN active        SET DEFAULT TRUE`,
	`ALTER TABLE user_accounts ALTER COLUMN active        SET NOT NULL`,
	`ALTER TABLE user_accounts ALTER COLUMN created_at    SET DEFAULT now()`,
	`ALTER TABLE user_accounts ALTER COLUMN created_at    SET NOT NULL`,
	`ALTER TABLE user_accounts ALTER COLUMN updated_at    SET DEFAULT now()`,
	`ALTER TABLE user_accounts ALTER COLUMN updated_at    SET NOT NULL`,

	`CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_employee_id_key ON user_accounts (employee_id)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_username_key    ON user_accounts (username)`,

	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_accounts_employee_id_fkey') THEN
	     ALTER TABLE user_accounts ADD CONSTRAINT user_accounts_employee_id_fkey
	       FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE;
	   END IF;
	 END $$`,

	`DROP TRIGGER IF EXISTS user_accounts_assign_id ON user_accounts`,
	`CREATE TRIGGER user_accounts_assign_id BEFORE INSERT ON user_accounts
	   FOR EACH ROW EXECUTE FUNCTION ff_user_accounts_assign_id()`,
	`DROP TRIGGER IF EXISTS user_accounts_set_updated_at ON user_accounts`,
	`CREATE TRIGGER user_accounts_set_updated_at BEFORE UPDATE ON user_accounts
	   FOR EACH ROW EXECUTE FUNCTION ff_set_updated_at()`,

	// ── tasks ───────────────────────────────────────────────────────────
	`ALTER TABLE tasks ALTER COLUMN task_id     SET DEFAULT ('TSK-' || lpad(nextval('task_seq')::TEXT, 4, '0'))`,
	`ALTER TABLE tasks ALTER COLUMN title       SET NOT NULL`,
	`ALTER TABLE tasks ALTER COLUMN description SET DEFAULT ''`,
	`ALTER TABLE tasks ALTER COLUMN description SET NOT NULL`,
	`ALTER TABLE tasks ALTER COLUMN shift       SET DEFAULT 'morning'`,
	`ALTER TABLE tasks ALTER COLUMN shift       SET NOT NULL`,
	`ALTER TABLE tasks ALTER COLUMN status      SET DEFAULT 'pending'`,
	`ALTER TABLE tasks ALTER COLUMN status      SET NOT NULL`,
	`ALTER TABLE tasks ALTER COLUMN created_at  SET DEFAULT now()`,
	`ALTER TABLE tasks ALTER COLUMN created_at  SET NOT NULL`,
	`ALTER TABLE tasks ALTER COLUMN updated_at  SET DEFAULT now()`,
	`ALTER TABLE tasks ALTER COLUMN updated_at  SET NOT NULL`,

	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_shift_check') THEN
	     ALTER TABLE tasks ADD CONSTRAINT tasks_shift_check CHECK (shift IN ('morning','afternoon','night'));
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
	     ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pending','in_progress','done'));
	   END IF;
	 END $$`,

	`CREATE INDEX IF NOT EXISTS tasks_machine_id_idx ON tasks (machine_id)`,
	// FRESH-13 — optional link to a Friend Work item (models.Task.WorkID). The
	// work_id column itself is created by GORM AutoMigrate from the model field;
	// this index just makes the client-side Task->Work lookup cheap. Idempotent.
	`CREATE INDEX IF NOT EXISTS tasks_work_id_idx ON tasks (work_id)`,

	`DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks`,
	`CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks
	   FOR EACH ROW EXECUTE FUNCTION ff_set_updated_at()`,

	// ── task_assignments ────────────────────────────────────────────────
	`ALTER TABLE task_assignments ALTER COLUMN assignment_id SET DEFAULT ('TAS-' || lpad(nextval('task_assignment_seq')::TEXT, 4, '0'))`,
	`ALTER TABLE task_assignments ALTER COLUMN task_id       SET NOT NULL`,
	`ALTER TABLE task_assignments ALTER COLUMN employee_id   SET NOT NULL`,
	`ALTER TABLE task_assignments ALTER COLUMN assigned_at   SET DEFAULT now()`,
	`ALTER TABLE task_assignments ALTER COLUMN assigned_at   SET NOT NULL`,

	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_assignments_task_id_employee_id_key') THEN
	     ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_task_id_employee_id_key
	       UNIQUE (task_id, employee_id);
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_assignments_task_id_fkey') THEN
	     ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_task_id_fkey
	       FOREIGN KEY (task_id) REFERENCES tasks (task_id) ON DELETE CASCADE;
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_assignments_employee_id_fkey') THEN
	     ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_employee_id_fkey
	       FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE CASCADE;
	   END IF;
	 END $$`,

	`CREATE INDEX IF NOT EXISTS task_assignments_task_id_idx     ON task_assignments (task_id)`,
	`CREATE INDEX IF NOT EXISTS task_assignments_employee_id_idx ON task_assignments (employee_id)`,

	// ── employee_email_history ─────────────────────────────────────────
	`ALTER TABLE employee_email_history ALTER COLUMN id         SET DEFAULT ('EEH-' || lpad(nextval('employee_email_history_seq')::TEXT, 4, '0'))`,
	`ALTER TABLE employee_email_history ALTER COLUMN new_email  SET NOT NULL`,
	`ALTER TABLE employee_email_history ALTER COLUMN changed_at SET NOT NULL`,
	`ALTER TABLE employee_email_history ALTER COLUMN source     SET NOT NULL`,
	`ALTER TABLE employee_email_history ALTER COLUMN created_at SET DEFAULT now()`,
	`ALTER TABLE employee_email_history ALTER COLUMN created_at SET NOT NULL`,

	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_email_history_source_check') THEN
	     ALTER TABLE employee_email_history ADD CONSTRAINT employee_email_history_source_check
	       CHECK (source IN ('create','update','initial_backfill','api','migration','manual','system'));
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_email_history_employee_id_fkey') THEN
	     ALTER TABLE employee_email_history ADD CONSTRAINT employee_email_history_employee_id_fkey
	       FOREIGN KEY (employee_id) REFERENCES employees (employee_id) ON DELETE SET NULL;
	   END IF;
	 END $$`,
	`DO $$ BEGIN
	   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_email_history_changed_by_fkey') THEN
	     ALTER TABLE employee_email_history ADD CONSTRAINT employee_email_history_changed_by_fkey
	       FOREIGN KEY (changed_by) REFERENCES employees (employee_id) ON DELETE SET NULL;
	   END IF;
	 END $$`,

	`CREATE INDEX IF NOT EXISTS employee_email_history_employee_id_idx ON employee_email_history (employee_id)`,
	`CREATE INDEX IF NOT EXISTS employee_email_history_old_email_idx   ON employee_email_history (lower(old_email))`,
	`CREATE INDEX IF NOT EXISTS employee_email_history_new_email_idx   ON employee_email_history (lower(new_email))`,
}
