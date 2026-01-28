package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// --- CONSTANTS FOR MARKERS ---
const (
	MarkerStartPrefix = "__DEV_START:"
	MarkerEndPrefix   = "__DEV_END:"
)

type PtyHandler struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

type inboundMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}

type outboundMessage struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

type testRequestEnvelope struct {
	Type         string `json:"type"` // currently: "checkpoint"
	CheckpointID string `json:"checkpointId"`
	Language     string `json:"language"`
}

type runRequestEnvelope struct {
	InitCommands []string `json:"initCommands"`
	RunCommand   string   `json:"runCommand"`
}

func servePty(w http.ResponseWriter, r *http.Request) {
	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	handler := &PtyHandler{conn: conn}
	go handler.start()
}

func (h *PtyHandler) start() {
	defer h.conn.Close()

	backendNetwork := os.Getenv("PTY_BACKEND_NETWORK")
	if backendNetwork == "" {
		backendNetwork = "unix"
	}

	backendAddr := os.Getenv("PTY_BACKEND_ADDR")
	if backendAddr == "" {
		backendAddr = "/tmp/pty/shell.sock"
	}

	// Retry logic for connecting to the PTY backend (socat might be starting)
	var backendConn net.Conn
	var err error
	// Try a few times to connect in case the container is just coming up
	for i := 0; i < 5; i++ {
		backendConn, err = net.Dial(backendNetwork, backendAddr)
		if err == nil {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	if err != nil {
		log.Printf("Failed to connect to PTY backend (%s %s): %v", backendNetwork, backendAddr, err)
		h.sendMessage(outboundMessage{Type: "error", Data: "PTY backend unavailable"})
		return
	}
	defer backendConn.Close()

	// Use a WaitGroup to ensure we don't close the socket while writing/reading
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		h.handlePtyOutput(backendConn)
	}()

	go func() {
		defer wg.Done()
		h.handleWebSocketMessages(backendConn)
	}()

	go h.sendHeartbeat()

	wg.Wait()
}

func (h *PtyHandler) scanForEvents(chunk []byte) {
	s := string(chunk)

	// 1. Check for Command Start Marker
	if strings.Contains(s, MarkerStartPrefix) {
		parts := strings.Split(s, MarkerStartPrefix)
		if len(parts) > 1 {
			rest := parts[1]
			endOfLine := strings.Index(rest, "'")
			if endOfLine != -1 {
				cmdName := rest[:endOfLine]
				h.sendMessage(outboundMessage{Type: "run_executing", Data: map[string]string{"step": cmdName}})
			}
		}
	}

	if strings.Contains(s, MarkerEndPrefix) {
		re := regexp.MustCompile(MarkerEndPrefix + `(.*?):(\d+)`)
		matches := re.FindStringSubmatch(s)
		if len(matches) == 3 {
			cmdName := matches[1]
			exitCode := matches[2]
			status := "success"
			if exitCode != "0" {
				status = "error"
			}
			h.sendMessage(outboundMessage{Type: "run_completed", Data: map[string]string{
				"step":   cmdName,
				"status": status,
				"code":   exitCode,
			}})
		}
	}
	//TODO: Should be updated with an optimal approach later
	if strings.Contains(s, "Local:") || strings.Contains(s, "Listening on") || strings.Contains(s, "http://localhost") {
		h.sendMessage(outboundMessage{Type: "server_ready", Data: s})
	}
}

func (h *PtyHandler) handlePtyOutput(backend io.Reader) {
	buf := make([]byte, 4096) // Larger buffer for efficiency
	for {
		n, err := backend.Read(buf)
		if err != nil {
			if err != io.EOF {
				log.Printf("PTY read error: %v", err)
			}
			return
		}

		h.mu.Lock()
		h.conn.WriteMessage(websocket.TextMessage, buf[:n])
		h.mu.Unlock()

		chunkCopy := make([]byte, n)
		copy(chunkCopy, buf[:n])
		go h.scanForEvents(chunkCopy)
	}
}

func (h *PtyHandler) sendHeartbeat() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		heartbeat := outboundMessage{Type: "heartbeat"}
		h.sendMessage(heartbeat)
	}
}

func (h *PtyHandler) handleWebSocketMessages(backend io.Writer) {
	log.Printf("Starting WebSocket message handler")
	for {
		_, msg, err := h.conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}
		h.updateLabActivity()

		var wsMsg inboundMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			log.Printf("Failed to unmarshal WebSocket message: %v", err)
			log.Printf("Treating as raw input, writing to PTY")
			backend.Write(msg)
			continue
		}

		// Only log interesting messages to keep logs clean
		if wsMsg.Type != "input" && wsMsg.Type != "heartbeat_response" {
			log.Printf("Received WebSocket message: %+v", wsMsg)
		}

		switch wsMsg.Type {
		case "input":
			var data string
			if len(wsMsg.Data) > 0 {
				_ = json.Unmarshal(wsMsg.Data, &data)
			}
			io.WriteString(backend, data)

		case "kill_user_processes":
			h.handleKillUserProcesses(backend)

		case "heartbeat":
			// Server-side heartbeat handling if client sends one
			h.sendMessage(outboundMessage{Type: "heartbeat_response"})

		case "heartbeat_response":
			// Quiet handling of client response

		case "test":
			h.handleTestMessage(wsMsg.Data)

		case "run":
			h.handleRunMessage(wsMsg.Data, backend)

		default:
			log.Printf("Unknown message type: %s", wsMsg.Type)
		}
	}
}

