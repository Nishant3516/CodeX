package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"lms_v0/k8s"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type EndRequest struct {
	LabID string `json:"labId"`
}

func jsonHeaders() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
	}
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("end-quest: handler invoked")
	var payload EndRequest
	if err := json.Unmarshal([]byte(req.Body), &payload); err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Invalid request payload"}`}, nil
	}
	if payload.LabID == "" {
		return events.APIGatewayProxyResponse{StatusCode: 400, Headers: jsonHeaders(), Body: `{"error":"Missing labId"}`}, nil
	}

	// Initialize k8s client from in-cluster token/env
	if err := k8s.InitK8sInCluster(); err != nil {
		log.Printf("end-quest: failed to init k8s in-cluster: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Init k8s failed: %s"}`, err.Error())}, nil
	}

	params := k8s.SpinDownParams{
		LabID:     payload.LabID,
		Language:  os.Getenv("LANGUAGE"),
		AppName:   payload.LabID,
		Namespace: payload.LabID,
	}
	if err := k8s.TearDownPodWithLanguage(params); err != nil {
		log.Printf("end-quest: teardown failed: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf(`{"error":"Teardown failed: %s"}`, err.Error())}, nil
	}

	resp := map[string]any{"success": true, "labId": payload.LabID, "message": "Teardown started"}
	b, _ := json.Marshal(resp)
	return events.APIGatewayProxyResponse{StatusCode: 200, Body: string(b)}, nil
}

func main() { lambda.Start(handler) }
