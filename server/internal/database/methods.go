package database

import (
	"lms_v0/utils"
	"os"

	"github.com/google/uuid"
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

	// preload all relevant associations for a full quest view
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

	bucketName := os.Getenv("AWS_S3_BUCKET_NAME")
	presignedBoilerPlateUrl, err := utils.GeneratePresignedUrl(bucketName, quest.BoilerPlateCode) // Clear boilerplate code
	if err != nil {
		return nil, err
	}

	for i, _ := range quest.Checkpoints {
		presignedCheckpointUrl, err := utils.GeneratePresignedUrl(bucketName, quest.Checkpoints[i].TestingCode) // Clear test cases for checkpoints
		if err != nil {
			return nil, err
		}
		quest.Checkpoints[i].TestingCode = presignedCheckpointUrl
	}
	quest.BoilerPlateCode = presignedBoilerPlateUrl

	return &quest, nil
}

// Get all checkpoints for a quest
func (s *service) GetAllCheckpointsForQuest(questID string) ([]Checkpoint, error) {
	var checkpoints []Checkpoint
	uid, err := uuid.Parse(questID)
	if err != nil {
		return nil, err
	}
	err = s.db.Where("quest_id = ?", uid).Find(&checkpoints).Error
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
