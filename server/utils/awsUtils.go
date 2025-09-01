package utils

import (
	"context"
	"fmt"
	"lms_v0/internal/aws"
	"log"
	"os"
	"strings"
	"time"

	awsMethods "github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func GeneratePresignedUrl(bucketName, objectKey string) (string, error) {
	// Check if R2 credentials are available
	r2AccessKey := os.Getenv("R2_ACCESS_KEY")
	r2SecretKey := os.Getenv("R2_SECRET_KEY")
	r2AccountId := os.Getenv("R2_ACCOUNT_ID")

	if r2AccessKey != "" && r2SecretKey != "" && r2AccountId != "" {
		// Use R2 for presigned URLs
		r2Endpoint := "https://" + r2AccountId + ".r2.cloudflarestorage.com"

		cfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				r2AccessKey,
				r2SecretKey,
				"", // Session token is empty
			)),
			config.WithRegion("auto"), // R2 uses 'auto' region
		)
		if err != nil {
			log.Printf("Failed to load R2 config for presigned URL: %v", err)
			return "", err
		}

		s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = &r2Endpoint
			o.UsePathStyle = true // R2 requires path-style addressing
		})
		presignClient := s3.NewPresignClient(s3Client)

		request, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
			Bucket: &bucketName,
			Key:    &objectKey,
		}, func(opts *s3.PresignOptions) {
			opts.Expires = 3 * time.Hour
		})

		if err != nil {
			log.Printf("Couldn't get a presigned request to get R2 object %v:%v. Here's why: %v\n", bucketName, objectKey, err)
			return "", err
		}

		return request.URL, nil
	}

	// Fall back to AWS S3
	request, err := aws.S3PresignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &bucketName,
		Key:    &objectKey,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 3 * time.Hour
	})

	if err != nil {
		log.Printf("Couldn't get a presigned request to get S3 object %v:%v. Here's why: %v\n", bucketName, objectKey, err)
		return "", err
	}

	return request.URL, nil
}
func CopyS3Folder(sourceKey, destinationKey string) error {
	ctx := context.TODO()
	bucket := os.Getenv("AWS_S3_BUCKET_NAME")

	if bucket == "" {
		log.Println("AWS_S3_BUCKET_NAME must be set")
		return fmt.Errorf("AWS_S3_BUCKET_NAME must be set")
	}

	labId := strings.Split(destinationKey, "/")[2]
	if !strings.HasSuffix(sourceKey, "/") {
		sourceKey += "/"
	}
	if !strings.HasSuffix(destinationKey, "/") {
		destinationKey += "/"
	}

	progress := LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Booting,
		Message:     "Copying S3 folder from boiler plate to new file",
		ServiceName: S3_SERVICE,
	}

	RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)

	log.Printf("Starting optimized copy from s3://%s/%s to s3://%s/%s", bucket, sourceKey, bucket, destinationKey)

	listInput := &s3.ListObjectsV2Input{
		Bucket:  &bucket,
		Prefix:  &sourceKey,
		MaxKeys: awsMethods.Int32(1000), // Process in batches of 1000
	}

	var copyObjects []s3.CopyObjectInput
	totalObjects := 0
	totalSize := int64(0)

	// Collect all objects to copy first
	paginator := s3.NewListObjectsV2Paginator(aws.S3Client, listInput)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to list objects: %w", err)
		}

		for _, obj := range page.Contents {
			sourceObjectKey := awsMethods.ToString(obj.Key)

			if sourceObjectKey == sourceKey {
				continue
			}

			relativePath := strings.TrimPrefix(sourceObjectKey, sourceKey)
			if relativePath == "" {
				continue
			}

			newDestinationKey := destinationKey + relativePath
			copySource := bucket + "/" + sourceObjectKey

			copyObjects = append(copyObjects, s3.CopyObjectInput{
				Bucket:     &bucket,
				CopySource: &copySource,
				Key:        &newDestinationKey,
			})

			totalObjects++
			if obj.Size != nil {
				totalSize += *obj.Size
			}

			if len(copyObjects) >= 100 {
				if err := processCopyBatch(ctx, copyObjects); err != nil {
					return fmt.Errorf("failed to process copy batch: %w", err)
				}
				copyObjects = copyObjects[:0]
			}
		}
	}

	if len(copyObjects) > 0 {
		if err := processCopyBatch(ctx, copyObjects); err != nil {
			return fmt.Errorf("failed to process final copy batch: %w", err)
		}
	}

	progress = LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Booting,
		Message:     "Successfully Copied Code From " + sourceKey + " to " + destinationKey,
		ServiceName: S3_SERVICE,
	}

	RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)
	log.Printf("Successfully copied %d objects (%d bytes) from %s to %s", totalObjects, totalSize, sourceKey, destinationKey)
	return nil
}

func processCopyBatch(ctx context.Context, copyObjects []s3.CopyObjectInput) error {
	const maxConcurrency = 10 // Limit concurrent operations to avoid overwhelming the service
	semaphore := make(chan struct{}, maxConcurrency)
	errChan := make(chan error, len(copyObjects))

	// Process each copy operation concurrently
	for _, copyInput := range copyObjects {
		go func(input s3.CopyObjectInput) {
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			_, err := aws.S3Client.CopyObject(ctx, &input)
			if err != nil {
				errChan <- fmt.Errorf("failed to copy object %s: %w", *input.Key, err)
				return
			}
			errChan <- nil
		}(copyInput)
	}

	// Wait for all operations to complete
	var firstError error
	for i := 0; i < len(copyObjects); i++ {
		if err := <-errChan; err != nil && firstError == nil {
			firstError = err
		}
	}

	return firstError
}

