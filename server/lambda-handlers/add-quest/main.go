package main

import (
	"context"
	"encoding/json"
	"fmt"
	"lms_v0/internal/database"
	"log"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

var svc database.Service

func init() {
	log.Printf("add-quest: init start")
	svc = &service{db: database.Connect("add_quest")}
	log.Printf("add-quest: init end")
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

// Helper functions to find existing entities
func (s *service) findTechnology(tx *gorm.DB, name string) (*database.Technology, error) {
	var tech database.Technology
	result := tx.Where("name = ?", name).First(&tech)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tech, nil
}

func (s *service) findTopic(tx *gorm.DB, name string) (*database.Topic, error) {
	var topic database.Topic
	result := tx.Where("name = ?", name).First(&topic)
	if result.Error != nil {
		return nil, result.Error
	}
	return &topic, nil
}

func (s *service) findCategory(tx *gorm.DB, name string) (*database.Category, error) {
	var category database.Category
	result := tx.Where("category = ?", name).First(&category)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}

func (s *service) findDifficulty(tx *gorm.DB, level string) (*database.Difficulty, error) {
	var difficulty database.Difficulty
	result := tx.Where("level = ?", level).First(&difficulty)
	if result.Error != nil {
		return nil, result.Error
	}
	return &difficulty, nil
}

// Generate slug from title
func generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters and keep only alphanumeric and hyphens
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// Implement only the methods we need; others are stubs
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
	return &quest, nil
}

func (s *service) GetQuestsByLanguage(string) ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented")
}
func (s *service) DeleteQuest(string) error { return fmt.Errorf("not implemented") }

