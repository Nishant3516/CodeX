package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// ptyHandler manages the WebSocket connection for the pseudo-terminal.
type ptyHandler struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

// startPtyServer sets up the HTTP handler for the pseudo-terminal WebSocket.
func startPtyServer() {
	http.HandleFunc("/pty", servePty)
	log.Println("Pseudo-terminal WebSocket server listening on :8082")
}

// servePty upgrades the HTTP connection to a WebSocket and starts the pty session.
func servePty(w http.ResponseWriter, r *http.Request) {
	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket for pty: %v", err)
		return
	}

	handler := &ptyHandler{conn: conn}
	go handler.startPtySession()
}

// startPtySession creates a new pty and bridges its I/O to the WebSocket.
func (h *ptyHandler) startPtySession() {
	// Start a new shell command
	cmd := exec.Command("/bin/sh")
	cmd.Dir = getWorkspaceDir() // Start the shell in the shared workspace

	// Start the command with a pty
	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start pty: %v", err)
		h.conn.Close()
		return
	}
	defer ptmx.Close()

	// Start a goroutine to copy output from the pty to the WebSocket
	go func() {
		for {
			buf := make([]byte, 1024)
			n, err := ptmx.Read(buf)
			if err != nil {
				log.Printf("Error reading from pty: %v", err)
				h.conn.Close()
				return
			}
			h.mu.Lock()
			if err := h.conn.WriteMessage(websocket.TextMessage, buf[:n]); err != nil {
				log.Printf("Error writing to WebSocket: %v", err)
				h.mu.Unlock()
				return
			}
			h.mu.Unlock()
		}
	}()

	// Read messages from the WebSocket and write to the pty
	for {
		_, msg, err := h.conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading from WebSocket: %v", err)
			break
		}
		// The message from the frontend might be JSON-encoded
		var input map[string]string
		if err := json.Unmarshal(msg, &input); err == nil {
			if data, ok := input["data"]; ok {
				if _, err := io.WriteString(ptmx, data); err != nil {
					log.Printf("Error writing to pty: %v", err)
					break
				}
			}
		} else {
			// Fallback for raw strings
			if _, err := ptmx.Write(msg); err != nil {
				log.Printf("Error writing raw message to pty: %v", err)
				break
			}
		}
	}

	cmd.Process.Kill()
}
