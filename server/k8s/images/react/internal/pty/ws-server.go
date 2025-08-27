package main

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	websocketUpgrader = websocket.Upgrader{
		CheckOrigin:     checkOrigin,
		ReadBufferSize:  5 * 1024 * 1024, // 5 MB
		WriteBufferSize: 5 * 1024 * 1024, // 5 MB

	}
)

type WSManager struct {
	sync.RWMutex
}

func checkOrigin(r *http.Request) bool {
	// origin := r.Header.Get("Origin")
	// log.Printf("Checking origin: %s", origin)
	// //! TODO Implement your origin checking logic here
	// if origin == "http://localhost:3000" {
	// 	log.Printf("Origin check passed for: %s", origin)
	// 	return true
	// }
	return true
}
