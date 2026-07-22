package main

import (
	"context"
	"log"
	"net/http"

	"factoryflow/config"
	"factoryflow/database"
	"factoryflow/handlers"
	"factoryflow/middleware"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := database.Connect(ctx, cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	if err := database.Migrate(ctx, pool); err != nil {
		log.Fatal(err)
	}

	secret := []byte(cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(pool, secret)
	machineHandler := handlers.NewMachineHandler(pool)

	r := chi.NewRouter()
	r.Use(chimw.Logger, chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		//AllowedOrigins: []string{cfg.CORSOrigin},
		AllowedOrigins: cfg.CORSOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte(`{"ok":true}`)) })
	r.Post("/auth/signup", authHandler.Signup)
	r.Post("/auth/login", authHandler.Login)

	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(secret))
		r.Get("/api/machines", machineHandler.ListMachines)
		r.Post("/api/machines", machineHandler.CreateMachine)
		r.Get("/api/plans", machineHandler.ListPlans)
		r.Get("/api/materials", machineHandler.ListMaterials)
	})

	log.Println("listening on :" + cfg.ServerPort)
	log.Fatal(http.ListenAndServe(":"+cfg.ServerPort, r))
}
