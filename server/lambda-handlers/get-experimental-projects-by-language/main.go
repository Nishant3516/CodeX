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
	svc = &service{db: database.Connect("experimental_projects_by_language")}
}

func (s *service) Health() map[string]string { return map[string]string{"status": "up"} }
func (s *service) Close() error {
	if s.db == nil {
		return nil
	}
	sqlDB, _ := s.db.DB()
	return sqlDB.Close()
}

// GetQuestsByLanguage returns quests filtered by technology/language
func (s *service) GetQuestsByLanguage(language string) ([]database.QuestMeta, error) {
	var quests []database.Quest

	// Join with technology table to filter by language
	err := s.db.
		Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Joins("JOIN quest_technologies ON quests.id = quest_technologies.quest_id").
		Joins("JOIN technologies ON quest_technologies.technology_id = technologies.id").
		Where("technologies.name = ?", language).
		Find(&quests).Error

	if err != nil {
		return nil, err
	}

	// Convert to QuestMeta structs
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

// Unused interface methods
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) GetQuestBySlug(string) (*database.Quest, error) {
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

	language := strings.TrimSpace(strings.ToLower(req.PathParameters["language"]))
	if language == "" {
		return respond(400, map[string]string{"error": "Missing language parameter"})
	}

	log.Printf("get-experimental-projects-by-language: fetching projects for language=%s", language)
	projects, err := svc.GetQuestsByLanguage(language)
	if err != nil {
		log.Printf("get-experimental-projects-by-language: error fetching quests: %v", err)
		return respond(500, map[string]string{"error": "Failed to get projects"})
	}

	resp := map[string]interface{}{
		"success":  true,
		"language": language,
		"projects": projects,
	}

	return respond(200, resp)
}

func main() { lambda.Start(handler) }
