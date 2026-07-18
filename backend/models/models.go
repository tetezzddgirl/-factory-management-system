package models

// User คือผู้ใช้งานระบบ
type User struct {
	ID           int    `json:"id"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Role         string `json:"role"`
}

// Credentials ใช้รับข้อมูล signup/login
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Machine คือเครื่องจักรในโรงงาน
type Machine struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Hours  int    `json:"hours"`
}

// Plan คือแผนการผลิต
type Plan struct {
	ID      int    `json:"id"`
	Product string `json:"product"`
	Target  int    `json:"target"`
	Done    int    `json:"done"`
	Status  string `json:"status"`
}

// Material คือวัตถุดิบ
type Material struct {
	Code     string `json:"code"`
	Name     string `json:"name"`
	Qty      string `json:"qty"`
	StockPct int    `json:"stock_pct"`
}
