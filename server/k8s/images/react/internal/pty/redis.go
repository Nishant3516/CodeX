package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var (
	RedisClient *redis.Client
	Context     context.Context
)

type LabProgressEntry struct {
	Timestamp   int64
	Status      LabStatus
	Message     string
	ServiceName LabLogServices
}

type LabStatus string

const (
	Created LabStatus = "created"
	Booting LabStatus = "booting"
	Active  LabStatus = "active"
	Error   LabStatus = "error"
)

type LabLogServices string

const (
	FILE_SYSTEM_SERVICE LabLogServices = "file_system"
	SSL_SERVICE         LabLogServices = "ssl"
	PTY_SERVICE         LabLogServices = "pty"
	SERVER_SERVICE      LabLogServices = "server"
	S3_SERVICE          LabLogServices = "s3"
	K8S_SERVICE         LabLogServices = "k8s"
)

type LabInstanceEntry struct {
	LabID          string
	CreatedAt      int64
	Language       string
	DirtyReadPaths []string
	Status         LabStatus
	LastUpdatedAt  int64
	ProgressLogs   []LabProgressEntry
}

type LabMonitoringEntry struct {
	LabID         string
	Status        LabStatus
	LastUpdatedAt int64
	CreatedAt     int64
}

func InitRedis() {
	redisURI := os.Getenv("REDIS_URI")
	log.Printf("Connecting to Redis at: %s", redisURI)
	opt, err := redis.ParseURL(redisURI)
	if err != nil {
		panic(err)
	}

	RedisClient = redis.NewClient(opt)
	Context = context.Background()

	// Test connection
	_, err = RedisClient.Ping(Context).Result()
	if err != nil {
		panic(err)
	}

	log.Println("Redis connection established")
}

func UpdateLabInstanceProgress(labID string, progress LabProgressEntry) {
	if RedisClient == nil {
		log.Fatalf("Redis client is not initialized")
	}

	// Get existing instance
	data, err := RedisClient.HGet(Context, "lab_instances", labID).Result()
	if err != nil {
		log.Printf("Failed to fetch lab instance %s: %v", labID, err)
		return
	}

	var instance LabInstanceEntry
	err = json.Unmarshal([]byte(data), &instance)
	if err != nil {
		log.Printf("Failed to unmarshal lab instance: %v", err)
		return
	}

	// Update progress logs and status
	instance.ProgressLogs = append(instance.ProgressLogs, progress)
	instance.Status = progress.Status
	instance.LastUpdatedAt = progress.Timestamp

	// Check if both runner and pty services are active
	runnerActive := false
	ptyActive := false

	for _, logEntry := range instance.ProgressLogs {
		if logEntry.ServiceName == FILE_SYSTEM_SERVICE && logEntry.Status == Active {
			runnerActive = true
		}
		if logEntry.ServiceName == PTY_SERVICE && logEntry.Status == Active {
			ptyActive = true
		}
	}

	// Save updated instance
	updatedData, err := json.Marshal(instance)
	if err != nil {
		log.Printf("Failed to marshal lab instance: %v", err)
		return
	}

	err = RedisClient.HSet(Context, "lab_instances", labID, updatedData).Err()
	if err != nil {
		log.Printf("Failed to update lab instance %s: %v", labID, err)
		return
	}

	// If both services are active, add to monitoring queue
	if runnerActive && ptyActive {
		monitoringEntry := LabMonitoringEntry{
			LabID:         instance.LabID,
			Status:        Booting,
			LastUpdatedAt: instance.LastUpdatedAt,
			CreatedAt:     instance.CreatedAt,
		}

		monitoringData, err := json.Marshal(monitoringEntry)
		if err != nil {
			log.Printf("Failed to marshal monitoring entry: %v", err)
		} else {
			// Remove init message if it exists
			RedisClient.LRem(Context, "labs_monitor", 0, "init")

			err = RedisClient.LPush(Context, "labs_monitor", monitoringData).Err()
			if err != nil {
				log.Printf("Failed to push lab %s to monitoring queue: %v", labID, err)
			} else {
				log.Printf("Lab %s added to monitoring queue - both services are active", labID)
			}
		}
	}

	log.Printf("Lab instance %s progress updated", labID)
}
