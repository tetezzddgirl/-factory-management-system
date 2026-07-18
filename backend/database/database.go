package database

import (
	"context"
	"fmt"

	"factoryflow/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect เปิดการเชื่อมต่อ PostgreSQL connection pool จากค่าใน config
func Connect(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)
	return pgxpool.New(ctx, dsn)
}

// Migrate สร้างตารางที่จำเป็นถ้ายังไม่มี
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ว่าง',
  hours INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  product TEXT NOT NULL,
  target INT NOT NULL,
  done INT DEFAULT 0,
  due_date DATE,
  status TEXT DEFAULT 'รอเริ่ม'
);
CREATE TABLE IF NOT EXISTS materials (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  qty TEXT,
  stock_pct INT DEFAULT 100
);`)
	return err
}
