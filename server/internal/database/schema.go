package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Request types for API operations
type AddQuestRequest struct {
	Title          string              `json:"title"`
	Description    string              `json:"description"`
	Technology     []string            `json:"technology"`
	Concept        []string            `json:"concept"`
	Category       string              `json:"category"`
	Difficulty     string              `json:"difficulty"`
	Requirements   []string            `json:"requirements"`
	BoilerplateUrl string              `json:"boilerplateUrl"`
	Checkpoints    []CheckpointRequest `json:"checkpoints"`
}

type DeleteQuestRequest struct {
	Slug string `json:"slug"`
}

type StartLabRequest struct {
	LabID    string `json:"labId"`
	Language string `json:"language"`
}

type CheckpointRequest struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	TestFileUrl  string   `json:"testFileUrl"`
	Requirements []string `json:"requirements"`
}

// Quest represents a quest entity.
type Quest struct {
	ID              uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	Name            string         `json:"name"`
	Slug            string         `json:"slug" gorm:"unique"`
	Description     string         `json:"description"`
	BoilerPlateCode string         `json:"boiler_plate_code,omitempty"`
	Requirements    pq.StringArray `json:"requirements" gorm:"type:text[]"`
	Image           string         `json:"image"`
	CategoryID      uuid.UUID      `json:"category_id"`
	Category        Category       `json:"category"`
	TechStack       []Technology   `json:"tech_stack" gorm:"many2many:quest_technologies"`
	Topics          []Topic        `json:"topics" gorm:"many2many:quest_topics"`
	DifficultyID    uuid.UUID      `json:"difficulty_id"`
	Difficulty      Difficulty     `json:"difficulty" gorm:"foreignKey:DifficultyID"`
	FinalTestCode   string         `json:"final_test_code,omitempty"`
	FinalTestCases  []Testcase     `json:"final_test_cases,omitempty" gorm:"foreignKey:QuestID"`
	Checkpoints     []Checkpoint   `json:"checkpoints,omitempty" gorm:"foreignKey:QuestID"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// QuestMeta represents quest metadata for listing (without heavy data)
type QuestMeta struct {
	ID          uuid.UUID    `json:"id"`
	Name        string       `json:"name"`
	Slug        string       `json:"slug" gorm:"unique"`
	Description string       `json:"description"`
	Image       string       `json:"image"`
	Category    Category     `json:"category"`
	TechStack   []Technology `json:"tech_stack"`
	Topics      []Topic      `json:"topics"`
	Difficulty  Difficulty   `json:"difficulty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// Technology represents a technology entity.
type Technology struct {
	ID   uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name string    `json:"name"`
}

// QuestTechnology is a join table for quests and technologies.
type QuestTechnology struct {
	QuestID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	TechnologyID uuid.UUID `gorm:"type:uuid;primaryKey"`
}

// Category represents a category entity.
type Category struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Category  string    `json:"category"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Difficulty represents a difficulty entity.
type Difficulty struct {
	ID    uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Score float64   `json:"score"`
	Level string    `json:"level"`
}

// Topic represents a topic entity.
type Topic struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Checkpoint represents a checkpoint entity.
type Checkpoint struct {
	ID              uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	Title           string         `json:"title"`
	Description     string         `json:"description"`
	OrderIndex      *int           `json:"order_index"`
	Requirements    pq.StringArray `json:"requirements" gorm:"type:text[]"`
	BoilerPlateCode string         `json:"boiler_plate_code,omitempty"`
	TestingCode     string         `json:"testing_code,omitempty"`
	CompletedOn     *time.Time     `json:"completed_on,omitempty"`
	Topics          []Topic        `json:"topics,omitempty" gorm:"many2many:checkpoint_topics"`
	Hints           []Hint         `json:"hints,omitempty" gorm:"many2many:checkpoint_hints"`
	Resources       []Resource     `json:"resources,omitempty" gorm:"many2many:checkpoint_resources"`
	Submissions     []Submission   `json:"submissions,omitempty" gorm:"foreignKey:CheckpointID"`
	Testcases       []Testcase     `json:"testcases,omitempty" gorm:"foreignKey:CheckpointID"`
	QuestID         uuid.UUID      `json:"quest_id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// Hint represents a hint entity.
type Hint struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	CheckpointID uuid.UUID `json:"checkpoint_id"`
	CodeBlock    string    `json:"code_block"`
}

// Resource represents a resource entity.
type Resource struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Title        string    `json:"title"`
	URL          string    `json:"url"`
	Description  string    `json:"description"`
	CheckpointID uuid.UUID `json:"checkpoint_id"`
}

// Submission represents a submission entity.
type Submission struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	SubmittedOn     time.Time `json:"submitted_on"`
	CommitHash      string    `json:"commit_hash"`
	URL             string    `json:"url"`
	Message         string    `json:"message"`
	IsSuccess       bool      `json:"is_success"`
	TestcasesPassed int       `json:"testcases_passed"`
	TestcasesTotal  int       `json:"testcases_total"`
	CheckpointID    uuid.UUID `json:"checkpoint_id"`
	UserID          uuid.UUID `json:"user_id"`
}

// Testcase represents a testcase entity.
type Testcase struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	Input        string    `json:"input"`
	Output       string    `json:"output"`
	Message      string    `json:"message"`
	IsPassed     bool      `json:"is_passed"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	CheckpointID uuid.UUID `json:"checkpoint_id"`
	QuestID      uuid.UUID `json:"quest_id"`
}

func Init() error {
	database := dbInstance.db
	err := database.AutoMigrate(
		&Quest{},
		&Technology{},
		&QuestTechnology{},
		&Category{},
		&Difficulty{},
		&Checkpoint{},
		&Topic{},
		&Hint{},
		&Resource{},
		&Submission{},
		&Testcase{},
	)
	log.Printf("Database migration completed %v", err)
	return err
}
