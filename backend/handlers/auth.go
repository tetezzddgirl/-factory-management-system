package handlers

import (
	"encoding/json"
	"net/http"

	"factoryflow/models"
	"factoryflow/utils"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler รวม dependency ที่ handler ฝั่ง auth ต้องใช้
type AuthHandler struct {
	pool   *pgxpool.Pool
	secret []byte
}

// NewAuthHandler สร้าง AuthHandler ตัวใหม่
func NewAuthHandler(pool *pgxpool.Pool, secret []byte) *AuthHandler {
	return &AuthHandler{pool: pool, secret: secret}
}

// Signup สมัครสมาชิกใหม่แล้วคืน JWT token
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var c models.Credentials
	if json.NewDecoder(r.Body).Decode(&c) != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
	var id int
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id`,
		c.Email, string(hash)).Scan(&id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	h.writeToken(w, id, c.Email)
}

// Login ตรวจสอบ credentials แล้วคืน JWT token
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var c models.Credentials
	if json.NewDecoder(r.Body).Decode(&c) != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}
	var id int
	var hash string
	err := h.pool.QueryRow(r.Context(),
		`SELECT id, password_hash FROM users WHERE email=$1`, c.Email).Scan(&id, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(c.Password)) != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	h.writeToken(w, id, c.Email)
}

func (h *AuthHandler) writeToken(w http.ResponseWriter, id int, email string) {
	tok, err := utils.GenerateToken(h.secret, id, email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": tok})
}
