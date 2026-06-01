package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	ServerPort string
	DBPath     string
	DataDir    string
}

func Load() *Config {
	dataDir := getEnv("DATA_DIR", "data")
	dbPath := filepath.Join(dataDir, getEnv("DB_NAME", "shelfspot.db"))

	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8766"),
		DBPath:     dbPath,
		DataDir:    dataDir,
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
