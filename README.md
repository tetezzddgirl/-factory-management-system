
หลังจากเปิดระบบครั้งแรก ให้รัน Seed เพื่อสร้างบัญชีผู้ใช้สำหรับเข้าสู่ระบบ

cd backend
go run ./cmd/seedff




# บัญชีล็อกอิน admin

Username:  it.admin01
Email:  it.admin01@factoryflow.local
Password:  FactoryFlowDemo#2026

Username:  it.admin02
Email:  it.admin02@factoryflow.local
Password:  FactoryFlowDemo#2026

==================================================

# มีอะไรบ้างที่เพิ่มหรือแก้

Personnel Management — จัดการพนักงาน เพิ่ม/แก้ไข/ลบ ค้นหา แยกตามแผนก และดูข้อมูลพนักงาน
User Account Management — สร้างบัญชีให้พนักงาน, เปิด/ปิดบัญชี, เปลี่ยน/รีเซ็ตรหัสผ่าน และ Login ด้วย Username หรือ Email
Role & Permission — กำหนดสิทธิ์ เช่น Admin, Manager, Supervisor, Operator, Technician ฯลฯ
Task Management — สร้าง/แก้ไข/ลบงาน และกำหนดงานให้พนักงาน
Task Assignment / จัดกะ — จัดพนักงานเข้ากะ และกำหนดงานในแต่ละกะ
เชื่อมกับระบบเพื่อน — Task สามารถเชื่อมกับ Work → Work Order → Production Plan ของระบบเดิมได้
ข้อมูลส่วนตัว — ผู้ใช้กดชื่อบัญชีด้านล่างเพื่อแก้ไขข้อมูลของตัวเองและเปลี่ยนรหัสผ่าน
สิทธิ์ Personnel — ทุก Role ดูรายชื่อพนักงานได้ แต่ เฉพาะ Admin ที่แก้ไข/ลบ/จัดการบัญชีผู้อื่นได้

==================================================

แก้โค้ดตรงไหนบ้าง
factoryflow-final/backend/database/database.go
→ เพิ่มการสร้าง/รองรับตารางของ FactoryFlow

factoryflow-final/backend/main.go
→ เพิ่ม API Routes ของ Employee, Task และ Assignment

factoryflow-final/frontend/src/lib/api-client.ts
→ เชื่อมการเรียก API ของ FactoryFlow

factoryflow-final/frontend/src/lib/roles.ts
→ เพิ่มสิทธิ์/เมนูของระบบ Task

factoryflow-final/frontend/src/components/app-sidebar.tsx
→ เพิ่มเมนูงาน, ให้ทุก Role เข้า Personnel ได้, เพิ่มเมนูข้อมูลส่วนตัว และเอาเมนูบัญชีผู้ใช้ออก

factoryflow-final/frontend/src/routes/auth.tsx
→ เอา สมัครสมาชิก + บัญชีทดลอง ออกจากหน้า Login

factoryflow-final/frontend/src/routes/_authenticated/route.tsx
→ แก้ไม่ให้ระบบ Auto-login บัญชีทดลอง และบังคับให้คนที่ยังไม่ Login ไปหน้า /auth


==================================================
