package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	S3_UPDATE_BATCH_SIZE = 5
	S3_MAX_RETRIES       = 3
	PING_INTERVAL        = 10 * time.Second
	PONG_WAIT_DURATION   = (PING_INTERVAL * 9) / 10
	READ_LIMIT           = int64(1024 * 1024 * 5) // 5 MB
)

func main() {
	ctx := context.Background()

	// Initialize Redis first
	InitRedis()

	if err := InitWorkspaceDir(); err != nil {
		log.Fatal("Failed to initialize workspace:", err)
	}

	fsMux := http.NewServeMux()
	manager := NewFSManager(ctx)
	manager.setupHandlers()
	fsMux.HandleFunc("/fs", manager.serveFS)
	fsMux.HandleFunc("/fs/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("File system service starting on :8081")
	labId := os.Getenv("LAB_ID")
	UpdateLabInstanceProgress(labId, LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Active,
		Message:     "File System Service Started",
		ServiceName: FILE_SYSTEM_SERVICE,
	})

	if err := http.ListenAndServe(":8081", fsMux); err != nil {
		log.Fatal("File system server error: ", err)
	}
}
