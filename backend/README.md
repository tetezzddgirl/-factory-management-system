# FactoryFlow Go Backend

Backend สำหรับระบบบริหารจัดการการผลิต — Go + Gin + GORM + JWT + PostgreSQL

## โครงสร้างโฟลเดอร์
```
backend/
├── main.go            # จุดเริ่มต้นของแอป, ตั้ง router
├── config/             # อ่านค่า environment variables
├── database/           # เชื่อมต่อ + migrate PostgreSQL
├── models/              # struct ของข้อมูลในระบบ
├── handlers/           # ตัวจัดการ request (auth, machines/plans/materials)
├── middleware/       # ตรวจสอบ JWT ก่อนเข้าถึง route ที่ต้อง login
└── utils/                # helper สร้าง/ตรวจสอบ JWT
```

## Run
```bash
cp .env.example .env    # ตั้งค่า DB และ JWT_SECRET ตามจริง
go mod tidy
go run .
```
เปิด `http://localhost:8090/health`

หรือรันผ่าน Docker Compose ที่ root ของโปรเจกต์:
```bash
docker compose up --build
```

## Endpoints
| Method | Path                | Auth | คำอธิบาย         |
|--------|---------------------|------|------------------|
| POST   | /auth/signup        | -    | สมัครสมาชิก      |
| POST   | /auth/login         | -    | เข้าสู่ระบบ (JWT) |
| GET    | /api/machines       | ✓    | รายการเครื่องจักร |
| POST   | /api/machines       | ✓    | เพิ่มเครื่องจักร  |
| GET    | /api/plans          | ✓    | แผนการผลิต       |
| GET    | /api/materials      | ✓    | วัตถุดิบ         |

## เชื่อมกับ Frontend
ตั้ง `VITE_API_URL=http://localhost:8090` ที่ฝั่ง frontend แล้วเรียกผ่าน `src/lib/api-client.ts`
