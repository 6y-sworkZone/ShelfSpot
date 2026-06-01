package database

import (
	"log"
	"os"
	"shelfspot-backend/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Init(dbPath string) error {
	if err := os.MkdirAll("data", 0755); err != nil {
		log.Printf("Warning: failed to create data directory: %v", err)
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	err = DB.AutoMigrate(
		&models.House{},
		&models.Room{},
		&models.Container{},
		&models.Category{},
		&models.Item{},
	)
	if err != nil {
		return err
	}

	log.Println("Database initialized successfully")
	return nil
}

func GetDB() *gorm.DB {
	return DB
}
