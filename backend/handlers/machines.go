package handlers

import (
	"encoding/json"
	"net/http"

	"factoryflow/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MachineHandler รวม dependency ที่ handler ฝั่งเครื่องจักร/แผนผลิต/วัตถุดิบต้องใช้
type MachineHandler struct {
	pool *pgxpool.Pool
}

// NewMachineHandler สร้าง MachineHandler ตัวใหม่
func NewMachineHandler(pool *pgxpool.Pool) *MachineHandler {
	return &MachineHandler{pool: pool}
}

// ListMachines คืนรายการเครื่องจักรทั้งหมด
func (h *MachineHandler) ListMachines(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `SELECT id,name,status,hours FROM machines ORDER BY id`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	out := []models.Machine{}
	for rows.Next() {
		var m models.Machine
		rows.Scan(&m.ID, &m.Name, &m.Status, &m.Hours)
		out = append(out, m)
	}
	writeJSON(w, out)
}

// CreateMachine เพิ่มเครื่องจักรใหม่
func (h *MachineHandler) CreateMachine(w http.ResponseWriter, r *http.Request) {
	var m models.Machine
	if json.NewDecoder(r.Body).Decode(&m) != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO machines(id,name,status,hours) VALUES($1,$2,$3,$4)`,
		m.ID, m.Name, m.Status, m.Hours)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

// ListPlans คืนรายการแผนการผลิตทั้งหมด
func (h *MachineHandler) ListPlans(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.pool.Query(r.Context(), `SELECT id,product,target,done,status FROM plans ORDER BY id DESC`)
	defer rows.Close()

	out := []models.Plan{}
	for rows.Next() {
		var p models.Plan
		rows.Scan(&p.ID, &p.Product, &p.Target, &p.Done, &p.Status)
		out = append(out, p)
	}
	writeJSON(w, out)
}

// ListMaterials คืนรายการวัตถุดิบทั้งหมด
func (h *MachineHandler) ListMaterials(w http.ResponseWriter, r *http.Request) {
	rows, _ := h.pool.Query(r.Context(), `SELECT code,name,qty,stock_pct FROM materials ORDER BY code`)
	defer rows.Close()

	out := []models.Material{}
	for rows.Next() {
		var mt models.Material
		rows.Scan(&mt.Code, &mt.Name, &mt.Qty, &mt.StockPct)
		out = append(out, mt)
	}
	writeJSON(w, out)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}
