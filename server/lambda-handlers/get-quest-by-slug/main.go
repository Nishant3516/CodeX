package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"lms_v0/internal/aws"
	"lms_v0/internal/database"
	"lms_v0/utils"
)

var svc database.Service

func init() {
	// Initialize AWS clients first
	aws.InitAWS()

	// Initialize database connection using Supabase direct connection
	dsn := os.Getenv("PRODUCTION_DB_DSN")
	if dsn == "" {
		log.Fatal("PRODUCTION_DB_DSN environment variable is required")
	}

	// Add unique application name for each Lambda invocation

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
	// This is not used in this handler
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	var quest database.Quest
	log.Printf("Fetching quest with slug: %s", slug)
	// Preload all relevant associations for a full quest view
	err := s.db.
		Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Preload("FinalTestCases").
		Preload("Checkpoints").
		Preload("Checkpoints.Testcases").
		Preload("Checkpoints.Topics").
		Preload("Checkpoints.Hints").
		Preload("Checkpoints.Resources").
		First(&quest, "slug = ?", slug).Error

	if err != nil {
		return nil, err
	}

	// Generate presigned URLs for S3 resources
	bucketName := os.Getenv("AWS_S3_BUCKET_NAME")
	if bucketName == "" {
		log.Printf("Warning: AWS_S3_BUCKET_NAME not set, skipping presigned URL generation")
		return &quest, nil
	}

	// Generate presigned URL for boilerplate code
	if quest.BoilerPlateCode != "" {
		presignedBoilerPlateUrl, err := utils.GeneratePresignedUrl(bucketName, quest.BoilerPlateCode)
		if err != nil {
			log.Printf("Error generating presigned URL for boilerplate: %v", err)
		} else {
			quest.BoilerPlateCode = presignedBoilerPlateUrl
		}
	}

	// Generate presigned URLs for checkpoint testing code
	for i := range quest.Checkpoints {
		if quest.Checkpoints[i].TestingCode != "" {
			presignedCheckpointUrl, err := utils.GeneratePresignedUrl(bucketName, quest.Checkpoints[i].TestingCode)
			if err != nil {
				log.Printf("Error generating presigned URL for checkpoint %s: %v", quest.Checkpoints[i].ID, err)
			} else {
				quest.Checkpoints[i].TestingCode = presignedCheckpointUrl
			}
		}
	}

	return &quest, nil
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
	slug := req.PathParameters["slug"]
	if slug == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Missing slug parameter"}`,
		}, nil
	}

	quest, err := svc.GetQuestBySlug(slug)
	if err != nil {
		log.Printf("Error getting quest by slug %s: %v", slug, err)
		if err == gorm.ErrRecordNotFound {
			return events.APIGatewayProxyResponse{
				StatusCode: 404,
				Headers: map[string]string{
					"Content-Type":                 "application/json",
					"Access-Control-Allow-Origin":  "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
				Body: `{"error":"Quest not found"}`,
			}, nil
		}
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

	bodyBytes, err := json.Marshal(quest)
	if err != nil {
		log.Printf("Error marshaling quest response: %v", err)
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
