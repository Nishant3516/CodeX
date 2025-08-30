package aws

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var (
	S3Client        *s3.Client
	S3PresignClient *s3.PresignClient
	LambdaClient    *lambda.Client
)

func InitAWS() {
	r2AccessKey := os.Getenv("R2_ACCESS_KEY")
	r2SecretKey := os.Getenv("R2_SECRET_KEY")
	r2AccountId := os.Getenv("R2_ACCOUNT_ID")

	if r2AccessKey == "" || r2SecretKey == "" {
		log.Println("R2_ACCESS_KEY and R2_SECRET_KEY must be set")
		return
	}
	log.Println("Initializing Cloudflare R2 client...")
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			r2AccessKey,
			r2SecretKey,
			"",
		)),
		config.WithRegion("auto"),
		config.WithBaseEndpoint(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r2AccountId)),
	)
	if err != nil {
		log.Fatalf("unable to load R2 SDK config, %v", err)
	}

	if r2AccountId != "" {
		r2Endpoint := "https://" + r2AccountId + ".r2.cloudflarestorage.com"
		cfg, err = config.LoadDefaultConfig(context.TODO(),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
				r2AccessKey,
				r2SecretKey,
				"",
			)),
			config.WithRegion("auto"),
			config.WithBaseEndpoint(r2Endpoint),
		)
		if err != nil {
			log.Fatalf("unable to load R2 SDK config with custom endpoint, %v", err)
		}
	}

	S3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})
	S3PresignClient = s3.NewPresignClient(S3Client)
	log.Println("Cloudflare R2 client initialized successfully")
}
