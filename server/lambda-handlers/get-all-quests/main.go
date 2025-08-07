package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lms_v0/internal/database"
)

var svc database.Service

func init() {
	// Initialize database connection using Supabase direct connection
	dsn := os.Getenv("PRODUCTION_DB_DSN")
	if dsn == "" {
		log.Fatal("PRODUCTION_DB_DSN environment variable is required")
	}

	// Update DSN to use direct connection instead of pooler
	// Replace pooler connection with direct connection
	dsn = strings.Replace(dsn, "aws-0-ap-south-1.pooler.supabase.com:6543", "db.xhztdzbyjttmxhmphzdv.supabase.co:5432", 1)
	dsn = strings.Replace(dsn, "postgres.xhztdzbyjttmxhmphzdv", "postgres", 1)

	// Add unique application name for each Lambda invocation
	separator := "?"
	if strings.Contains(dsn, "?") {
		separator = "&"
	}
	dsn = fmt.Sprintf("%s%sapplication_name=lambda_all_quests_%d", dsn, separator, time.Now().UnixNano())

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:                                   logger.Default.LogMode(logger.Silent),
		PrepareStmt:                              false, // Disable prepared statements for Supabase transaction pooling
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Create service instance with the database
	svc = &service{db: db}
}

// service implements the database.Service interface
type service struct {
	db *gorm.DB
}

func (s *service) Health() map[string]string {
	return map[string]string{"status": "up"}
}

func (s *service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	var quests []database.Quest
	err := s.db.Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Find(&quests).Error
	if err != nil {
		return nil, err
	}

	metas := make([]database.QuestMeta, len(quests))
	for i, q := range quests {
		metas[i] = database.QuestMeta{
			ID:          q.ID,
			Name:        q.Name,
			Slug:        q.Slug,
			Description: q.Description,
			Image:       q.Image,
			Category:    q.Category,
			TechStack:   q.TechStack,
			Topics:      q.Topics,
			Difficulty:  q.Difficulty,
			CreatedAt:   q.CreatedAt,
			UpdatedAt:   q.UpdatedAt,
		}
	}
	return metas, nil
}

func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	// This is not used in this handler
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetAllCheckpointsForQuest(questID string) ([]database.Checkpoint, error) {
	// This is not used in this handler
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetCheckpointByID(id string) (*database.Checkpoint, error) {
	// This is not used in this handler
	return nil, fmt.Errorf("not implemented in this handler")
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	metas, err := svc.GetAllQuests()
	if err != nil {
		log.Printf("Error getting all quests: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Internal server error"}`,
		}, nil
	}

	bodyBytes, err := json.Marshal(metas)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Internal server error"}`,
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
		Body: string(bodyBytes),
	}, nil
}

func main() {
	lambda.Start(handler)
}
