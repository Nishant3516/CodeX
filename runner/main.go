package main

import (
	"context"
	"log"
	"net/http"
	"time"
)

var (
	S3_UPDATE_BATCH_SIZE = 5
	S3_MAX_RETRIES       = 3
	PING_INTERVAL        = 10 * time.Second
	PONG_WAIT_DURATION   = (PING_INTERVAL * 9) / 10
	READ_LIMIT           = int64(1024)
)

func main() {

	rootCtx := context.Background()
	ctx, cancel := context.WithCancel(rootCtx)

	defer cancel()

	// Initialize workspace directory
	if err := InitWorkspaceDir(); err != nil {
		log.Fatal("Failed to initialize workspace:", err)
	}

	// Start S3 batch processor
	startS3BatchProcessor()

	// Start the File System WebSocket server on port 8081
	go func() {
		fsMux := http.NewServeMux()
		manager := NewFSManager(ctx)
		manager.setupHandlers()
		fsMux.HandleFunc("/fs", manager.serveFS)
		fsMux.HandleFunc("/fs/health", HealthCheckHandler)
		if err := http.ListenAndServe(":8081", fsMux); err != nil {
			log.Fatal("File system server error: ", err)
		}
	}()

	// Start the Pseudo-Terminal WebSocket server on port 8082
	go func() {
		ptyMux := http.NewServeMux()
		ptyMux.HandleFunc("/pty", servePty)
		ptyMux.HandleFunc("/pty/health", HealthCheckHandler)
		if err := http.ListenAndServe(":8082", ptyMux); err != nil {
			log.Fatal("Pseudo-terminal server error: ", err)
		}
	}()

	log.Println("All services started. The application is running.")
	// Keep the main goroutine alive
	select {}

}

func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
