package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/gorm"

	"lms_v0/internal/database"
	"lms_v0/internal/redis"
	"lms_v0/k8s"
	"lms_v0/utils"
)

type StartQuestRequest struct {
	Language    string `json:"language"`
	ProjectSlug string `json:"projectSlug"`
	LabID       string `json:"labId"`
}

type StartQuestResponse struct {
	Success bool   `json:"success"`
	LabID   string `json:"labId"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

var (
	svc                        database.Service
	ALLOWED_CONCURRENT_LABS, _ = strconv.ParseUint(os.Getenv("ALLOWED_CONCURRENT_LABS"), 10, 64)
)

type service struct{ db *gorm.DB }

func init() {
	// Initialize shared DB connection for quest metadata
	db := database.Connect("start_quest_handler")
	svc = &service{db: db}
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

// Implement only the methods we need; others are stubs
func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	var quest database.Quest
	// mirror internal/database.GetQuestBySlug preloads
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
	return &quest, nil
}

func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetQuestsByLanguage(string) ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetAllCheckpointsForQuest(string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetCheckpointByID(string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetAllTechnologies() []string { return nil }
func (s *service) GetAllConcepts() []string     { return nil }
func (s *service) GetAllCategories() []string   { return nil }
func (s *service) GetAllDifficulties() []string { return nil }
func (s *service) AddQuest(database.AddQuestRequest) (string, error) {
	return "", fmt.Errorf("not implemented")
}
func (s *service) DeleteQuest(string) error { return fmt.Errorf("not implemented") }

func jsonHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("start-quest-handler: invoked")

	if req.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{StatusCode: 200, Headers: jsonHeaders(), Body: "{}"}, nil
	}

	// Init Redis utilities once per invocation
	redis.InitRedis()
	utils.InitRedisUtils(redis.RedisClient, redis.Context)

	var payload StartQuestRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("start-quest-handler: invalid payload: %v", err)
		res := StartQuestResponse{Success: false, Error: "Invalid JSON payload"}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: string(b)}, nil
	}

	if payload.Language == "" {
		res := StartQuestResponse{Success: false, Error: "Missing language parameter"}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: string(b)}, nil
	}
	if payload.ProjectSlug == "" {
		res := StartQuestResponse{Success: false, Error: "Missing projectSlug parameter"}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: string(b)}, nil
	}
	if payload.LabID == "" {
		payload.LabID = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	// Check concurrent lab limits
	utils.RedisUtilsInstance.CreateLabProgressQueueIfNotExists()
	utils.RedisUtilsInstance.CreateLabMonitoringQueueIfNotExists()
	count, err := utils.RedisUtilsInstance.GetNumberOfActiveLabInstances()
	if err != nil {
		log.Printf("start-quest-handler: failed to get active labs: %v", err)
		res := StartQuestResponse{Success: false, Error: fmt.Sprintf("Failed to get number of active lab instances: %v", err)}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: jsonHeaders(), Body: string(b)}, nil
	}
	if ALLOWED_CONCURRENT_LABS > 0 && count > ALLOWED_CONCURRENT_LABS {
		res := StartQuestResponse{Success: false, Error: "Exceeded maximum concurrent labs"}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 429, Headers: jsonHeaders(), Body: string(b)}, nil
	}

	// Fetch quest metadata from DB
	quest, err := svc.GetQuestBySlug(payload.ProjectSlug)
	if err != nil {
		log.Printf("start-quest-handler: quest not found for slug=%s: %v", payload.ProjectSlug, err)
		res := StartQuestResponse{Success: false, Error: fmt.Sprintf("Quest not found: %v", err)}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 404, Headers: jsonHeaders(), Body: string(b)}, nil
	}

	// Initialize k8s in-cluster
	if err := k8s.InitK8sInCluster(); err != nil {
		log.Printf("start-quest-handler: failed to init k8s: %v", err)
		res := StartQuestResponse{Success: false, Error: fmt.Sprintf("Failed to initialize kubernetes client: %v", err)}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: jsonHeaders(), Body: string(b)}, nil
	}

	// Prepare quest params; tests live under devsarena/projects/{slug}/tests/
	questParams := k8s.SpinUpQuestParams{
		LabID:                 payload.LabID,
		Language:              payload.Language,
		ProjectSlug:           payload.ProjectSlug,
		S3Bucket:              os.Getenv("AWS_S3_BUCKET_NAME"),
		BoilerplateKey:        quest.BoilerPlateCode,
		TestFilesKey:          "",
		Namespace:             os.Getenv("K8S_NAMESPACE"),
		ShouldCreateNamespace: false,
	}

	// Create lab instance in Redis
	labInstance := utils.LabInstanceEntry{
		Language:       payload.Language,
		LabID:          payload.LabID,
		CreatedAt:      time.Now().Unix(),
		Status:         utils.Created,
		LastUpdatedAt:  time.Now().Unix(),
		ProgressLogs:   []utils.LabProgressEntry{},
		DirtyReadPaths: []string{},
	}
	utils.RedisUtilsInstance.CreateLabInstance(labInstance)

	log.Printf("start-quest-handler: starting quest pod labId=%s projectSlug=%s language=%s", payload.LabID, payload.ProjectSlug, payload.Language)
	if err := k8s.SpinUpQuestPod(questParams); err != nil {
		log.Printf("start-quest-handler: failed to spin up quest pod: %v", err)
		res := StartQuestResponse{Success: false, Error: fmt.Sprintf("Failed to spin up quest pod: %v", err)}
		b, _ := json.Marshal(res)
		return events.APIGatewayProxyResponse{StatusCode: 500, Headers: jsonHeaders(), Body: string(b)}, nil
	}

	res := StartQuestResponse{Success: true, LabID: payload.LabID, Message: "Quest environment started successfully"}
	b, _ := json.Marshal(res)
	return events.APIGatewayProxyResponse{StatusCode: 200, Headers: jsonHeaders(), Body: string(b)}, nil
}

func main() { lambda.Start(handler) }
