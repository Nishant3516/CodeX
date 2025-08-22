import { useState, useEffect, useCallback } from 'react';
import { LogEntry, EditorState } from '@/types/editor';
import { extractFileContents, saveToLocalStorage, loadFromLocalStorage, debounce } from '@/utils/editorUtils';

interface UseEditorOptions {
  initialFiles: { [key: string]: any };
  initialActiveFile?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const useEditor = ({
  initialFiles,
  initialActiveFile = 'src/index.html',
  autoSave = true,
  autoSaveDelay = 1000
}: UseEditorOptions) => {
  
  // Core state
  const [activeFile, setActiveFile] = useState(initialActiveFile);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [isRunning, setIsRunning] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Editor!', timestamp: new Date() },
    { type: 'success', message: 'Project loaded successfully', timestamp: new Date() }
  ]);

  // Initialize file contents on mount
  useEffect(() => {
    const contents = extractFileContents(initialFiles);
    const savedContents = loadFromLocalStorage('editor-file-contents', contents);
    setFileContents(savedContents);
  }, [initialFiles]);

  // Auto-save functionality
  const debouncedSave = useCallback(
    debounce((contents: { [key: string]: string }) => {
      if (autoSave) {
        saveToLocalStorage('editor-file-contents', contents);
        addLog('info', 'Auto-saved changes');
      }
    }, autoSaveDelay),
    [autoSave, autoSaveDelay]
  );

  // Update file contents and trigger auto-save
  const updateFileContent = useCallback((filePath: string, content: string) => {
    setFileContents(prev => {
      const updated = { ...prev, [filePath]: content };
      debouncedSave(updated);
      return updated;
    });
  }, [debouncedSave]);

  // File management
  const selectFile = useCallback((path: string) => {
    setActiveFile(path);
    addLog('info', `Opened ${path}`);
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  // Console management
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setConsoleLogs(prev => [...prev, {
      type,
      message,
      timestamp: new Date()
    }]);
  }, []);

  const clearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  // Project execution
  const runProject = useCallback(() => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('info', 'Running project...');
    
    // Simulate execution time
    setTimeout(() => {
      setIsRunning(false);
      addLog('success', 'Project executed successfully!');
    }, 2000);
  }, [isRunning, addLog]);

  const stopProject = useCallback(() => {
    if (!isRunning) return;
    
    setIsRunning(false);
    addLog('warning', 'Project execution stopped');
  }, [isRunning, addLog]);

  // File operations
  const saveFile = useCallback((filePath?: string) => {
    const targetFile = filePath || activeFile;
    saveToLocalStorage('editor-file-contents', fileContents);
    addLog('success', `Saved ${targetFile}`);
  }, [activeFile, fileContents, addLog]);

  const createNewFile = useCallback(() => {
    addLog('info', 'New file feature coming soon!');
  }, [addLog]);

  const createNewFolder = useCallback(() => {
    addLog('info', 'New folder feature coming soon!');
  }, [addLog]);

  // Progress management
  const toggleProgress = useCallback(() => {
    setShowProgress(prev => !prev);
  }, []);

  // Get current file content
  const getCurrentFileContent = useCallback(() => {
    return fileContents[activeFile] || '';
  }, [fileContents, activeFile]);

  // Get specific file contents for preview
  const getFileContent = useCallback((filePath: string) => {
    return fileContents[filePath] || '';
  }, [fileContents]);

  return {
    // State
    state: {
      activeFile,
      fileContents,
      expandedFolders,
      isRunning,
      showProgress,
      consoleLogs
    } as EditorState,
    
    // Actions
    actions: {
      selectFile,
      updateFileContent,
      toggleFolder,
      addLog,
      clearConsole,
      runProject,
      stopProject,
      saveFile,
      createNewFile,
      createNewFolder,
      toggleProgress
    },
    
    // Getters
    getCurrentFileContent,
    getFileContent
  };
};