// CopyS3FolderAsync performs the same operation as CopyS3Folder but with proper context handling for async operations
func CopyS3FolderAsync(ctx context.Context, sourceKey, destinationKey string) error {
	bucket := os.Getenv("AWS_S3_BUCKET_NAME")

	if bucket == "" {
		log.Println("AWS_S3_BUCKET_NAME must be set")
		return fmt.Errorf("AWS_S3_BUCKET_NAME must be set")
	}

	labId := strings.Split(destinationKey, "/")[2]
	if !strings.HasSuffix(sourceKey, "/") {
		sourceKey += "/"
	}
	if !strings.HasSuffix(destinationKey, "/") {
		destinationKey += "/"
	}

	progress := LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Booting,
		Message:     "Starting file copy from boilerplate",
		ServiceName: S3_SERVICE,
	}

	RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)

	log.Printf("Starting async copy from s3://%s/%s to s3://%s/%s", bucket, sourceKey, bucket, destinationKey)

	listInput := &s3.ListObjectsV2Input{
		Bucket:  &bucket,
		Prefix:  &sourceKey,
		MaxKeys: awsMethods.Int32(500), // Smaller batches for better performance
	}

	var copyObjects []s3.CopyObjectInput
	totalObjects := 0
	totalSize := int64(0)

	// Collect all objects to copy first
	paginator := s3.NewListObjectsV2Paginator(aws.S3Client, listInput)
	for paginator.HasMorePages() {
		// Check if context was cancelled
		select {
		case <-ctx.Done():
			return fmt.Errorf("copy operation cancelled: %w", ctx.Err())
		default:
		}

		page, err := paginator.NextPage(ctx)
		if err != nil {
			progress = LabProgressEntry{
				Timestamp:   time.Now().Unix(),
				Status:      Error,
				Message:     fmt.Sprintf("Failed to list files: %v", err),
				ServiceName: S3_SERVICE,
			}
			RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)
			return fmt.Errorf("failed to list objects: %w", err)
		}

		for _, obj := range page.Contents {
			sourceObjectKey := awsMethods.ToString(obj.Key)

			if sourceObjectKey == sourceKey {
				continue
			}

			relativePath := strings.TrimPrefix(sourceObjectKey, sourceKey)
			if relativePath == "" {
				continue
			}

			newDestinationKey := destinationKey + relativePath
			copySource := bucket + "/" + sourceObjectKey

			copyObjects = append(copyObjects, s3.CopyObjectInput{
				Bucket:     &bucket,
				CopySource: &copySource,
				Key:        &newDestinationKey,
			})

			totalObjects++
			if obj.Size != nil {
				totalSize += *obj.Size
			}

			// Process in smaller batches to avoid long operations
			if len(copyObjects) >= 50 {
				if err := processCopyBatchAsync(ctx, copyObjects, labId, totalObjects); err != nil {
					progress = LabProgressEntry{
						Timestamp:   time.Now().Unix(),
						Status:      Error,
						Message:     fmt.Sprintf("Copy batch failed: %v", err),
						ServiceName: S3_SERVICE,
					}
					RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)
					return fmt.Errorf("failed to process copy batch: %w", err)
				}
				copyObjects = copyObjects[:0]
			}
		}
	}

	if len(copyObjects) > 0 {
		if err := processCopyBatchAsync(ctx, copyObjects, labId, totalObjects); err != nil {
			progress = LabProgressEntry{
				Timestamp:   time.Now().Unix(),
				Status:      Error,
				Message:     fmt.Sprintf("Final copy batch failed: %v", err),
				ServiceName: S3_SERVICE,
			}
			RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)
			return fmt.Errorf("failed to process final copy batch: %w", err)
		}
	}

	progress = LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Booting,
		Message:     "Files copied successfully, setting up environment",
		ServiceName: S3_SERVICE,
	}

	RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)
	log.Printf("Successfully copied %d objects (%d bytes) from %s to %s", totalObjects, totalSize, sourceKey, destinationKey)
	return nil
}

func processCopyBatchAsync(ctx context.Context, copyObjects []s3.CopyObjectInput, labId string, currentProgress int) error {
	const maxConcurrency = 5 // Reduced concurrency for better stability
	semaphore := make(chan struct{}, maxConcurrency)
	errChan := make(chan error, len(copyObjects))

	// Update progress
	progress := LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Booting,
		Message:     fmt.Sprintf("Copying files... (%d processed)", currentProgress),
		ServiceName: S3_SERVICE,
	}
	RedisUtilsInstance.UpdateLabInstanceProgress(labId, progress)

	// Process each copy operation concurrently
	for _, copyInput := range copyObjects {
		go func(input s3.CopyObjectInput) {
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			// Check if context was cancelled
			select {
			case <-ctx.Done():
				errChan <- fmt.Errorf("copy operation cancelled: %w", ctx.Err())
				return
			default:
			}

			_, err := aws.S3Client.CopyObject(ctx, &input)
			if err != nil {
				errChan <- fmt.Errorf("failed to copy object %s: %w", *input.Key, err)
				return
			}
			errChan <- nil
		}(copyInput)
	}

	// Wait for all operations to complete
	var firstError error
	for i := 0; i < len(copyObjects); i++ {
		if err := <-errChan; err != nil && firstError == nil {
			firstError = err
		}
	}

	return firstError
}
