package models

import "time"

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash string    `json:"-" gorm:"column:password_hash;not null"`
	Role         string    `json:"role" gorm:"default:operator"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
