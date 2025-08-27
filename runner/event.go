package main

import "encoding/json"

var (
	FS_FILE_CONTENT_UPDATE = "fs_file_content_update"
	FS_LOAD_DIR            = "fs_load_dir"
	FS_FETCH_FILE_CONTENT  = "fs_fetch_file_content"
	FS_NEW_FILE            = "fs_new_file"
	FS_DELETE_FILE         = "fs_delete_file"
	FS_EDIT_FILE_META      = "fs_edit_file_meta"
	FS_FETCH_QUEST_META    = "fs_fetch_quest_meta"
	FS_INITIALIZE_CLIENT   = "fs_initialize_client"
)

type InitializeClient struct {
	Language string `json:"language,omitempty"`
	LabID    string `json:"labId,omitempty"`
}

type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// Payload structures for file system events
type FileContentUpdatePayload struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type LoadDirPayload struct {
	Path string `json:"path"`
}

type FetchFileContentPayload struct {
	Path string `json:"path"`
}

type NewFilePayload struct {
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Content string `json:"content,omitempty"`
}

type DeleteFilePayload struct {
	Path string `json:"path"`
}

type EditFileMetaPayload struct {
	OldPath string `json:"oldPath"`
	NewPath string `json:"newPath"`
}

type FetchQuestMetaPayload struct {
	Path string `json:"path"`
}

// Response structures
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

type DirContentResponse struct {
	Path  string     `json:"path"`
	Files []FileInfo `json:"files"`
}

type FileContentResponse struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type QuestMetaResponse struct {
	Path  string     `json:"path"`
	Files []FileInfo `json:"files"`
}

// Standardized response structure
type WSResponse struct {
	Type      string      `json:"type"`
	Status    string      `json:"status"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// Response status constants
const (
	STATUS_SUCCESS = "success"
	STATUS_ERROR   = "error"
	STATUS_INFO    = "info"
)

// Standard response types
const (
	RESPONSE_DIR_CONTENT  = "dir_content"
	RESPONSE_FILE_CONTENT = "file_content"
	RESPONSE_FILE_UPDATED = "file_updated"
	RESPONSE_FILE_CREATED = "file_created"
	RESPONSE_FILE_DELETED = "file_deleted"
	RESPONSE_FILE_RENAMED = "file_renamed"
	RESPONSE_QUEST_META   = "quest_meta"
	RESPONSE_ERROR        = "error"
	RESPONSE_CONNECTION   = "connection"
	RESPONSE_HEARTBEAT    = "heartbeat"
	RESPONSE_INFO         = "info"
)
