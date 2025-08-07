package aws

import (
	"context"
	"log"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	S3Client        *s3.Client
	S3PresignClient *s3.PresignClient
	LambdaClient    *lambda.Client
)

func InitAWS() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load AWS SDK config, %v", err)
	}
	S3Client = s3.NewFromConfig(cfg)
	LambdaClient = lambda.NewFromConfig(cfg)
	S3PresignClient = s3.NewPresignClient(S3Client)
	log.Println("AWS clients initialized successfully")
}