func (s *service) AddQuest(req database.AddQuestRequest) (string, error) {
	log.Printf("AddQuest started: Title=%s, Category=%s, Difficulty=%s", req.Title, req.Category, req.Difficulty)
	start := time.Now()
	// Start transaction
	tx := s.db.Begin()
	log.Printf("DB transaction begun in %s", time.Since(start))
	defer func() {
		if r := recover(); r != nil {
			log.Printf("panic recovered after %s: %v", time.Since(start), r)
			tx.Rollback()
		}
	}()

	// Find technology
	techStart := time.Now()
	technologies := make([]*database.Technology, 0, len(req.Technology))
	log.Printf("Finding technologies, count=%d", len(req.Technology))
	for _, tech := range req.Technology {
		log.Printf("Finding technology: %s", tech)
		if tech == "" {
			return "", fmt.Errorf("technology cannot be empty")
		}
		if len(tech) > 50 {
			return "", fmt.Errorf("technology name too long: %s", tech)
		}
		technology, err := s.findTechnology(tx, tech)
		log.Printf("Technology %s found in %s", tech, time.Since(techStart))
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new technology if it doesn't exist
				technology = &database.Technology{
					ID:   uuid.New(),
					Name: tech,
				}
				if err := tx.Create(technology).Error; err != nil {
					tx.Rollback()
					return "", fmt.Errorf("failed to create technology: %v", err)
				}
				technologies = append(technologies, technology)
			} else {
				tx.Rollback()
				return "", fmt.Errorf("failed to find technology: %v", err)
			}
		}
		technologies = append(technologies, technology)
	}
	log.Printf("Technologies found in %s", time.Since(techStart))

	// Find topic (concept)
	concepts := make([]*database.Topic, 0, len(req.Concept))
	conceptStart := time.Now()
	log.Printf("Finding concepts, count=%d", len(req.Concept))
	for _, concept := range req.Concept {
		if concept == "" {
			return "", fmt.Errorf("concept cannot be empty")
		}

		topic, err := s.findTopic(tx, concept)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new topic if it doesn't exist
				topic = &database.Topic{
					ID:   uuid.New(),
					Name: concept,
				}
				if err := tx.Create(topic).Error; err != nil {
					tx.Rollback()
					return "", fmt.Errorf("failed to create topic: %v", err)
				}
				concepts = append(concepts, topic)
			} else {
				tx.Rollback()
				return "", fmt.Errorf("failed to find topic: %v", err)
			}
		}
		concepts = append(concepts, topic)
	}
	log.Printf("Concepts found in %s", time.Since(conceptStart))
	// Find category
	category, err := s.findCategory(tx, req.Category)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to find category: %v", err)
	}

	// Find difficulty
	difficulty, err := s.findDifficulty(tx, req.Difficulty)
	if err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to find difficulty: %v", err)
	}
	log.Printf("Category and difficulty found as %s", difficulty.Level)
	slug := generateSlug(req.Title)
	// Create quest
	questID := uuid.New()
	log.Printf("Creating quest with ID %s", questID)
	quest := database.Quest{
		ID:              questID,
		Name:            req.Title,
		Slug:            slug,
		Description:     req.Description,
		BoilerPlateCode: req.BoilerplateUrl,
		Requirements:    pq.StringArray(req.Requirements), // Empty for now, can be added later
		Image:           "",                               // Empty for now, can be added later
		CategoryID:      category.ID,
		DifficultyID:    difficulty.ID,
		FinalTestCode:   "", // Empty for now, can be added later
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Create quest in database
	if err := tx.Create(&quest).Error; err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to create quest: %v", err)
	}
	log.Println("Quest created successfully")

	// Associate technology with quest
	if err := tx.Model(&quest).Association("TechStack").Append(technologies); err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to associate technology: %v", err)
	}

	// Associate topic with quest
	if err := tx.Model(&quest).Association("Topics").Append(concepts); err != nil {
		tx.Rollback()
		return "", fmt.Errorf("failed to associate topic: %v", err)
	}

	// Create checkpoints
	cpStart := time.Now()
	log.Printf("Creating %d checkpoints", len(req.Checkpoints))
	for i, cp := range req.Checkpoints {
		order := i + 1
		checkpoint := database.Checkpoint{
			ID:              uuid.New(),
			Title:           cp.Title,
			Description:     cp.Description,
			OrderIndex:      &order,
			Requirements:    pq.StringArray(cp.Requirements),
			TestingCode:     cp.TestFileUrl,
			BoilerPlateCode: "", // Empty for now
			QuestID:         questID,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		if err := tx.Create(&checkpoint).Error; err != nil {
			tx.Rollback()
			return "", fmt.Errorf("failed to create checkpoint: %v", err)
		}

		// Associate topic with checkpoint
		if err := tx.Model(&checkpoint).Association("Topics").Append(concepts); err != nil {
			tx.Rollback()
			return "", fmt.Errorf("failed to associate topic with checkpoint: %v", err)
		}
	}
	log.Printf("Checkpoints created in %s", time.Since(cpStart))

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("failed to commit transaction: %v", err)
	}
	log.Printf("Quest added successfully in %s", time.Since(start))

	return slug, nil
}

// The following interface methods are required by database.Service but unused here
func (s *service) GetAllQuests() ([]database.QuestMeta, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetAllCheckpointsForQuest(questID string) ([]database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetCheckpointByID(id string) (*database.Checkpoint, error) {
	return nil, fmt.Errorf("not implemented in this handler")
}

func (s *service) GetAllTechnologies() []string {
	return nil
}

func (s *service) GetAllConcepts() []string {
	return nil
}

func (s *service) GetAllCategories() []string {
	return nil
}

func (s *service) GetAllDifficulties() []string {
	return nil
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("add-quest: handler invoked")
	// Parse request body
	var payload database.AddQuestRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("Error parsing request body: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Invalid request payload"}`,
		}, nil
	}

	// Validate required fields
	if payload.Title == "" || payload.Description == "" ||
		payload.Category == "" || payload.Difficulty == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: `{"error":"Missing required fields"}`,
		}, nil
	}

	// Add quest to database
	start := time.Now()
	slug, err := svc.AddQuest(payload)
	log.Printf("AddQuest completed in %s", time.Since(start))
	if err != nil {
		log.Printf("Error adding quest: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
			Body: fmt.Sprintf(`{"error":"Failed to add quest: %s"}`, err.Error()),
		}, nil
	}

	// Return success response
	response := map[string]any{"success": true, "slug": slug, "message": "Quest added successfully"}
	bodyBytes, err := json.Marshal(response)
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
