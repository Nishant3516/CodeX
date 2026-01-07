package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
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

	backendConn, err := net.Dial(backendNetwork, backendAddr)
	if err != nil {
		log.Printf("Failed to connect to PTY backend (%s %s): %v", backendNetwork, backendAddr, err)
		h.sendMessage(outboundMessage{Type: "error", Data: "PTY backend unavailable"})
		return
	}
	defer backendConn.Close()

	go h.handlePtyOutput(backendConn)
	go h.sendHeartbeat()
	h.handleWebSocketMessages(backendConn)
}

func (h *PtyHandler) handlePtyOutput(backend io.Reader) {
	buf := make([]byte, 1024)
	for {
		n, err := backend.Read(buf)
		if err != nil {
			return
		}

		h.mu.Lock()
		h.conn.WriteMessage(websocket.TextMessage, buf[:n])
		h.mu.Unlock()
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
		messageType, msg, err := h.conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		log.Printf("Raw WebSocket message received: type=%d, length=%d", messageType, len(msg))
		log.Printf("Raw message content: %s", string(msg))

		h.updateLabActivity()

		var wsMsg inboundMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			log.Printf("Failed to unmarshal WebSocket message: %v", err)
			log.Printf("Treating as raw input, writing to PTY")
			backend.Write(msg)
			continue
		}
		log.Printf("Received WebSocket message: %+v", wsMsg)
		switch wsMsg.Type {
		case "input":
			log.Printf("Handling input message")
			var data string
			if len(wsMsg.Data) > 0 {
				_ = json.Unmarshal(wsMsg.Data, &data)
			}
			io.WriteString(backend, data)
		case "kill_user_processes":
			log.Printf("Handling kill_user_processes message")
			_, _ = backend.Write([]byte{3}) // Ctrl+C (SIGINT to foreground job)
			_, _ = io.WriteString(backend, "\n")
			cleanup := "( " +
				"pids=\"$(jobs -pr 2>/dev/null)\"; " +
				"[ -n \"$pids\" ] && kill -INT $pids 2>/dev/null; " +
				"sleep 0.5; " +
				"[ -n \"$pids\" ] && kill -TERM $pids 2>/dev/null; " +
				"sleep 0.5; " +
				"[ -n \"$pids\" ] && kill -KILL $pids 2>/dev/null; " +
				"child=\"\"; " +
				"if command -v pgrep >/dev/null 2>&1; then child=\"$(pgrep -P $$ 2>/dev/null)\"; " +
				"else child=\"$(ps -o pid= -o ppid= 2>/dev/null | awk -v p=\"$$\" '$2==p {print $1}')\"; fi; " +
				"[ -n \"$child\" ] && kill -TERM $child 2>/dev/null; " +
				"sleep 0.5; " +
				"[ -n \"$child\" ] && kill -KILL $child 2>/dev/null; " +
				")\n"
			_, _ = io.WriteString(backend, cleanup)
		case "heartbeat":
			log.Printf("Handling heartbeat message")
			h.sendMessage(outboundMessage{Type: "heartbeat_response"})
		case "test":
			log.Printf("Handling test message %v", wsMsg.Data)
			h.handleTestMessage(wsMsg.Data)
		case "run":
			log.Printf("Handling run message %v", wsMsg.Data)
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
	fmt.Printf("PAYLOAD STRING %s\n", payloadStr)
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
		result, err := RunCheckpointTestForClient(req.CheckpointID, req.Language)
		if err != nil {
			h.sendMessage(outboundMessage{Type: "test_error", Data: map[string]any{"checkpointId": req.CheckpointID, "message": err.Error()}})
			return
		}
		h.sendMessage(outboundMessage{Type: "test_completed", Data: result})
	}()
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

	// Check if node_modules exists
	checkNodeModules := "[ -d /workspace/node_modules ] && echo 'EXISTS' || echo 'MISSING'\n"
	_, _ = io.WriteString(backend, checkNodeModules)
	time.Sleep(100 * time.Millisecond)

	// Execute init commands if provided
	for _, initCmd := range req.InitCommands {
		if strings.TrimSpace(initCmd) != "" {
			log.Printf("Executing init command: %s", initCmd)
			_, _ = io.WriteString(backend, initCmd+"\n")
			time.Sleep(200 * time.Millisecond)
		}
	}

	// Execute run command
	if strings.TrimSpace(req.RunCommand) != "" {
		log.Printf("Executing run command: %s", req.RunCommand)
		_, _ = io.WriteString(backend, req.RunCommand+"\n")
		h.sendMessage(outboundMessage{Type: "run_executing", Data: map[string]any{"command": req.RunCommand}})
	}
}

func (h *PtyHandler) updateLabActivity() {
	if labID := os.Getenv("LAB_ID"); labID != "" {
		UpdateLabMonitorQueue(labID)
	}
}

func (h *PtyHandler) sendMessage(msg outboundMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	data, _ := json.Marshal(msg)
	h.conn.WriteMessage(websocket.TextMessage, data)
}
