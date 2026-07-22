// package config

// import "os"

// // Config รวมค่าตั้งค่าทั้งหมดของแอปที่อ่านจาก environment variables
// type Config struct {
// 	DBHost     string
// 	DBUser     string
// 	DBPassword string
// 	DBName     string
// 	DBPort     string
// 	JWTSecret  string
// 	ServerPort string
// 	CORSOrigin string
// }

// // Load อ่านค่า environment variables แล้วคืนค่าเป็น Config
// // ค่า default จะถูกใช้เมื่อไม่ได้ตั้งค่าตัวแปรนั้นไว้
// func Load() *Config {
// 	return &Config{
// 		DBHost:     getEnv("DB_HOST", "localhost"),
// 		DBUser:     getEnv("DB_USER", "factory"),
// 		DBPassword: getEnv("DB_PASSWORD", "factory_dev_pw"),
// 		DBName:     getEnv("DB_NAME", "factory_db"),
// 		DBPort:     getEnv("DB_PORT", "5432"),
// 		JWTSecret:  getEnv("JWT_SECRET", "change-this-secret-in-production"),
// 		ServerPort: getEnv("SERVER_PORT", "8090"),
// 		CORSOrigin: getEnv("CORS_ORIGIN", "http://localhost:5173"),
// 	}
// }

// func getEnv(key, fallback string) string {
// 	if v := os.Getenv(key); v != "" {
// 		return v
// 	}
// 	return fallback
// }


package config

import (
	"net/url"
	"os"
	"strings"
)

type Config struct {
	DBHost      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBPort      string
	JWTSecret   string
	ServerPort  string
	CORSOrigins []string // เปลี่ยนจาก string เดี่ยว เป็น slice
}

func Load() *Config {
	cfg := &Config{
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBUser:      getEnv("DB_USER", "factory"),
		DBPassword:  getEnv("DB_PASSWORD", "factory_dev_pw"),
		DBName:      getEnv("DB_NAME", "factory_db"),
		DBPort:      getEnv("DB_PORT", "5432"),
		JWTSecret:   getEnv("JWT_SECRET", "change-this-secret-in-production"),
		ServerPort:  getEnv("SERVER_PORT", "8090"),
		CORSOrigins: strings.Split(getEnv("CORS_ORIGIN", "http://localhost:5173"), ","),
	}

	// รองรับ DATABASE_URL ที่ Railway inject มาให้อัตโนมัติ
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		if parsed, err := url.Parse(dbURL); err == nil {
			cfg.DBHost = parsed.Hostname()
			cfg.DBPort = parsed.Port()
			if parsed.User != nil {
				cfg.DBUser = parsed.User.Username()
				if pw, ok := parsed.User.Password(); ok {
					cfg.DBPassword = pw
				}
			}
			cfg.DBName = strings.TrimPrefix(parsed.Path, "/")
		}
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}