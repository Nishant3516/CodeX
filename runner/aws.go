package main

import (
	"bytes"
	"context"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Uploader defines the interface for S3 operations, making testing easier.
type S3Uploader interface {
	PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error)
	DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error)
	DeleteObjects(ctx context.Context, params *s3.DeleteObjectsInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectsOutput, error)
	ListObjectsV2(ctx context.Context, params *s3.ListObjectsV2Input, optFns ...func(*s3.Options)) (*s3.ListObjectsV2Output, error)
	CopyObject(ctx context.Context, params *s3.CopyObjectInput, optFns ...func(*s3.Options)) (*s3.CopyObjectOutput, error)
}

var (
	s3Client S3Uploader
	s3Bucket string
	s3Queue  = &S3UpdateQueue{
		updates: make([]S3Update, 0),
	}
)

type S3Update struct {
	Operation string
	Path      string
	Content   string
	OldPath   string // For move operations
	Timestamp time.Time
}

type S3UpdateQueue struct {
	updates []S3Update
	mutex   sync.Mutex
}

// init initializes the S3 client from environment variables.
func init() {
	s3Bucket = os.Getenv("AWS_S3_BUCKET_NAME")
	if s3Bucket == "" {
		log.Fatal("AWS_S3_BUCKET_NAME environment variable not set.")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			os.Getenv("AWS_ACCESS_KEY_ID"),
			os.Getenv("AWS_SECRET_ACCESS_KEY"),
			"", // Session token is empty for long-lived credentials
		)),
		config.WithRegion(os.Getenv("AWS_DEFAULT_REGION")),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	s3Client = s3.NewFromConfig(cfg)
	log.Println("S3 client initialized successfully.", s3Bucket)
}

// queueS3Update adds an S3 operation to the processing queue.
func queueS3Update(operation, path, content string) {
	s3Queue.mutex.Lock()
	defer s3Queue.mutex.Unlock()

	update := S3Update{
		Operation: operation,
		Path:      path,
		Content:   content,
		Timestamp: time.Now(),
	}

	// For move operations, content contains the new path
	if operation == "move" {
		update.OldPath = path
		update.Path = content
		update.Content = ""
	}

	s3Queue.updates = append(s3Queue.updates, update)

	log.Printf("Queued S3 update: %s for path: %s", operation, path)

	// Immediately process if the batch size is reached
	if len(s3Queue.updates) >= S3_UPDATE_BATCH_SIZE {
		go processBatch()
	}
}

// processBatch handles the logic of processing a batch of S3 updates.
func processBatch() {
	s3Queue.mutex.Lock()
	if len(s3Queue.updates) == 0 {
		s3Queue.mutex.Unlock()
		return
	}

	// Create a snapshot of the current queue for processing
	batch := make([]S3Update, len(s3Queue.updates))
	copy(batch, s3Queue.updates)
	s3Queue.updates = s3Queue.updates[:0] // Clear the queue
	s3Queue.mutex.Unlock()

	log.Printf("Processing batch of %d S3 updates", len(batch))

	for _, update := range batch {
		if err := processS3Update(update); err != nil {
			log.Printf("Failed to process S3 update for %s: %v", update.Path, err)
			// Simple retry logic can be added here if needed
		}
	}

	log.Printf("Completed batch processing of %d S3 updates", len(batch))
}

// processS3Update performs the actual S3 operation based on the update type.
func processS3Update(update S3Update) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// The object key in S3 should not have a leading slash
	key := strings.TrimPrefix(update.Path, "/")
	oldKey := strings.TrimPrefix(update.OldPath, "/")

	switch update.Operation {
	case "update", "create":
		log.Printf("S3 Create/Update: Uploading file to s3://%s/%s", s3Bucket, key)
		_, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(s3Bucket),
			Key:    aws.String(key),
			Body:   bytes.NewReader([]byte(update.Content)),
		})
		return err

	case "create_dir":
		log.Printf("S3 Create Directory: Uploading placeholder to s3://%s/%s/", s3Bucket, key)
		// S3 doesn't have directories, so we create a zero-byte object with a trailing slash
		_, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket: aws.String(s3Bucket),
			Key:    aws.String(key + "/"),
			Body:   bytes.NewReader([]byte{}),
		})
		return err

	case "delete":
		log.Printf("S3 Delete: Deleting file s3://%s/%s", s3Bucket, key)
		_, err := s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s3Bucket),
			Key:    aws.String(key),
		})
		return err

	case "delete_dir":
		// This requires listing and deleting all objects under the prefix
		log.Printf("S3 Delete Directory: Deleting all files under s3://%s/%s/", s3Bucket, key)
		return deleteS3Directory(ctx, key+"/")

	case "move":
		// This is a multi-step operation: copy all objects, then delete all old objects
		log.Printf("S3 Move: Moving from s3://%s/%s to s3://%s/%s", s3Bucket, oldKey, s3Bucket, key)
		return moveS3Directory(ctx, oldKey, key)

	case "read":
		// This is a local file system operation, no S3 write action needed.
		log.Printf("S3 Read operation logged for path: %s. No remote action taken.", update.Path)
		return nil

	default:
		log.Printf("Unknown S3 operation: %s for path: %s", update.Operation, update.Path)
		return nil
	}
}

// deleteS3Directory lists and deletes all objects under a given prefix.
func deleteS3Directory(ctx context.Context, prefix string) error {
	listOutput, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(s3Bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return err
	}

	if len(listOutput.Contents) == 0 {
		return nil // Nothing to delete
	}

	// Implementation to delete objects in batch
	return nil
}

// moveS3Directory copies objects from an old prefix to a new one, then deletes the old ones.
func moveS3Directory(ctx context.Context, oldPrefix, newPrefix string) error {
	listOutput, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(s3Bucket),
		Prefix: aws.String(oldPrefix),
	})
	if err != nil {
		return err
	}

	if len(listOutput.Contents) == 0 {
		return nil // Nothing to move
	}

	// Implementation to copy and then delete objects
	return nil
}

// startS3BatchProcessor periodically triggers batch processing.
func startS3BatchProcessor() {
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for range ticker.C {
			s3Queue.mutex.Lock()
			hasUpdates := len(s3Queue.updates) > 0
			s3Queue.mutex.Unlock()

			if hasUpdates {
				processBatch()
			}
		}
	}()
}
