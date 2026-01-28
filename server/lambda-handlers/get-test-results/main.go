package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func respond(status int, body interface{}) (events.APIGatewayProxyResponse, error) {
	var data []byte
	switch v := body.(type) {
	case string:
		data = []byte(v)
	default:
		b, err := json.Marshal(v)
		if err != nil {
			b = []byte(`{"error":"marshal"}`)
		}
		data = b
	}
	return events.APIGatewayProxyResponse{
		StatusCode: status,
		Body:       string(data),
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type,Authorization",
		},
	}, nil
}

func handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if strings.EqualFold(req.HTTPMethod, "OPTIONS") {
		return respond(200, "{}")
	}

	labID := strings.TrimSpace(req.PathParameters["labId"])
	if labID == "" {
		return respond(400, map[string]string{"error": "Missing labId parameter"})
	}

	log.Printf("get-test-results: returning placeholder results for labId=%s", labID)

	resp := map[string]interface{}{
		"success": true,
		"labId":   labID,
		"results": map[string]interface{}{},
	}

	return respond(200, resp)
}

func main() { lambda.Start(handler) }
