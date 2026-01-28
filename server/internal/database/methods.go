package database

import (
	"fmt"
	"lms_v0/utils"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Get all quests
// GetAllQuests returns minimal quest metadata without checkpoints
func (s *service) GetAllQuests() ([]QuestMeta, error) {
	var quests []Quest
	// preload only necessary associations for metadata
	err := s.db.Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Find(&quests).Error
	if err != nil {
		return nil, err
	}
	// map full quests to metadata structs
	metas := make([]QuestMeta, len(quests))
	for i, q := range quests {
		metas[i] = QuestMeta{
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

// Get quest by ID
func (s *service) GetQuestBySlug(slug string) (*Quest, error) {
	var quest Quest

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

	var checkpoints []Checkpoint
	err = s.db.
		Where("quest_id = ?", quest.ID).
		Order("order_index IS NULL ASC").
		Order("order_index ASC").
		Order("created_at ASC").
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

// Get all checkpoints for a quest
func (s *service) GetAllCheckpointsForQuest(questID string) ([]Checkpoint, error) {
	var checkpoints []Checkpoint
	uid, err := uuid.Parse(questID)
	if err != nil {
		return nil, err
	}
	err = s.db.Where("quest_id = ?", uid).Order("order_index IS NULL ASC").
		Order("order_index ASC").
		Order("created_at ASC").Find(&checkpoints).Error
	return checkpoints, err
}

// Get checkpoint by ID
func (s *service) GetCheckpointByID(id string) (*Checkpoint, error) {
	var checkpoint Checkpoint
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, err
	}
	err = s.db.First(&checkpoint, "id = ?", uid).Error
	if err != nil {
		return nil, err
	}
	return &checkpoint, nil
}

func (s *service) GetAllTechnologies() []string {
	var technologies []string
	s.db.Model(&Technology{}).Pluck("name", &technologies)
	return technologies
}

// GetQuestsByLanguage returns quests filtered by technology/language
func (s *service) GetQuestsByLanguage(language string) ([]QuestMeta, error) {
	var quests []Quest
	langArray := make([]string, 0)
	if language == "vanilla-js" {
		langArray = append(langArray, "HTML", "CSS", "JavaScript")
	} else {
		langArray = append(langArray, language)
	}
	// Join with technology table to filter by language
	var whereClause string
	var args []interface{}
	for i, lang := range langArray {
		if i > 0 {
			whereClause += " OR "
		}
		whereClause += "technologies.name = ?"
		args = append(args, lang)
	}
	err := s.db.
		Preload("Category").
		Preload("TechStack").
		Preload("Topics").
		Preload("Difficulty").
		Joins("JOIN quest_technologies ON quests.id = quest_technologies.quest_id").
		Joins("JOIN technologies ON quest_technologies.technology_id = technologies.id").
		Where(whereClause, args...).
		Group("quests.id").
		Find(&quests).Error

	if err != nil {
		return nil, err
	}

	// Convert to QuestMeta structs
	metas := make([]QuestMeta, len(quests))
	for i, q := range quests {
		metas[i] = QuestMeta{
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
func (s *service) GetAllConcepts() []string {
	var concepts []string
	s.db.Model(&Topic{}).Pluck("name", &concepts)
	return concepts
}
func (s *service) GetAllCategories() []string {
	var categories []string
	s.db.Model(&Category{}).Pluck("category", &categories)
	return categories
}
func (s *service) GetAllDifficulties() []string {
	var difficulties []string
	s.db.Model(&Difficulty{}).Pluck("level", &difficulties)
	return difficulties
}

// AddQuest creates a new quest with its related entities
func (s *service) AddQuest(req AddQuestRequest) (string, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	technologies := make([]*Technology, 0, len(req.Technology))
	for _, tech := range req.Technology {
		if tech == "" {
			return "", fmt.Errorf("technology cannot be empty")
		}
		if len(tech) > 50 {
			return "", fmt.Errorf("technology name too long: %s", tech)
		}
		technology, err := s.findTechnology(tx, tech)

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new technology if it doesn't exist
				technology = &Technology{
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

	// Find topic (concept)
	concepts := make([]*Topic, 0, len(req.Concept))
	for _, concept := range req.Concept {
		if concept == "" {
			return "", fmt.Errorf("concept cannot be empty")
		}

		topic, err := s.findTopic(tx, concept)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new topic if it doesn't exist
				topic = &Topic{
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
	slug := s.generateSlug(req.Title)
	// Create quest
	questID := uuid.New()
	quest := Quest{
		ID:              questID,
		Name:            req.Title,
		Slug:            slug,
		Description:     req.Description,
		BoilerPlateCode: req.BoilerplateUrl,
		Requirements:    pq.StringArray(req.Requirements),
		Image:           "", // Empty for now, can be added later
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
	for i, cp := range req.Checkpoints {
		order := i + 1
		checkpoint := Checkpoint{
			ID:              uuid.New(),
			Title:           cp.Title,
			Description:     cp.Description,
			Requirements:    pq.StringArray(cp.Requirements),
			TestingCode:     cp.TestFileUrl,
			OrderIndex:      &order,
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

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return "", fmt.Errorf("failed to commit transaction: %v", err)
	}

	return slug, nil
}

// Helper functions for finding existing entities
func (s *service) findTechnology(tx *gorm.DB, name string) (*Technology, error) {
	var tech Technology
	result := tx.Where("name = ?", name).First(&tech)
	if result.Error != nil {
		return nil, result.Error
	}
	return &tech, nil
}

func (s *service) findTopic(tx *gorm.DB, name string) (*Topic, error) {
	var topic Topic
	result := tx.Where("name = ?", name).First(&topic)
	if result.Error != nil {
		return nil, result.Error
	}
	return &topic, nil
}

func (s *service) findCategory(tx *gorm.DB, name string) (*Category, error) {
	var category Category
	result := tx.Where("category = ?", name).First(&category)
	if result.Error != nil {
		return nil, result.Error
	}
	return &category, nil
}

func (s *service) findDifficulty(tx *gorm.DB, level string) (*Difficulty, error) {
	var difficulty Difficulty
	result := tx.Where("level = ?", level).First(&difficulty)
	if result.Error != nil {
		return nil, result.Error
	}
	return &difficulty, nil
}

// Generate slug from title
func (s *service) generateSlug(title string) string {
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

// DeleteQuest removes a quest and all its related entities from the database
func (s *service) DeleteQuest(slug string) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Find the quest by slug
	var quest Quest
	if err := tx.Where("slug = ?", slug).First(&quest).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("quest with slug '%s' not found", slug)
		}
		return fmt.Errorf("failed to find quest: %v", err)
	}

	// Delete associated testcases (they reference quest_id)
	if err := tx.Where("quest_id = ?", quest.ID).Delete(&Testcase{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete testcases: %v", err)
	}

	// Delete checkpoints and their associations
	var checkpoints []Checkpoint
	if err := tx.Where("quest_id = ?", quest.ID).Find(&checkpoints).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to find checkpoints: %v", err)
	}

	for _, checkpoint := range checkpoints {
		// Delete checkpoint associations
		if err := tx.Model(&checkpoint).Association("Topics").Clear(); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to clear checkpoint topics: %v", err)
		}
		if err := tx.Model(&checkpoint).Association("Hints").Clear(); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to clear checkpoint hints: %v", err)
		}
		if err := tx.Model(&checkpoint).Association("Resources").Clear(); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to clear checkpoint resources: %v", err)
		}
		if err := tx.Model(&checkpoint).Association("Submissions").Clear(); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to clear checkpoint submissions: %v", err)
		}
		if err := tx.Model(&checkpoint).Association("Testcases").Clear(); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to clear checkpoint testcases: %v", err)
		}

		// Delete the checkpoint
		if err := tx.Delete(&checkpoint).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to delete checkpoint: %v", err)
		}
	}

	// Clear quest associations
	if err := tx.Model(&quest).Association("TechStack").Clear(); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to clear quest technologies: %v", err)
	}
	if err := tx.Model(&quest).Association("Topics").Clear(); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to clear quest topics: %v", err)
	}
	if err := tx.Model(&quest).Association("FinalTestCases").Clear(); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to clear quest final testcases: %v", err)
	}

	// Delete the quest
	if err := tx.Delete(&quest).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete quest: %v", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	return nil
}
