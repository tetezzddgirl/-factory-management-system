# แผนงาน: MUI Migration + Go Backend Starter

## ส่วนที่ 1 — เปลี่ยน UI เป็น MUI ทั้งโปรเจกต์

### ติดตั้ง / ตั้งค่า
- `bun add @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-data-grid @mui/x-date-pickers`
- ลบการพึ่งพา shadcn: `src/components/ui/*`, ตัวแปร Tailwind theme ใน `src/styles.css` (คงไว้แค่ reset + font)
- สร้าง `src/theme/muiTheme.ts` — ธีมสีฟ้าอ่อน (primary `#4A90E2`, background gradient, rounded 12–16, shadow นุ่มๆ)
- สร้าง `src/theme/AppThemeProvider.tsx` ใช้ `ThemeProvider` + `CssBaseline` ครอบใน `__root.tsx`
- เก็บ `framer-motion` ไว้เพื่อ animation

### เขียนหน้าใหม่ด้วย MUI (แทน shadcn เดิม)
- `auth.tsx` — `Card`, `Tabs`, `TextField`, `Button`, `Alert` + ปุ่มบัญชีทดลอง
- `AppSidebar` → `Drawer` (permanent + mini variant toggle) + `List/ListItemButton` พร้อมไอคอน MUI
- Layout `_authenticated.tsx` — `Box` flex + `AppBar` บน มีปุ่ม toggle sidebar
- Dashboard (`index.tsx`) — `Grid`, `Card`, สถิติ + Recharts (คงไว้)
- `planning`, `materials`, `production`, `quality`, `machines`, `maintenance`, `personnel`, `users`, `warehouse` — ใช้ `DataGrid` (`@mui/x-data-grid`) แทนตาราง shadcn + `Chip` สำหรับ status
- `AddItemDialog` → เขียนใหม่ด้วย `Dialog`, `DialogTitle/Content/Actions`, `TextField`, `Select`

### Animation
- คงลูกเล่นด้วย `motion.div` ครอบ `Card`/`Paper` (fade-in, hover lift)
- ใช้ MUI `Fade`, `Grow`, `Zoom` เสริมที่ dialog / sidebar

### ล้างของเก่า
- ลบ `src/components/ui/`, `tailwind` utility classes ที่ไม่ใช้แล้ว
- ลบ `class-variance-authority`, `tailwind-merge`, `clsx`, radix packages (optional cleanup)

---

## ส่วนที่ 2 — Go Backend Starter (ให้ไปรันเอง)

สร้างโฟลเดอร์ `go-backend/` ในโปรเจกต์ (ไม่กระทบ frontend build) ประกอบด้วย:

```text
go-backend/
  main.go              # entry, chi router, CORS, graceful shutdown
  go.mod / go.sum
  .env.example         # DATABASE_URL, JWT_SECRET, PORT
  README.md            # วิธีรัน + deploy (Fly.io/Render)
  Dockerfile           # multi-stage build
  internal/
    config/            # env loader
    db/                # pgx pool + migrations runner
    auth/              # JWT issue/verify, password bcrypt, middleware
    handlers/          # auth, machines, planning, materials, production,
                       # quality, maintenance, personnel, users, warehouse
    models/            # struct + repo (pgx)
    router/            # route registration
  migrations/
    001_init.sql       # users, roles, machines, plans, materials,
                       # production_jobs, quality_checks, maintenance_tickets,
                       # personnel, warehouse_items
```

**ฟีเจอร์ starter:**
- `chi` router + `cors` middleware (allow frontend origin)
- `pgx/v5` connection pool
- Auth: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` (JWT bearer)
- CRUD REST สำหรับทุกโมดูล (`GET/POST/PUT/DELETE /api/{resource}`)
- Role middleware (admin/manager/operator)
- Health check `GET /healthz`
- SQL migrations รันตอนบูต
- Dockerfile + README (รัน local: `docker compose up` หรือ `go run .`)

---

## ส่วนที่ 3 — เชื่อม Frontend เข้ากับ Go API (optional switch)

- สร้าง `src/lib/apiClient.ts` — fetch wrapper + JWT จาก `localStorage`
- เพิ่ม env `VITE_API_BASE_URL` (default `http://localhost:8080`)
- **ยังไม่ตัด Supabase ออก** เพราะยังต้อง login ใช้งานได้ระหว่างที่ยังไม่ deploy Go — แต่จะเพิ่มคอมเมนต์/hook `useApi()` ที่พร้อมสลับ
- ถ้าอยากตัด Supabase ออกทันที บอกได้ ผมจะรื้อ auth ใช้ JWT จาก Go แทน

---

## ผลลัพธ์ที่จะได้
1. หน้าเว็บทั้งหมดเป็น MUI look-and-feel (Material 3 tone ฟ้าอ่อน) + animation
2. โฟลเดอร์ `go-backend/` พร้อม `README.md` — clone/copy ไปรันได้เลย
3. Frontend มี API client เตรียมพร้อมเชื่อม Go เมื่อ deploy เสร็จ

## หมายเหตุ
- งานใหญ่ ใช้เวลาหลาย turn — ผมจะเริ่มจาก setup MUI + theme + layout + auth ก่อน แล้วค่อยไล่หน้าโมดูล
- ยืนยันก่อนเริ่ม: **ต้องการให้คง Supabase auth ไว้ก่อน** (ระหว่างที่ Go ยังไม่ deploy) ใช่ไหม? หรืออยากให้ตัด Supabase ออกเลย ให้ frontend ชี้ไป Go ล้วนๆ (ต้องรัน Go local ถึงจะ login ได้)