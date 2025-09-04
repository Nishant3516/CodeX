package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

func getWorkspaceDir() string {
	// Use absolute path to the shared workspace directory
	return "/workspace"
}

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
	// Try to find an available shell - prefer bash, fallback to sh, then ash
	var shellCmd string

	// 1) try SHELL env
	if envShell := os.Getenv("SHELL"); envShell != "" {
		if path, err := exec.LookPath(envShell); err == nil {
			shellCmd = path
		}
	}

	// 2) try names on PATH
	if shellCmd == "" {
		for _, name := range []string{"sh", "/bin/sh", "/bin/bash", "bash", "ash"} {
			if path, err := exec.LookPath(name); err == nil {
				shellCmd = path
				break
			}
		}
	}

	// 3) fallback to absolute paths
	if shellCmd == "" {
		for _, path := range []string{"/bin/bash", "/bin/sh", "/bin/ash"} {
			if _, err := os.Stat(path); err == nil {
				shellCmd = path
				break
			}
		}
	}

	if shellCmd == "" {
		log.Printf("No shell found ($SHELL, PATH for bash/sh/ash, or /bin/*). PTY cannot start.")
		h.conn.Close()
		return
	}

	log.Printf("Using shell: %s", shellCmd)

	// Diagnostics: stat the file and try a quick `--version` invocation to reveal
	// whether the binary exists, is executable, or fails due to missing loader.
	if fi, err := os.Stat(shellCmd); err == nil {
		mode := fi.Mode()
		log.Printf("Shell file info: size=%d mode=%v", fi.Size(), mode)
		if mode&0111 == 0 {
			log.Printf("Shell %s is not executable (mode %v)", shellCmd, mode)
		}
	} else {
		log.Printf("Stat on shell %s failed: %v", shellCmd, err)
	}

	// Try running `<shell> --version` to capture a helpful error message if exec fails
	testCmd := exec.Command(shellCmd, "--version")
	if out, err := testCmd.CombinedOutput(); err != nil {
		log.Printf("Test exec of shell %s failed: %v, output=%q", shellCmd, err, string(out))
	} else {
		log.Printf("Shell test output: %s", string(out))
	}
	// Start a new shell command
	cmd := exec.Command(shellCmd)
	log.Println("Starting pty with command:", cmd.Args)
	cmd.Dir = getWorkspaceDir()
	// Start the command with a pty
	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start pty: %v", err)
		h.conn.Close()
		return
	}
	log.Printf("Started pty with PID %d", cmd.Process.Pid)
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

		// Update lab monitor queue with user interaction
		labId := os.Getenv("LAB_ID")
		if labId != "" {
			UpdateLabMonitorQueue(labId)
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
