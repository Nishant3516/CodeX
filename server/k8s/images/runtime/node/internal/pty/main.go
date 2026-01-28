package main

import (
	"log"
	"net/http"
	"os"
	"time"
)

var LabID = os.Getenv("LAB_ID")

func main() {
	// Initialize Redis first
	InitRedis()

	ptyMux := http.NewServeMux()
	ptyMux.HandleFunc("/pty", servePty)
	ptyMux.HandleFunc("/pty/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	UpdateLabInstanceProgress(LabID, LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      Active,
		Message:     "Pseudo-terminal Service Started",
		ServiceName: PTY_SERVICE,
	})
	log.Println("Pseudo-terminal service starting on :8082")
	if err := http.ListenAndServe(":8082", ptyMux); err != nil {
		log.Fatal("Pseudo-terminal server error: ", err)
	}
}
