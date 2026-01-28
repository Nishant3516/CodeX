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
	svc = &service{db: database.Connect("experimental_projects_languages")}
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

func (s *service) GetAllTechnologies() []string {
	var technologies []string
	s.db.Model(&database.Technology{}).Pluck("name", &technologies)
	return technologies
}

// Unused interface methods
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetQuestBySlug(string) (*database.Quest, error) {
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

	languages := svc.GetAllTechnologies()
	if languages == nil {
		languages = []string{}
	}

	resp := map[string]interface{}{
		"success":   true,
		"languages": languages,
	}

	log.Printf("get-experimental-project-languages: returning %d languages", len(languages))
	return respond(200, resp)
}

func main() { lambda.Start(handler) }
