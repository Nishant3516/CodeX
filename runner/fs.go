package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"time"
)

var (
	LAB_ID   = ""
	LANGUAGE = ""
)

type fsHandler func(ctx context.Context, payload json.RawMessage, client *Client) error

func InitializeClientHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req InitializeClient
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal initialize client payload: %w", err)
	}

	LANGUAGE = req.Language
	LAB_ID = req.LabID

	log.Printf("Client initialized with Language: %s, LabID: %s", LANGUAGE, LAB_ID)

	return client.SendResponse(RESPONSE_INFO, map[string]string{
		"message":  "Client initialized",
		"language": LANGUAGE,
		"labId":    LAB_ID,
	})
}

// Get workspace directory from environment or default
func getWorkspaceDir() string {
	if dir := os.Getenv("WORKSPACE_DIR"); dir != "" {
		return dir
	}
	return "./workspace" // Default workspace directory
}

// Initialize workspace directory if it doesn't exist
func InitWorkspaceDir() error {
	workspaceDir := getWorkspaceDir()
	if err := os.MkdirAll(workspaceDir, 0755); err != nil {
		return fmt.Errorf("failed to create workspace directory %s: %w", workspaceDir, err)
	}
	log.Printf("Workspace directory initialized: %s", workspaceDir)
	return nil
}

// Safely join path components to prevent directory traversal
func safeJoinPath(basePath, userPath string) string {

	// Join with base path
	fullPath := filepath.Join(basePath, userPath)

	return fullPath
}

// Load directory contents
func LoadDirHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req LoadDirPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal load dir payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	files, err := os.ReadDir(targetPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", targetPath, err)
	}

	var fileInfos []FileInfo
	for _, file := range files {
		info, err := file.Info()
		if err != nil {
			log.Printf("Error getting file info for %s: %v", file.Name(), err)
			continue
		}

		relativePath := filepath.Join(req.Path, file.Name())
		fileInfos = append(fileInfos, FileInfo{
			Name:    file.Name(),
			Path:    relativePath,
			IsDir:   file.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})
	}

	response := DirContentResponse{
		Path:  req.Path,
		Files: fileInfos,
	}

	return client.SendResponse(RESPONSE_DIR_CONTENT, response)
}

// Fetch file content
func FetchFileContentHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req FetchFileContentPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal fetch file content payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	content, err := os.ReadFile(targetPath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", targetPath, err)
	}

	response := FileContentResponse{
		Path:    req.Path,
		Content: string(content),
	}

	// Queue S3 sync for file access
	go queueS3Update("read", req.Path, string(content))

	return client.SendResponse(RESPONSE_FILE_CONTENT, response)
}

// Update file content
func FileContentUpdateHandler(ctx context.Context, payload json.RawMessage, client *Client) error {

	var req FileContentUpdatePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal file content update payload: %w", err)
	}
	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)
	log.Printf("Updating file at path: %s", targetPath)
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", targetPath, err)
	}

	if err := os.WriteFile(targetPath, []byte(req.Content), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", targetPath, err)
	}

	fileUpdatePath := fmt.Sprintf("code/%s/%s/%s", LANGUAGE, LAB_ID, req.Path)
	log.Printf("FILE PATH: %s", fileUpdatePath)

	// Queue S3 sync for file update
	go queueS3Update("update", fileUpdatePath, req.Content)

	return client.SendResponse(RESPONSE_FILE_UPDATED, map[string]interface{}{
		"path":    req.Path,
		"success": true,
	})
}

// Create new file or directory
func NewFileHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req NewFilePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal new file payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", targetPath, err)
	}

	if req.IsDir {
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", targetPath, err)
		}
		// Queue S3 sync for directory creation
		go queueS3Update("create_dir", req.Path, "")
	} else {
		content := req.Content
		if content == "" {
			content = "" // Empty file
		}
		if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
			return fmt.Errorf("failed to create file %s: %w", targetPath, err)
		}
		// Queue S3 sync for file creation
		go queueS3Update("create", req.Path, content)
	}

	return client.SendResponse(RESPONSE_FILE_CREATED, map[string]interface{}{
		"path":    req.Path,
		"isDir":   req.IsDir,
		"success": true,
	})
}

// Delete file or directory
func DeleteFileHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req DeleteFilePayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal delete file payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	// Check if file/directory exists
	info, err := os.Stat(targetPath)
	if err != nil {
		return fmt.Errorf("failed to stat %s: %w", targetPath, err)
	}

	if err := os.RemoveAll(targetPath); err != nil {
		return fmt.Errorf("failed to delete %s: %w", targetPath, err)
	}

	// Queue S3 sync for deletion
	if info.IsDir() {
		go queueS3Update("delete_dir", req.Path, "")
	} else {
		go queueS3Update("delete", req.Path, "")
	}

	return client.SendResponse(RESPONSE_FILE_DELETED, map[string]interface{}{
		"path":    req.Path,
		"success": true,
	})
}

// Edit file metadata (rename/move)
func EditFileMetaHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req EditFileMetaPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal edit file meta payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	oldPath := safeJoinPath(workspaceDir, req.OldPath)
	newPath := safeJoinPath(workspaceDir, req.NewPath)

	// Ensure parent directory exists for new path
	if err := os.MkdirAll(filepath.Dir(newPath), 0755); err != nil {
		return fmt.Errorf("failed to create parent directories for %s: %w", newPath, err)
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("failed to rename %s to %s: %w", oldPath, newPath, err)
	}

	// Queue S3 sync for file move
	go queueS3Update("move", req.OldPath, req.NewPath)

	return client.SendResponse(RESPONSE_FILE_RENAMED, map[string]interface{}{
		"oldPath": req.OldPath,
		"newPath": req.NewPath,
		"success": true,
	})
}

// Fetch quest metadata (root directory structure)
func FetchQuestMetaHandler(ctx context.Context, payload json.RawMessage, client *Client) error {
	var req FetchQuestMetaPayload
	if err := json.Unmarshal(payload, &req); err != nil {
		return fmt.Errorf("failed to unmarshal fetch quest meta payload: %w", err)
	}

	workspaceDir := getWorkspaceDir()
	targetPath := safeJoinPath(workspaceDir, req.Path)

	var fileInfos []FileInfo
	err := filepath.WalkDir(targetPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Get relative path from workspace
		relPath, err := filepath.Rel(workspaceDir, path)
		if err != nil {
			return err
		}

		// Convert to forward slashes for consistency
		relPath = filepath.ToSlash(relPath)

		info, err := d.Info()
		if err != nil {
			log.Printf("Error getting file info for %s: %v", path, err)
			return nil
		}

		fileInfos = append(fileInfos, FileInfo{
			Name:    d.Name(),
			Path:    relPath,
			IsDir:   d.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format(time.RFC3339),
		})

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to walk directory %s: %w", targetPath, err)
	}

	response := QuestMetaResponse{
		Path:  req.Path,
		Files: fileInfos,
	}

	return client.SendResponse(RESPONSE_QUEST_META, response)
}

// Helper function to send response to client (deprecated - use client methods instead)
func sendResponse(client *Client, responseType string, data interface{}) error {
	return client.SendResponse(responseType, data)
}
