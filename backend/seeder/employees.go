package main

import (
	"fmt"
	"log"
	"sort"

	"gorm.io/gorm"
)

// SeedEmployeesFF ใส่ข้อมูลพนักงาน FactoryFlow (employees) + บัญชีผู้ใช้งาน
// (user_accounts) ตัวอย่าง 35 คน/35 บัญชี — เดิมเป็นคำสั่งแยกต่างหากของเพื่อน T06
// (`go run ./cmd/seedff`) ตอนนี้รวมเข้ามาเป็นส่วนหนึ่งของ seeder หลักแล้ว จึงรัน
// พร้อมกับ Seed_xxx ตัวอื่นๆ ทั้งหมดด้วยคำสั่งเดียว `go run ./seeder`
//
// ไม่ทำ AutoMigrate เอง (seeder/main.go เรียก database.Migrate ให้ก่อนหน้านี้แล้ว
// ซึ่งสร้างตาราง employees/user_accounts + trigger/constraint ต่างๆ ครบแล้ว)
// เป็น idempotent — รันซ้ำกี่ครั้งก็ได้ ไม่สร้างข้อมูลซ้ำ (ดู employees_seed.go)
//
// ข้อมูล blueprint อยู่ใน employees_data.go, ตรรกะ seed อยู่ใน employees_seed.go,
// การตรวจสอบผลลัพธ์หลัง seed อยู่ใน employees_verify.go
func SeedEmployeesFF(db *gorm.DB) {
	if err := checkEmployeeBlueprint(); err != nil {
		log.Fatalf("seedff: blueprint ข้อมูลพนักงานผิดพลาด: %v", err)
	}

	fmt.Printf("seedff: กำลัง seed พนักงาน %d คน ใน %d แผนก\n\n", len(People), len(Departments))
	results, failed := seedAll(db)
	printEmployeeSeedResults(results)

	summary, err := verifyEmployeeSeed(db)
	if err != nil {
		log.Fatalf("seedff: คิวรีตรวจสอบผลหลัง seed ไม่สำเร็จ: %v", err)
	}
	printEmployeeSeedSummary(summary)

	if failed > 0 {
		log.Printf("seedff: มี %d จาก %d แถวที่ล้มเหลว — ดู error รายแถวด้านบน", failed, len(People))
	}
	if !summary.ok() {
		log.Printf("seedff: ผลตรวจสอบหลัง seed ไม่ตรงกับ blueprint ทั้งหมด — ดูสรุปด้านบน")
		return
	}
	fmt.Println("\nseedff: OK — 35 พนักงาน / 35 บัญชี ตรงตาม blueprint, รันซ้ำได้ (idempotent)")
}

// checkEmployeeBlueprint ตรวจสอบข้อมูลใน People/Departments ก่อนเขียนลง DB จริง
func checkEmployeeBlueprint() error {
	if len(People) != 35 {
		return fmt.Errorf("blueprint มี %d แถว ต้องการ 35", len(People))
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
			return fmt.Errorf("blueprint ใช้ role ต้องห้าม 'unassigned' กับ %s", p.Username)
		}
		if p.Department == "IT" && p.Role == "admin" {
			itAdmins++
		}
		if p.Username == "prod.manager01" {
			prodMgr = p.Role
		}
		if seenUser[p.Username] {
			return fmt.Errorf("username ซ้ำใน blueprint: %s", p.Username)
		}
		seenUser[p.Username] = true
		if seenEmail[p.email()] {
			return fmt.Errorf("email ซ้ำใน blueprint: %s", p.email())
		}
		seenEmail[p.email()] = true
	}
	for _, d := range Departments {
		if byDept[d] != 5 {
			return fmt.Errorf("แผนก %q มี %d แถว ต้องการ 5", d, byDept[d])
		}
	}
	if len(byDept) != 7 {
		return fmt.Errorf("blueprint ครอบคลุม %d แผนก ต้องการ 7", len(byDept))
	}
	if itAdmins != 2 {
		return fmt.Errorf("IT มี admin %d แถว ต้องการเท่ากับ 2 พอดี", itAdmins)
	}
	if prodMgr != "factory_manager" {
		return fmt.Errorf("prod.manager01 role เป็น %q ต้องการ factory_manager", prodMgr)
	}
	fmt.Printf("seedff: blueprint OK — 7×5=35, IT admins=2, prod.manager01=factory_manager, ไม่มี unassigned\n")
	fmt.Printf("seedff: สัดส่วน role %v\n", sortedRoleCounts(roleCount))
	return nil
}

func sortedRoleCounts(m map[string]int) []string {
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

func printEmployeeSeedResults(rs []rowOutcome) {
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
