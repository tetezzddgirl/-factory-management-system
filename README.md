# FactoryFlow

ระบบบริหารจัดการการผลิต — React (frontend) + Go (backend)

```
.
├── frontend/     # React + Vite + TanStack Router + MUI
├── backend/      # Go + chi + pgx + JWT + PostgreSQL
└── docker-compose.yml   # รัน postgres + backend พร้อมกัน
```

## รันแบบ local (dev)

**Backend + Postgres:**
```bash
docker compose up --build
```
Backend จะรันที่ `http://localhost:8090`

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
เปิด `http://localhost:5173`

รายละเอียดเพิ่มเติมของแต่ละฝั่งดูได้ที่ `frontend/AGENTS.md` และ `backend/README.md`