func (h *PtyHandler) handleTestMessage(raw json.RawMessage) {
	// client sends: { type: "test", data: JSON.stringify({...}) }
	// so `data` is a JSON string containing a JSON object.
	var payloadStr string
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &payloadStr)
	}

	if strings.TrimSpace(payloadStr) == "" {
		h.sendMessage(outboundMessage{Type: "test_error", Data: map[string]any{"message": "missing test payload"}})
		return
	}

	var req testRequestEnvelope
	if err := json.Unmarshal([]byte(payloadStr), &req); err != nil {
		h.sendMessage(outboundMessage{Type: "test_error", Data: map[string]any{"message": "invalid test payload: " + err.Error()}})
		return
	}

	fmt.Printf("\n Received the test request, %v", req)
	if req.Type != "checkpoint" || strings.TrimSpace(req.CheckpointID) == "" {
		h.sendMessage(outboundMessage{Type: "test_error", Data: map[string]any{"message": "unsupported test request"}})
		return
	}

	fmt.Printf("Valid checkpoint ID found: %s\n, starting tests", req.CheckpointID)

	h.sendMessage(outboundMessage{Type: "test_started", Data: map[string]any{"checkpointId": req.CheckpointID}})

	go func() {
		// Calling the existing external function provided in your project context
		result, err := RunCheckpointTestForClient(req.CheckpointID, req.Language)
		if err != nil {
			h.sendMessage(outboundMessage{Type: "test_error", Data: map[string]any{"checkpointId": req.CheckpointID, "message": err.Error()}})
			return
		}
		// Calling the existing external function provided in your project context
		StoreTestResultInLab(os.Getenv("LAB_ID"), result)
		h.sendMessage(outboundMessage{Type: "test_completed", Data: result})
	}()
}
func wrapCommand(name, cmd string) string {
	return fmt.Sprintf("echo '%s%s'; %s; echo '%s%s:$?'", MarkerStartPrefix, name, cmd, MarkerEndPrefix, name)
}

func (h *PtyHandler) handleRunMessage(raw json.RawMessage, backend io.Writer) {
	var payloadStr string
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &payloadStr)
	}

	if strings.TrimSpace(payloadStr) == "" {
		h.sendMessage(outboundMessage{Type: "run_error", Data: map[string]any{"message": "missing run payload"}})
		return
	}

	var req runRequestEnvelope
	if err := json.Unmarshal([]byte(payloadStr), &req); err != nil {
		h.sendMessage(outboundMessage{Type: "run_error", Data: map[string]any{"message": "invalid run payload: " + err.Error()}})
		return
	}

	log.Printf("Received run request: init=%v, run=%s", req.InitCommands, req.RunCommand)
	h.sendMessage(outboundMessage{Type: "run_started", Data: map[string]any{"message": "Starting commands..."}})

	// Check if node_modules exists (Optional check kept from original, but inline)
	checkNodeModules := "[ -d /workspace/node_modules ] && echo 'EXISTS' || echo 'MISSING'\n"
	_, _ = io.WriteString(backend, checkNodeModules)
	time.Sleep(100 * time.Millisecond)

	// Execute init commands if provided (e.g. npm install)
	for i, initCmd := range req.InitCommands {
		if strings.TrimSpace(initCmd) != "" {
			log.Printf("Executing init command: %s", initCmd)
			stepName := fmt.Sprintf("init_%d", i)
			// WRAP THE COMMAND
			wrapped := wrapCommand(stepName, initCmd)
			_, _ = io.WriteString(backend, wrapped+"\n")
			time.Sleep(200 * time.Millisecond)
		}
	}

	// Execute run command (e.g. npm run dev)
	if strings.TrimSpace(req.RunCommand) != "" {
		log.Printf("Executing run command: %s", req.RunCommand)
		// WRAP THE COMMAND
		wrapped := wrapCommand("main_run", req.RunCommand)
		_, _ = io.WriteString(backend, wrapped+"\n")
		// We rely on scanForEvents to send the "run_executing" message now
	}
}

func (h *PtyHandler) handleKillUserProcesses(backend io.Writer) {
	log.Printf("Handling kill_user_processes (Fire & Forget)")

	_, _ = backend.Write([]byte{3, 3})

	cleanupScript := `
{
  stty -echo  # Silence output
  
  # 1. Kill any background jobs (like the one we just Ctrl+C'd)
  kill -9 $(jobs -p) 2>/dev/null || true
  
  # 2. Kill all processes owned by this user
  me=$$
  my_uid=$(id -u)
  
  # Get all PIDs for this user
  pids=$(pgrep -u $my_uid)
  
  for pid in $pids; do
    # Protect the shell ($me) and the PTY bridge ($PPID)
    if [ "$pid" != "$me" ] && [ "$pid" != "$PPID" ]; then
       kill -9 $pid 2>/dev/null || true
    fi
  done
  
  stty echo   # Restore echo for the next session
  clear       # Wipe the screen
}
`
	// Execute immediately
	_, _ = io.WriteString(backend, cleanupScript+"\n")
}

func (h *PtyHandler) updateLabActivity() {
	if labID := os.Getenv("LAB_ID"); labID != "" {
		// External function provided in project context
		UpdateLabMonitorQueue(labID)
	}
}

func (h *PtyHandler) sendMessage(msg outboundMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	data, _ := json.Marshal(msg)
	h.conn.WriteMessage(websocket.TextMessage, data)
}
