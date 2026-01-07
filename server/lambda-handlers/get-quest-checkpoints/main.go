package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"gorm.io/gorm"

	"lms_v0/internal/database"
)

var svc database.Service

type service struct{ db *gorm.DB }

func init() {
	svc = &service{db: database.Connect("quest_checkpoints")}
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

// GetQuestBySlug loads quest and its checkpoints
func (s *service) GetQuestBySlug(slug string) (*database.Quest, error) {
	var quest database.Quest
	err := s.db.
		Preload("Checkpoints").
		First(&quest, "slug = ?", slug).Error
	if err != nil {
		return nil, err
	}
	return &quest, nil
}

// Unused interface methods
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

func respond(status int, body interface{}) (events.APIGatewayProxyResponse, error) {
	var data []byte
	switch v := body.(type) {
	case string:
		data = []byte(v)
	default:
		b, err := json.Marshal(v)
		if err != nil {
			b = []byte(`{"error":"marshal"}`)
		}
		data = b
	}
	return events.APIGatewayProxyResponse{
		StatusCode: status,
		Body:       string(data),
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type,Authorization",
		},
	}, nil
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if strings.EqualFold(req.HTTPMethod, "OPTIONS") {
		return respond(200, "{}")
	}

	questSlug := strings.TrimSpace(req.PathParameters["questSlug"])
	if questSlug == "" {
		return respond(400, map[string]string{"error": "Missing questSlug parameter"})
	}

	log.Printf("get-quest-checkpoints: fetching checkpoints for slug=%s", questSlug)
	quest, err := svc.GetQuestBySlug(questSlug)
	if err != nil {
		log.Printf("get-quest-checkpoints: error fetching quest: %v", err)
		return respond(404, map[string]string{"error": "Quest not found"})
	}

	checkpoints := make([]map[string]interface{}, len(quest.Checkpoints))
	for i, cp := range quest.Checkpoints {
		checkpoints[i] = map[string]interface{}{
			"id":           fmt.Sprintf("%d", i+1),
			"title":        cp.Title,
			"description":  cp.Description,
			"requirements": cp.Requirements,
			"status":       "pending",
		}
	}

	resp := map[string]interface{}{
		"success":     true,
		"checkpoints": checkpoints,
		"total":       len(checkpoints),
	}

	return respond(200, resp)
}

func main() { lambda.Start(handler) }
