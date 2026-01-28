package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/gorm"

	"lms_v0/internal/aws"
	"lms_v0/internal/database"
	"lms_v0/utils"
)

var svc database.Service

func init() {
	// Initialize AWS clients first
	aws.InitAWS()
	db := database.Connect("get_quest_by_slug")
	svc = &service{db: db}
}

// service implements the database.Service interface
type service struct {
	db *gorm.DB
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}
func (s *service) AddQuest(req database.AddQuestRequest) (string, error) {
	return "", fmt.Errorf("not implemented in this handler")
}

func (s *service) DeleteQuest(string) error { return fmt.Errorf("not implemented") }
func (s *service) GetQuestsByLanguage(string) ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}

func (s *service) GetAllTechnologies() []string { return nil }
func (s *service) GetAllConcepts() []string     { return nil }
func (s *service) GetAllCategories() []string   { return nil }
func (s *service) GetAllDifficulties() []string { return nil }

func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	var quest database.Quest

	err := s.db.
		Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Preload("FinalTestCases").
		First(&quest, "slug = ?", slug).Error

	if err != nil {
		return nil, err
	}

	var checkpoints []database.Checkpoint
	err = s.db.
		Where("quest_id = ?", quest.ID).
		Order("order_index IS NULL ASC").
		Order("order_index ASC").
		Order("created_at ASC").
		Order("id ASC").
		Preload("Testcases").
		Preload("Topics").
		Preload("Hints").
		Preload("Resources").
		Find(&checkpoints).Error

	if err != nil {
		return nil, err
	}

	quest.Checkpoints = checkpoints

	bucketName := os.Getenv("AWS_S3_BUCKET_NAME")
	if bucketName == "" {
		return &quest, nil
	}

	if quest.BoilerPlateCode != "" {
		if presigned, err := utils.GeneratePresignedUrl(bucketName, quest.BoilerPlateCode); err == nil {
			quest.BoilerPlateCode = presigned
		} else {
			log.Printf("presign boilerplate: %v", err)
		}
	}
	for i := range quest.Checkpoints {
		if quest.Checkpoints[i].TestingCode != "" {
			if presigned, err := utils.GeneratePresignedUrl(bucketName, quest.Checkpoints[i].TestingCode); err == nil {
				quest.Checkpoints[i].TestingCode = presigned
			} else {
				log.Printf("presign checkpoint %s: %v", quest.Checkpoints[i].ID, err)
			}
		}
	}
	return &quest, nil
}
func (s *service) GetAllCheckpointsForQuest(string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}
func (s *service) GetCheckpointByID(string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	slug := req.PathParameters["slug"]
	if slug == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}, Body: `{"error":"Missing slug parameter"}`}, nil
	}
	quest, err := svc.GetQuestBySlug(slug)
	if err != nil {
		log.Printf("Error getting quest by slug %s: %v", slug, err)
		if err == gorm.ErrRecordNotFound {
			return events.APIGatewayProxyResponse{StatusCode: 404, Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}, Body: `{"error":"Quest not found"}`}, nil
		}
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}, Body: `{"error":"Internal server error"}`}, nil
	}
	bodyBytes, err := json.Marshal(quest)
	if err != nil {
		log.Printf("marshal quest: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}, Body: `{"error":"Internal server error"}`}, nil
	}
	return events.APIGatewayProxyResponse{StatusCode: 200, Headers: map[string]string{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}, Body: string(bodyBytes)}, nil
}

func main() { lambda.Start(handler) }
