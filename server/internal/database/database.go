package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Service represents a service that interacts with a database.
type Service interface {
	Health() map[string]string
	Close() error
	GetAllQuests() ([]QuestMeta, error)
	GetQuestBySlug(slug string) (*Quest, error)
	GetAllCheckpointsForQuest(questID string) ([]Checkpoint, error)
	GetCheckpointByID(id string) (*Checkpoint, error)

	// Lookup options for Add Project form
	GetAllTechnologies() []string
	GetAllConcepts() []string
	GetAllCategories() []string
	GetAllDifficulties() []string

	// Quest management
	AddQuest(req AddQuestRequest) (string, error)
	DeleteQuest(slug string) error
}

// service implements the Service interface using GORM
type service struct {
	db *gorm.DB
}

var (
	dbDsn      = os.Getenv("PRODUCTION_DB_DSN")
	dbInstance *service
)

func New() Service {
	if dbInstance != nil {
		return dbInstance
	}
	dsn := dbDsn
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal(err)
	}
	dbInstance = &service{
		db: db,
	}
	err = Init()
	if err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}
	// err = Seed()
	return dbInstance
}

func (s *service) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	stats := make(map[string]string)

	sqlDB, err := s.db.DB()
	if err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db error: %v", err)
		log.Fatalf("db error: %v", err)
		return stats
	}

	err = sqlDB.PingContext(ctx)
	if err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		log.Fatalf("db down: %v", err)
		return stats
	}

	stats["status"] = "up"
	stats["message"] = "It's healthy"

	dbStats := sqlDB.Stats()
	stats["open_connections"] = strconv.Itoa(dbStats.OpenConnections)
	stats["in_use"] = strconv.Itoa(dbStats.InUse)
	stats["idle"] = strconv.Itoa(dbStats.Idle)
	stats["wait_count"] = strconv.FormatInt(dbStats.WaitCount, 10)
	stats["wait_duration"] = dbStats.WaitDuration.String()
	stats["max_idle_closed"] = strconv.FormatInt(dbStats.MaxIdleClosed, 10)
	stats["max_lifetime_closed"] = strconv.FormatInt(dbStats.MaxLifetimeClosed, 10)

	if dbStats.OpenConnections > 40 {
		stats["message"] = "The database is experiencing heavy load."
	}
	if dbStats.WaitCount > 1000 {
		stats["message"] = "The database has a high number of wait events, indicating potential bottlenecks."
	}
	if dbStats.MaxIdleClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Many idle connections are being closed, consider revising the connection pool settings."
	}
	if dbStats.MaxLifetimeClosed > int64(dbStats.OpenConnections)/2 {
		stats["message"] = "Many connections are being closed due to max lifetime, consider increasing max lifetime or revising the connection usage pattern."
	}

	return stats
}

func (s *service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
