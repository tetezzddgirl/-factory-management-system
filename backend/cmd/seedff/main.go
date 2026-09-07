// Command seedff loads the FactoryFlow demo seed: 35 employees (7 departments ×
// 5) and one user_accounts row per employee (1:1), all active, every account
// usable via BOTH username+password and demo-email+password through the
// existing /auth/login fallback.
//
// FRESH-10.6C. Standalone and ADDITIVE — it modifies no existing Friend file
// and starts no server. It reuses the existing config + database packages and
// the existing FactoryFlow models. It does NOT run AutoMigrate and does NOT
// change the schema: the `employees` and `user_accounts` tables (and their
// triggers) must already exist — start the backend once, or run the existing
// `go run ./seeder`, to create them.
//
// Run from the backend/ directory (same env / DB_* vars as the backend):
//
//	go run ./cmd/seedff
//
// Exit code 0 on full success, 1 on any row failure or setup problem.
package main

import (
	"fmt"
	"os"
	"sort"

	"factoryflow/config"
	"factoryflow/database"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "seedff: "+err.Error())
		os.Exit(1)
	}
}

func run() error {
	cfg := config.Load()
	fmt.Printf("seedff: connecting to %s:%s/%s as %s\n", cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBUser)

	db, err := database.Connect(cfg)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("db handle: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	// Do NOT AutoMigrate. Require the FactoryFlow schema to already be present.
	for _, t := range []string{"employees", "user_accounts"} {
		if !db.Migrator().HasTable(t) {
			return fmt.Errorf("table %q does not exist — start the backend once (or run `go run ./seeder`) to create the FactoryFlow schema first; seedff never migrates", t)
		}
	}
	fmt.Println("seedff: schema present (employees, user_accounts) — no migration performed")

	// Blueprint sanity checks (fail fast before writing anything).
	if err := checkBlueprint(); err != nil {
		return err
	}

	fmt.Printf("seedff: seeding %d employees across %d departments\n\n", len(People), len(Departments))
	results, failed := seedAll(db)

	printResults(results)
	summary, err := verify(db)
	if err != nil {
		return fmt.Errorf("post-seed verification query: %w", err)
	}
	printSummary(summary)

	if failed > 0 {
		return fmt.Errorf("%d of %d rows failed — see per-row errors above", failed, len(People))
	}
	if !summary.ok() {
		return fmt.Errorf("post-seed verification did not match the blueprint — see summary above")
	}
	fmt.Println("\nseedff: OK — 35 employees / 35 accounts, blueprint satisfied, idempotent on re-run")
	return nil
}

// checkBlueprint validates the in-file data before any DB write.
func checkBlueprint() error {
	if len(People) != 35 {
		return fmt.Errorf("blueprint has %d rows, expected 35", len(People))
	}
	byDept := map[string]int{}
	roleCount := map[string]int{}
	itAdmins := 0
	seenUser := map[string]bool{}
	seenEmail := map[string]bool{}
	prodMgr := ""
	for _, p := range People {
		byDept[p.Department]++
		roleCount[p.Role]++
		if p.Role == "unassigned" {
			return fmt.Errorf("blueprint uses forbidden role 'unassigned' for %s", p.Username)
		}
		if p.Department == "IT" && p.Role == "admin" {
			itAdmins++
		}
		if p.Username == "prod.manager01" {
			prodMgr = p.Role
		}
		if seenUser[p.Username] {
			return fmt.Errorf("duplicate username in blueprint: %s", p.Username)
		}
		seenUser[p.Username] = true
		if seenEmail[p.email()] {
			return fmt.Errorf("duplicate email in blueprint: %s", p.email())
		}
		seenEmail[p.email()] = true
	}
	for _, d := range Departments {
		if byDept[d] != 5 {
			return fmt.Errorf("department %q has %d rows, expected 5", d, byDept[d])
		}
	}
	if len(byDept) != 7 {
		return fmt.Errorf("blueprint covers %d departments, expected 7", len(byDept))
	}
	if itAdmins != 2 {
		return fmt.Errorf("IT has %d admin rows, expected EXACTLY 2", itAdmins)
	}
	if prodMgr != "factory_manager" {
		return fmt.Errorf("prod.manager01 role is %q, expected factory_manager", prodMgr)
	}
	fmt.Printf("seedff: blueprint OK — 7×5=35, IT admins=2, prod.manager01=factory_manager, no unassigned\n")
	fmt.Printf("seedff: role distribution %v\n", sortedCounts(roleCount))
	return nil
}

func sortedCounts(m map[string]int) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, fmt.Sprintf("%s=%d", k, m[k]))
	}
	return out
}

func printResults(rs []rowOutcome) {
	fmt.Println("department            username             employee        account")
	fmt.Println("-------------------- -------------------- --------------- ----------------")
	curDept := ""
	for i, r := range rs {
		dept := People[i].Department
		shownDept := dept
		if dept == curDept {
			shownDept = ""
		}
		curDept = dept
		if r.Err != nil {
			fmt.Printf("%-20s %-20s  FAILED: %v\n", shownDept, r.Username, r.Err)
			continue
		}
		fmt.Printf("%-20s %-20s %-15s %-16s\n",
			shownDept, r.Username,
			fmt.Sprintf("%s/%s", r.EmployeeID, r.EmpAction),
			fmt.Sprintf("%s/%s", r.UserID, r.AcctAction),
		)
	}
}
