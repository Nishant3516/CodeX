package utils

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
)

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

type LabProgressEntry struct {
	Timestamp   int64
	Status      LabStatus
	Message     string
	ServiceName LabLogServices
}

type LabMonitoringEntry struct {
	LabID         string
	Status        LabStatus
	LastUpdatedAt int64
	CreatedAt     int64
}

type LabInstanceEntry struct {
	LabID          string
	CreatedAt      int64
	Language       string
	DirtyReadPaths []string
	Status         LabStatus
	LastUpdatedAt  int64
	ProgressLogs   []LabProgressEntry
}

// RedisUtils struct to hold Redis client and context
type RedisUtils struct {
	Client *redis.Client
	Ctx    context.Context
}

// NewRedisUtils creates a new RedisUtils instance
func NewRedisUtils(client *redis.Client, ctx context.Context) *RedisUtils {
	return &RedisUtils{
		Client: client,
		Ctx:    ctx,
	}
}

// CreateLabProgressQueueIfNotExists creates the lab progress queue if it doesn't exist
func (r *RedisUtils) CreateLabProgressQueueIfNotExists() {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	// Initialize labs monitor queue
	exists, err := r.Client.Exists(r.Ctx, "labs_monitor").Result()
	if err != nil {
		log.Fatalf("Failed to check labs monitor queue: %v", err)
	}
	if exists == 0 {
		err = r.Client.LPush(r.Ctx, "labs_monitor", "init").Err()
		if err != nil {
			log.Fatalf("Failed to create labs monitor queue: %v", err)
		}
		// Remove the init placeholder
		r.Client.LRem(r.Ctx, "labs_monitor", 1, "init")
	}

	// Initialize lab instances hash map
	exists, err = r.Client.Exists(r.Ctx, "lab_instances").Result()
	if err != nil {
		log.Fatalf("Failed to check lab instances hash: %v", err)
	}
	if exists == 0 {
		err = r.Client.HSet(r.Ctx, "lab_instances", "init", "init").Err()
		if err != nil {
			log.Fatalf("Failed to create lab instances hash: %v", err)
		}
		// Remove the init placeholder
		r.Client.HDel(r.Ctx, "lab_instances", "init")
	}

	log.Println("Redis queues and hash maps initialized")
}

// CreateLabMonitoringQueueIfNotExists creates the lab monitoring queue if it doesn't exist
func (r *RedisUtils) CreateLabMonitoringQueueIfNotExists() {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	err := r.Client.LPush(r.Ctx, "labs_monitor", "init").Err()
	if err != nil {
		log.Fatalf("Failed to create lab monitoring queue: %v", err)
	}
	err = r.Client.LRem(r.Ctx, "labs_monitor", 1, "init").Err()
	if err != nil {
		log.Fatalf("Failed to remove init placeholder from lab monitoring queue: %v", err)
	}
	log.Println("Lab monitoring queue ensured to exist")
}

// CreateLabInstance creates a new lab instance in Redis
func (r *RedisUtils) CreateLabInstance(instance LabInstanceEntry) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	data, err := json.Marshal(instance)
	if err != nil {
		log.Fatalf("Failed to marshal lab instance: %v", err)
	}

	// Store in hash map for current instances
	err = r.Client.HSet(r.Ctx, "lab_instances", instance.LabID, data).Err()
	if err != nil {
		log.Fatalf("Failed to create lab instance: %v", err)
	}
	log.Printf("Lab instance %s created", instance.LabID)
}

// GetLabInstance retrieves a lab instance from Redis
func (r *RedisUtils) GetLabInstance(labID string) (*LabInstanceEntry, error) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	data, err := r.Client.HGet(r.Ctx, "lab_instances", labID).Result()
	if err != nil {
		return nil, err
	}

	var instance LabInstanceEntry
	err = json.Unmarshal([]byte(data), &instance)
	if err != nil {
		return nil, err
	}

	return &instance, nil
}

// UpdateLabInstanceProgress updates the progress of a lab instance
func (r *RedisUtils) UpdateLabInstanceProgress(labID string, progress LabProgressEntry) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	// Get existing instance
	instance, err := r.GetLabInstance(labID)
	if err != nil {
		log.Printf("Failed to fetch lab instance %s: %v", labID, err)
		return
	}

	// Update progress logs and status
	instance.ProgressLogs = append(instance.ProgressLogs, progress)
	instance.Status = progress.Status
	instance.LastUpdatedAt = progress.Timestamp

	// Save updated instance
	data, err := json.Marshal(instance)
	if err != nil {
		log.Printf("Failed to marshal lab instance: %v", err)
		return
	}

	err = r.Client.HSet(r.Ctx, "lab_instances", labID, data).Err()
	if err != nil {
		log.Printf("Failed to update lab instance %s: %v", labID, err)
		return
	}

	// Check if both runner and pty services are active
	runnerActive := false
	ptyActive := false

	for _, log := range instance.ProgressLogs {
		if log.ServiceName == FILE_SYSTEM_SERVICE && log.Status == Active {
			runnerActive = true
		}
		if log.ServiceName == PTY_SERVICE && log.Status == Active {
			ptyActive = true
		}
	}

	// If both services are active, add to monitoring queue
	if runnerActive && ptyActive && instance.Status == Active {
		monitoringEntry := LabMonitoringEntry{
			LabID:         instance.LabID,
			Status:        instance.Status,
			LastUpdatedAt: instance.LastUpdatedAt,
			CreatedAt:     instance.CreatedAt,
		}

		data, err := json.Marshal(monitoringEntry)
		if err != nil {
			log.Printf("Failed to marshal monitoring entry: %v", err)
			return
		}

		err = r.Client.LPush(r.Ctx, "labs_monitor", data).Err()
		if err != nil {
			log.Printf("Failed to push lab %s to monitoring queue: %v", labID, err)
			return
		}
		log.Printf("Lab %s added to monitoring queue", labID)
	}

	log.Printf("Lab instance %s progress updated", labID)
}

// GetLabIdProgress gets the progress for a specific lab ID
func (r *RedisUtils) GetLabIdProgress(labID string) (*LabInstanceEntry, error) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	return r.GetLabInstance(labID)
}

// GetNumberOfActiveLabInstances gets the number of active lab instances
func (r *RedisUtils) GetNumberOfActiveLabInstances() (uint64, error) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	count, err := r.Client.LLen(r.Ctx, "labs_monitor").Uint64()
	if err != nil {
		log.Printf("Failed to fetch number of active lab instances: %v", err)
		return 0, err
	}

	return count, nil
}

// RemoveLabInstance removes a lab instance from current instances
func (r *RedisUtils) RemoveLabInstance(labID string) {
	if r.Client == nil {
		log.Fatalf("Redis client is not initialized")
	}

	err := r.Client.HDel(r.Ctx, "lab_instances", labID).Err()
	if err != nil {
		log.Printf("Failed to remove lab instance %s: %v", labID, err)
	} else {
		log.Printf("Lab instance %s removed", labID)
	}

	err = r.Client.LRem(r.Ctx, "labs_monitor", 0, labID).Err()
	if err != nil {
		log.Printf("Failed to remove lab %s from monitoring queue: %v", labID, err)
	} else {
		log.Printf("Lab %s removed from monitoring queue", labID)
	}
}

// Global RedisUtils instance
var RedisUtilsInstance *RedisUtils

// InitRedisUtils initializes the global RedisUtils instance
func InitRedisUtils(client *redis.Client, ctx context.Context) {
	RedisUtilsInstance = NewRedisUtils(client, ctx)
}
