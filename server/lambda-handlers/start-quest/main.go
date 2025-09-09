package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"lms_v0/internal/aws"
	"lms_v0/internal/redis"
	"lms_v0/k8s"
	"lms_v0/utils"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type StartRequest struct {
	Language string `json:"language"`
	LabID    string `json:"labId"`
}

var (
	ALLOWED_CONCURRENT_LABS, _ = strconv.ParseUint(os.Getenv("ALLOWED_CONCURRENT_LABS"), 10, 64)
)

func jsonHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}
}
func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("start-quest: handler invoked")

	// Initialize AWS and Redis clients
	aws.InitAWS()
	redis.InitRedis()
	utils.InitRedisUtils(redis.RedisClient, redis.Context)

	var payload StartRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		log.Printf("start-quest: invalid payload: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Invalid request payload"}`}, nil
	}

	if payload.LabID == "" || payload.Language == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Missing required fields"}`}, nil
	}
	utils.RedisUtilsInstance.CreateLabMonitoringQueueIfNotExists()
	utils.RedisUtilsInstance.CreateLabProgressQueueIfNotExists()
	count, err := utils.RedisUtilsInstance.GetNumberOfActiveLabInstances()
	if err != nil {
		log.Printf("start-quest: failed to get number of active lab instances: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to get number of active lab instances: %s"}`, err.Error())}, nil
	}
	if count > ALLOWED_CONCURRENT_LABS {
		response := map[string]interface{}{
			"error":   "Exceeded maximum concurrent labs",
			"allowed": ALLOWED_CONCURRENT_LABS,
			"current": count,
		}
		jsonResp, err := json.Marshal(response)
		if err != nil {
			log.Printf("start-quest: failed to marshal JSON response: %v", err)
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Failed to marshal JSON response: %s"}`, err.Error())}, nil
		}

		return events.APIGatewayProxyResponse{StatusCode: 429, Body: string(jsonResp)}, nil
	}
	// Initialize k8s client from in-cluster token/env
	if err := k8s.InitK8sInCluster(); err != nil {
		log.Printf("start-quest: failed to init k8s in-cluster: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Init k8s failed: %s"}`, err.Error())}, nil
	}

	labInstance := utils.LabInstanceEntry{
		Language:       payload.Language,
		LabID:          payload.LabID,
		CreatedAt:      time.Now().Unix(),
		Status:         utils.Created,
		LastUpdatedAt:  time.Now().Unix(),
		ProgressLogs:   []utils.LabProgressEntry{},
		DirtyReadPaths: []string{},
	}
	utils.RedisUtilsInstance.CreateLabInstance(labInstance)
	sourceKey := fmt.Sprintf("boilerplate/%s", payload.Language)

	params := k8s.SpinUpParams{
		LabID:                 payload.LabID,
		Language:              payload.Language,
		AppName:               fmt.Sprintf("%s-%s", payload.Language, payload.LabID),
		S3Bucket:              os.Getenv("AWS_S3_BUCKET_NAME"),
		S3Key:                 sourceKey,
		Namespace:             os.Getenv("K8S_NAMESPACE"),
		ShouldCreateNamespace: false,
	}
	if err := k8s.SpinUpPodWithLanguage(params); err != nil {
		log.Printf("start-quest: provisioning failed: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Provisioning failed: %s"}`, err.Error())}, nil
	}

	resp := map[string]any{"success": true, "labId": payload.LabID, "message": "Provisioning started"}
	b, _ := json.Marshal(resp)
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(b)}, nil
}

func main() {
	lambda.Start(handler)
}
