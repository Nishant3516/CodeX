package database

import (
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// SeedData clears the database and seeds it with initial data
func SeedData() error {
	db := dbInstance.db
	log.Printf("Starting database seeding process...")

	// Clear all tables first
	if err := clearTables(db); err != nil {
		log.Printf("Error clearing tables: %v", err)
		return err
	}

	// Seed Technologies
	technologies := []Technology{
		{ID: uuid.New(), Name: "HTML"},
		{ID: uuid.New(), Name: "CSS"},
		{ID: uuid.New(), Name: "JavaScript"},
	}

	for _, tech := range technologies {
		if err := db.Create(&tech).Error; err != nil {
			log.Printf("Error creating technology %s: %v", tech.Name, err)
			return err
		}
	}
	log.Printf("Seeded %d technologies", len(technologies))

	// Seed Topics
	topics := []Topic{
		{ID: uuid.New(), Name: "Arrays", Description: "Working with JavaScript arrays", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "Objects", Description: "JavaScript objects and properties", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "DOM Manipulation", Description: "Manipulating HTML elements with JavaScript", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "Functions", Description: "JavaScript functions and scope", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "Event Handling", Description: "Handling user interactions and events", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "CSS Selectors", Description: "CSS selectors and styling", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "HTML Structure", Description: "HTML document structure and semantics", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Name: "Responsive Design", Description: "Creating responsive web layouts", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	for _, topic := range topics {
		if err := db.Create(&topic).Error; err != nil {
			log.Printf("Error creating topic %s: %v", topic.Name, err)
			return err
		}
	}
	log.Printf("Seeded %d topics", len(topics))

	// Seed Categories
	categories := []Category{
		{ID: uuid.New(), Category: "Web Development", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Category: "Frontend", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Category: "Backend", CreatedAt: time.Now(), UpdatedAt: time.Now()},
		{ID: uuid.New(), Category: "Full Stack", CreatedAt: time.Now(), UpdatedAt: time.Now()},
	}

	for _, category := range categories {
		if err := db.Create(&category).Error; err != nil {
			log.Printf("Error creating category %s: %v", category.Category, err)
			return err
		}
	}
	log.Printf("Seeded %d categories", len(categories))

	// Seed Difficulties
	difficulties := []Difficulty{
		{ID: uuid.New(), Score: 1.0, Level: "Beginner"},
		{ID: uuid.New(), Score: 2.0, Level: "Intermediate"},
		{ID: uuid.New(), Score: 3.0, Level: "Advanced"},
		{ID: uuid.New(), Score: 4.0, Level: "Expert"},
	}

	for _, difficulty := range difficulties {
		if err := db.Create(&difficulty).Error; err != nil {
			log.Printf("Error creating difficulty %s: %v", difficulty.Level, err)
			return err
		}
	}
	log.Printf("Seeded %d difficulties", len(difficulties))

	// Create sample quests
	if err := createSampleQuests(db, technologies, topics, categories, difficulties); err != nil {
		log.Printf("Error creating sample quests: %v", err)
		return err
	}

	log.Println("Database seeding completed successfully")
	return nil
}

func clearTables(db *gorm.DB) error {
	// Disable foreign key checks temporarily
	db.Exec("SET FOREIGN_KEY_CHECKS = 0")

	// Drop foreign key constraints first, then main tables
	tables := []string{
		"quest_technologies", "quest_topics", "checkpoint_topics",
		"checkpoint_hints", "checkpoint_resources", "testcases",
		"submissions", "hints", "resources", "checkpoints",
		"quests", "technologies", "topics", "categories", "difficulties",
	}

	for _, table := range tables {
		if err := db.Exec("DELETE FROM " + table).Error; err != nil {
			// Ignore errors for tables that might not exist
			log.Printf("Could not clear table %s (might not exist): %v", table, err)
		}
	}

	// Re-enable foreign key checks
	db.Exec("SET FOREIGN_KEY_CHECKS = 1")

	log.Println("Cleared all existing data from tables")
	return nil
}

func createSampleQuests(db *gorm.DB, technologies []Technology, topics []Topic, categories []Category, difficulties []Difficulty) error {
	// Todo App Quest
	todoQuest := Quest{
		ID:              uuid.New(),
		Name:            "Todo List Application",
		Slug:            "interactive-todo-list",
		Description:     "Build a fully functional todo list app with add, edit, delete, and search functionality",
		BoilerPlateCode: "projects/interactive-todo-list/todo-boiler-plate.zip",
		Requirements: pq.StringArray([]string{
			"Create a clean and responsive user interface",
			"Implement CRUD operations for todo items",
			"Add search and filter functionality",
			"Use semantic HTML and proper CSS styling",
		}),
		Image:         "https://example.com/todo-app.jpg",
		CategoryID:    categories[0].ID,   // Web Development
		DifficultyID:  difficulties[0].ID, // Beginner
		FinalTestCode: "https://lms-v0.s3.ap-south-1.amazonaws.com/mvp-tests/todo-app/todo_final_test.go",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := db.Create(&todoQuest).Error; err != nil {
		return err
	}

	// Associate all technologies (HTML, CSS, JS)
	if err := db.Model(&todoQuest).Association("TechStack").Append(technologies); err != nil {
		return err
	}

	// Associate relevant topics
	relevantTopics := []Topic{topics[0], topics[1], topics[2], topics[4]} // Arrays, Objects, DOM, Events
	if err := db.Model(&todoQuest).Association("Topics").Append(relevantTopics); err != nil {
		return err
	}

	// Create checkpoints for the todo quest
	checkpoints := []Checkpoint{
		{
			ID:          uuid.New(),
			Title:       "Basic HTML Structure",
			Description: "Create the basic HTML structure for the todo app including a title, input field, add button, and container for todo items.",
			Requirements: pq.StringArray([]string{
				"Add an h1 element with id='app-title' containing 'Todo List'",
				"Create an input field with id='todo-input' and placeholder='Enter a new todo...'",
				"Add a button with id='add-btn' and text 'Add Todo'",
				"Create a div container with id='todo-list' for displaying todos",
				"Add a search input with id='search-input' and placeholder='Search todos...'",
			}),
			TestingCode: "projects/interactive-todo-list/test-cases/todo_checkpoint_1_test.js",
			QuestID:     todoQuest.ID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Title:       "Add Todo Functionality",
			Description: "Implement the ability to add new todo items to the list.",
			Requirements: pq.StringArray([]string{
				"When the 'Add Todo' button is clicked, create a new todo item",
				"Each todo item should be a div with class='todo-item'",
				"Each todo item should contain a span with class='todo-text' for the text",
				"Each todo item should have a delete button with class='delete-btn'",
				"Clear the input field after adding a todo",
				"Don't add empty todos",
			}),
			TestingCode: "projects/interactive-todo-list/test-cases/todo_checkpoint_2_test.js",
			QuestID:     todoQuest.ID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Title:       "Delete Todo Functionality",
			Description: "Implement the ability to delete todo items from the list.",
			Requirements: pq.StringArray([]string{
				"When a delete button is clicked, remove the corresponding todo item",
				"The todo should be removed from both the DOM and the todos array",
				"Update the display after deletion",
			}),
			TestingCode: "projects/interactive-todo-list/test-cases/todo_checkpoint_3_test.js",
			QuestID:     todoQuest.ID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			ID:          uuid.New(),
			Title:       "Search Todo Functionality",
			Description: "Implement search functionality to filter todos based on user input.",
			Requirements: pq.StringArray([]string{
				"When user types in search input with id='search-input', filter todos in real-time",
				"Show only todos that contain the search text (case-insensitive)",
				"If search is empty, show all todos",
				"Add a clear search button or functionality",
			}),
			TestingCode: "projects/interactive-todo-list/test-cases/todo_checkpoint_4_test.js",
			QuestID:     todoQuest.ID,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	for _, checkpoint := range checkpoints {
		if err := db.Create(&checkpoint).Error; err != nil {
			return err
		}
	}

	log.Println("Created sample quest: Todo App")
	return nil
}

// Legacy function for backward compatibility
func Seed() error {
	return SeedData()
}
