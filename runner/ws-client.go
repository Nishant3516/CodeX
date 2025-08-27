package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn    *websocket.Conn
	handler *WSManager
	send    chan WSResponse
	done    chan struct{}
}

func NewClient(conn *websocket.Conn, handler *WSManager) *Client {
	return &Client{
		conn:    conn,
		handler: handler,
		send:    make(chan WSResponse, 256),
		done:    make(chan struct{}),
	}
}

func (c *Client) readMessages() {
	defer close(c.done)

	//? INFO: Read limit can be increased and decreased based on payload, but for now as we keep polling the requests so lets keep it simple
	c.conn.SetReadLimit(READ_LIMIT)
	if err := c.conn.SetReadDeadline(time.Now().Add(PONG_WAIT_DURATION)); err != nil {
		log.Println(err)
		return
	}
	c.conn.SetPongHandler(c.pongHandler)

	for {
		_, payload, err := c.conn.ReadMessage()

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error reading message: %v", err)
			}
			break
		}
		var request Event
		if err := json.Unmarshal(payload, &request); err != nil {
			log.Printf("error marshalling message: %v", err)
			c.SendError("Invalid JSON format", err.Error())
			continue
		}
		if err := c.handler.routeEvent(request, c); err != nil {
			log.Println("Error handling Message: ", err)
			c.SendError("Handler error", err.Error())
		}
	}
}

func (c *Client) writeMessages() {
	ticker := time.NewTicker(PING_INTERVAL)
	defer ticker.Stop()

	for {
		select {
		case response, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// Marshal the response to JSON
			data, err := json.Marshal(response)
			if err != nil {
				log.Printf("Error marshaling response: %v", err)
				continue
			}

			// Send the message
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("Error sending ping: %v", err)
				return
			}

		case <-c.done:
			return
		}
	}
}

// SendResponse sends a standardized success response
func (c *Client) SendResponse(responseType string, data interface{}) error {
	response := WSResponse{
		Type:      responseType,
		Status:    STATUS_SUCCESS,
		Data:      data,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	select {
	case c.send <- response:
		return nil
	default:
		return log.Output(1, "Send channel is full")
	}
}

// SendError sends a standardized error response
func (c *Client) SendError(message, details string) error {
	response := WSResponse{
		Type:      RESPONSE_ERROR,
		Status:    STATUS_ERROR,
		Message:   message,
		Data:      map[string]string{"details": details},
		Timestamp: time.Now().Format(time.RFC3339),
	}

	select {
	case c.send <- response:
		return nil
	default:
		return log.Output(1, "Send channel is full")
	}
}

// SendInfo sends a standardized info response
func (c *Client) SendInfo(message string, data interface{}) error {
	response := WSResponse{
		Type:      RESPONSE_INFO,
		Status:    STATUS_INFO,
		Message:   message,
		Data:      data,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	select {
	case c.send <- response:
		return nil
	default:
		return log.Output(1, "Send channel is full")
	}
}

// Close gracefully closes the client connection
func (c *Client) Close() {
	close(c.send)
}

func (c *Client) pongHandler(pongMsg string) error {

	log.Println("pong")
	return c.conn.SetReadDeadline(time.Now().Add(PONG_WAIT_DURATION))
}
