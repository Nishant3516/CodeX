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
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func GeneratePresignedUrl(bucketName, objectKey string) (string, error) {
	request, err := aws.S3PresignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &bucketName,
		Key:    &objectKey,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 3 * time.Hour
	})

	if err != nil {
		log.Printf("Couldn't get a presigned request to get object %v:%v. Here's why: %v\n", bucketName, objectKey, err)
		return "", err
	}

	return request.URL, nil
}
func CopyS3Folder(sourceKey, destinationKey string) error {
	ctx := context.TODO()
	bucket := os.Getenv("AWS_S3_BUCKET_NAME")

	if !strings.HasSuffix(sourceKey, "/") {
		sourceKey += "/"
	}
	if !strings.HasSuffix(destinationKey, "/") {
		destinationKey += "/"
	}

	log.Printf("Starting copy from s3://%s/%s to s3://%s/%s", bucket, sourceKey, bucket, destinationKey)

	listInput := &s3.ListObjectsV2Input{
		Bucket: &bucket,
		Prefix: &sourceKey,
	}

	paginator := s3.NewListObjectsV2Paginator(aws.S3Client, listInput)
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return fmt.Errorf("failed to list objects: %w", err)
		}

		for _, obj := range page.Contents {
			// Construct the new key for the destination
			sourceObjectKey := awsMethods.ToString(obj.Key)
			// Remove the source prefix to get the relative path of the file
			relativePath := strings.TrimPrefix(sourceObjectKey, sourceKey)
			// Prepend the destination prefix to the relative path
			newDestinationKey := destinationKey + relativePath

			// Skip copying the "folder" placeholder object if it exists
			if relativePath == "" {
				continue
			}

			copySource := bucket + "/" + sourceObjectKey

			_, err := aws.S3Client.CopyObject(ctx, &s3.CopyObjectInput{
				Bucket:     &bucket,
				CopySource: &copySource,
				Key:        &newDestinationKey,
			})
			if err != nil {
				return fmt.Errorf("failed to copy object %s: %w", sourceObjectKey, err)
			}
		}
	}

	log.Printf("Successfully copied folder from %s to %s", sourceKey, destinationKey)
	return nil
}
