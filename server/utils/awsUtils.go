package utils

import (
	"context"
	"lms_v0/internal/aws"
	"log"
	"time"

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
