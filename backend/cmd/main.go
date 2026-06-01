package main

import (
	"log"
	"os"
	"shelfspot-backend/internal/config"
	"shelfspot-backend/internal/database"
	"shelfspot-backend/internal/middleware"
	"shelfspot-backend/internal/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	if err := os.MkdirAll(cfg.DataDir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}
	log.Printf("Data directory ensured: %s", cfg.DataDir)

	if err := database.Init(cfg.DBPath); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := gin.Default()

	r.Use(middleware.CORS())

	r.Static("/uploads", "./uploads")

	routes.SetupRoutes(r)

	log.Printf("Server starting on port %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
