"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Components
import FileExplorer from '@/components/editor/FileExplorer';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import { TerminalPanel } from '@/components/editor/TerminalPanel';
import ProgressIndicator from '@/components/editor/ProgressIndicator';
import { LoadingScreen } from '@/components/editor/LoadingScreen';

// Hooks
import { useFileSystem } from '@/hooks/useV1Lab';
import { usePtyConnection } from '@/hooks/usePtyProbe';
import { PLAYGROUND_OPTIONS } from '@/constants/playground';


// Mock progress data
const mockProgress = {
  questName: "JavaScript Fundamentals",
  currentStep: 3,
  totalSteps: 5,
  completedTasks: 7,
  totalTasks: 12,
  steps: [
    { id: 1, name: "Setup project structure", completed: true, current: false },
    { id: 2, name: "Create HTML layout", completed: true, current: false },
    { id: 3, name: "Add CSS styling", completed: false, current: true },
    { id: 4, name: "Implement JavaScript logic", completed: false, current: false },
    { id: 5, name: "Test and optimize", completed: false, current: false },
  ],
};

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

export default function V1ProjectPage() {
  const params = useParams();
  // Helper to coerce Next.js params
  const getParamString = (p?: string | string[] | undefined) => {
    if (Array.isArray(p)) return p[0] || '';
    if (typeof p === 'string') return p;
    return '';
  };

  const language = getParamString(params?.language) || 'html';
  const labId = getParamString(params?.labId) || 'test-lab'; // Use a default labId for testing

  const FS_URL = `ws://${labId}.quest.arenas.devsarena.in/fs`;

  // State management - ALL useState calls MUST be at the top
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [localFileContents, setLocalFileContents] = useState<{[key: string]: string}>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));
  const [isRunning, setIsRunning] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Editor!', timestamp: new Date() },
  ]);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  
  // Refs for tracking state - ALL useRef calls MUST be at the top
  const savingFiles = useRef<Set<string>>(new Set());

  // File system WebSocket hook - always try to connect
  const {
    isConnected,
    connectionError,
    provisionNeeded: fsProvisionNeeded,
    fileTree,
    fileContents: serverFileContents,
    loading,
    error: fsError,
    loadDirectory,
    loadFileContent,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
  } = useFileSystem(FS_URL, true, { language, labId }); // Always expect containers
  // filesystem hook may report that provisioning is needed via `provisionNeeded`

  // PTY readiness probe
  const { isConnected: ptyConnected, error: ptyError, isConnecting: ptyConnecting, provisionNeeded: ptyProvisionNeeded } = usePtyConnection(labId);

  // Show loading screen until BOTH websockets are connected
  const bothConnected = isConnected && ptyConnected;
  const showLoading = !bothConnected;



  // ALL useEffect and useCallback hooks MUST be before any conditional returns
  
  // Initialize connection status logging
  useEffect(() => {
    if (isConnected) {
      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: 'Connected to file system service',
        timestamp: new Date()
      }]);
    } else if (connectionError) {
      setConsoleLogs(prev => [...prev, {
        type: 'warning',
        message: `Connection failed: ${connectionError}. Retrying...`,
        timestamp: new Date()
      }]);
    }
  }, [isConnected, connectionError]);

  useEffect(() => {
    if (isConnected && Object.keys(fileTree).length > 0 && !activeFile) {
      // Find the first file (not directory) in the file tree
      const findMainFile = (tree: any): string | null => {
        const mainFileName = PLAYGROUND_OPTIONS.find(opt => opt.language === language)?.mainFile;
        if (!mainFileName) return null;

        const recurse = (nodeTree: any): string | null => {
          for (const [name, node] of Object.entries(nodeTree)) {
            if (!node || typeof node !== 'object') continue;
            const typed = node as any;
            const path = typed.path ?? name;
            const nodeName = typed.name ?? name;

            // match by explicit name or by path suffix
            if (!typed.isDir && (nodeName === mainFileName || path.endsWith(`/${mainFileName}`) || name === mainFileName)) {
              return path;
            }

            if (typed.children) {
              const found = recurse(typed.children);
              if (found) return found;
            }
          }
          return null;
        };

        return recurse(tree);
      };
      
      const defaultMainFile = findMainFile(fileTree);
      if (defaultMainFile) {
        setActiveFile(defaultMainFile);

        // Load the first file's content so the editor isn't blank
        (async () => {
          try {
            if (serverFileContents[defaultMainFile] === undefined) {
              await loadFileContent(defaultMainFile);
            }
          } catch (err) {
            setConsoleLogs(prev => [...prev, {
              type: 'error',
              message: `Failed to preload ${defaultMainFile}: ${err}`,
              timestamp: new Date()
            }]);
          }
        })();
      }
    }
  }, [isConnected, fileTree, activeFile, serverFileContents, loadFileContent]);

  // Get current file content (prioritize local edits over server)
  const getCurrentFileContent = useCallback((filePath: string): string => {
    if (localFileContents[filePath] !== undefined) {
      return localFileContents[filePath];
    }
    if (serverFileContents[filePath] !== undefined) {
      return serverFileContents[filePath];
    }
    return '';
  }, [localFileContents, serverFileContents]);

  // Handle file selection
  const handleFileSelect = useCallback(async (path: string) => {
    if (activeFile === path) return;
    
    setActiveFile(path);
    
    try {
      // Load file content from server if not already loaded
      if (serverFileContents[path] === undefined) {
        setConsoleLogs(prev => [...prev, {
          type: 'info',
          message: `Loading ${path}...`,
          timestamp: new Date()
        }]);
        
        await loadFileContent(path);
        
        setConsoleLogs(prev => [...prev, {
          type: 'success',
          message: `Loaded ${path}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to load ${path}: ${error}`,
        timestamp: new Date()
      }]);
    }
  }, [activeFile, serverFileContents, loadFileContent]);

  // Handle directory toggle
  const handleDirectoryToggle = useCallback(async (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      
      // Load directory contents from server
      try {
        setConsoleLogs(prev => [...prev, {
          type: 'info',
          message: `Loading directory ${path}...`,
          timestamp: new Date()
        }]);
        
        await loadDirectory(path);
        
        setConsoleLogs(prev => [...prev, {
          type: 'success',
          message: `Loaded directory ${path}`,
          timestamp: new Date()
        }]);
      } catch (error) {
        setConsoleLogs(prev => [...prev, {
          type: 'error',
          message: `Failed to load directory ${path}: ${error}`,
          timestamp: new Date()
        }]);
      }
    }
    setExpandedDirs(newExpanded);
  }, [expandedDirs, loadDirectory]);

  // Handle code changes
  const handleCodeChange = useCallback((value: string) => {
    if (!activeFile) return;
    
    setLocalFileContents(prev => ({
      ...prev,
      [activeFile]: value
    }));
    
    // Mark file as dirty
    setDirtyFiles(prev => new Set(prev).add(activeFile));
  }, [activeFile]);

  // Handle save (Ctrl+S)
  const handleSave = useCallback(async () => {
    if (!activeFile || savingFiles.current.has(activeFile)) return;

    const content = getCurrentFileContent(activeFile);
    savingFiles.current.add(activeFile);

    // Optimistic save: remove dirty immediately and show toast
    setDirtyFiles(prev => {
      const newDirty = new Set(prev);
      newDirty.delete(activeFile);
      return newDirty;
    });

    setSaveToast(`${activeFile} saved`);
    const toastTimer = setTimeout(() => setSaveToast(null), 2000);

    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Saving ${activeFile}...`,
        timestamp: new Date()
      }]);

      await saveFile(activeFile, content);

      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: `Saved ${activeFile}`,
        timestamp: new Date()
      }]);
    } catch (error) {
      // Re-mark dirty and show error toast
      setDirtyFiles(prev => new Set(prev).add(activeFile));
      clearTimeout(toastTimer);
      setSaveToast(`${activeFile} save failed`);
      setTimeout(() => setSaveToast(null), 2500);

      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to save ${activeFile}: ${error}`,
        timestamp: new Date()
      }]);
    } finally {
      savingFiles.current.delete(activeFile);
    }
  }, [activeFile, getCurrentFileContent, saveFile]);

  // Handle file creation
  const handleFileCreate = useCallback(async (path: string, isDirectory: boolean) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Creating ${isDirectory ? 'directory' : 'file'} ${path}...`,
        timestamp: new Date()
      }]);
      
      await createFile(path, isDirectory, isDirectory ? undefined : '');
      
      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: `Created ${isDirectory ? 'directory' : 'file'} ${path}`,
        timestamp: new Date()
      }]);
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to create ${path}: ${error}`,
        timestamp: new Date()
      }]);
    }
  }, [createFile]);

  // Handle file deletion
  const handleFileDelete = useCallback(async (path: string) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Deleting ${path}...`,
        timestamp: new Date()
      }]);
      
      await deleteFile(path);
      
      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: `Deleted ${path}`,
        timestamp: new Date()
      }]);
      
      // Clear active file if it was deleted
      if (activeFile === path) {
        setActiveFile(null);
      }
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to delete ${path}: ${error}`,
        timestamp: new Date()
      }]);
    }
  }, [deleteFile, activeFile]);

  // Handle file rename
  const handleFileRename = useCallback(async (oldPath: string, newPath: string) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Renaming ${oldPath} to ${newPath}...`,
        timestamp: new Date()
      }]);
      
      await renameFile(oldPath, newPath);
      
      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: `Renamed ${oldPath} to ${newPath}`,
        timestamp: new Date()
      }]);
      
      // Update active file if it was renamed
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to rename ${oldPath}: ${error}`,
        timestamp: new Date()
      }]);
    }
  }, [renameFile, activeFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support Ctrl+S, Meta+S (Mac), and Alt+S as save shortcuts
      const isSave = (e.ctrlKey || e.metaKey || e.altKey) && (e.key === 's' || e.key === 'S');
      if (isSave) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);


  // Handle run
  const handleRun = useCallback(() => {
    setIsRunning(true);
    setConsoleLogs(prev => [...prev, {
      type: 'info',
      message: 'Running project...',
      timestamp: new Date()
    }]);
    
    setTimeout(() => {
      setIsRunning(false);
      setConsoleLogs(prev => [...prev, {
        type: 'success',
        message: 'Project executed successfully!',
        timestamp: new Date()
      }]);
    }, 2000);
  }, []);

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  // Get current file content (prioritize local edits over server)
  const currentFileContent = activeFile ? getCurrentFileContent(activeFile) : '';

  if (showLoading) {
    return (
      <LoadingScreen
        language={language}
        labId={labId}
        fsConnected={isConnected}
  fsError={connectionError || fsError || undefined}
        ptyConnected={ptyConnected}
        ptyError={ptyError}
  fsProvisionNeeded={Boolean(fsProvisionNeeded)}
  ptyProvisionNeeded={ptyProvisionNeeded}
        onReady={() => { /* no-op: page gating handles transition */ }}
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden relative">
  {/* Debug Info removed - no top-left connection overlay per user request */}
      
      {/* Progress Indicator */}
      {/* <ProgressIndicator
        progress={mockProgress}
        isVisible={showProgress}
        onClose={() => setShowProgress(false)}
      /> */}

      {/* Connection Status */}

      {/* Save toast */}
      {saveToast && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-3 py-1 rounded text-sm">
          {saveToast}
        </div>
      )}

      {/* Main Content */}
      {Object.keys(fileTree).length === 0 ? (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <div className="text-xl mb-4">Loading workspace...</div>
            <div className="text-sm text-gray-400">
              {loading ? 'Connecting to file system...' : 'No files found'}
            </div>
          </div>
        </div>
      ) : (

      <PanelGroup direction="horizontal">
        {/* File Explorer Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <FileExplorer
            fileTree={fileTree}
            activeFile={activeFile}
            dirtyFiles={dirtyFiles}
            expandedDirs={expandedDirs}
            onFileSelect={handleFileSelect}
            onDirectoryToggle={handleDirectoryToggle}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

        {/* Code Editor Panel */}
        <Panel defaultSize={50} minSize={30}>
          <CodeEditor
            activeFile={activeFile || ''}
            fileContent={currentFileContent}
            isRunning={isRunning}
            onCodeChange={handleCodeChange}
            onRun={handleRun}
            onSave={handleSave}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

        {/* Preview and Terminal Panel */}
        <Panel defaultSize={30} minSize={20}>
          <PanelGroup direction="vertical">
            {/* Preview Panel */}
            <Panel defaultSize={60} minSize={30}>
              <PreviewPanel
                htmlContent={getCurrentFileContent('src/index.html') || ''}
                cssContent={getCurrentFileContent('src/styles.css') || ''}
                jsContent={getCurrentFileContent('src/script.js') || ''}
                params={{ language, labId }}
              />
            </Panel>

            <PanelResizeHandle className="h-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

            {/* Terminal Panel */}
            <Panel defaultSize={40} minSize={20}>
              <TerminalPanel
                logs={consoleLogs}
                isRunning={isRunning}
                onClear={handleClearConsole}
                params={{ language, labId }}
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
      )}
    </div>
  );
}
