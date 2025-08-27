package main

import (
	"log"
	"net/http"
)

func main() {
	ptyMux := http.NewServeMux()
	ptyMux.HandleFunc("/pty", servePty)
	ptyMux.HandleFunc("/pty/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Println("Pseudo-terminal service starting on :8082")
	if err := http.ListenAndServe(":8082", ptyMux); err != nil {
		log.Fatal("Pseudo-terminal server error: ", err)
	}
}
