"use client";
import React, { useState, useEffect, useCallback, useRef, act } from 'react';
import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Loader2 } from 'lucide-react';

// Components
import FileExplorer from '@/components/editor/FileExplorer';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import { TerminalPanel } from '@/components/editor/TerminalPanel';
import ProgressIndicator from '@/components/editor/ProgressIndicator';
import { LoadingScreen } from '@/components/editor/LoadingScreen';
import { useLabBootstrap } from '@/hooks/useLabBootstrap';

// Hooks
// Legacy hooks removed – migrated to unified bootstrap
import { PLAYGROUND_OPTIONS } from '@/constants/playground';
import { dlog } from '@/utils/debug';


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
  const getParamString = (p?: string | string[] | undefined) => {
    if (Array.isArray(p)) return p[0] || '';
    if (typeof p === 'string') return p;
    return '';
  };

  const language = getParamString(params?.language) || 'html';
  const labId = getParamString(params?.labId) || 'test-lab';

  // Unified bootstrap hook (single path)
  const bootstrap = useLabBootstrap({ labId, language, autoConnectPty: false });

  // State management - ALL useState calls MUST be at the top
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [localFileContents, setLocalFileContents] = useState<{[key: string]: string}>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Editor!', timestamp: new Date() },
  ]);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  // Set when LoadingScreen reports ready; allows us to hide it even if bootstrap says not fully ready yet
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(bootstrap.activeFile);
  

  const savingFiles = useRef<Set<string>>(new Set());

  const bootstrapHasFiles = Object.keys(bootstrap.fileTree).length > 0;
  const mergedIsReady = bootstrap.fsReady && bootstrapHasFiles;
  const mergedFsConnected = bootstrap.fsReady;
  const mergedPtyConnected = bootstrap.ptyReady;
  const mergedFsError = bootstrap.error?.code === 'fs_connect_failed' ? bootstrap.error.message : null;
  const mergedPtyError = bootstrap.error?.code === 'pty_connect_failed' ? bootstrap.error.message : null;

  useEffect(() => {
    if (mergedIsReady) dlog('IDE is ready - user can now interact with the interface');
  }, [mergedIsReady]);

  useEffect(() => {
    if (mergedFsConnected) {
      setConsoleLogs(prev => [...prev, { type: 'success', message: 'Connected to services - IDE ready!', timestamp: new Date() }]);
    } else if (mergedFsError || mergedPtyError) {
      setConsoleLogs(prev => [...prev, { type: 'warning', message: `Connection issues: ${mergedFsError || mergedPtyError}`, timestamp: new Date() }]);
    }
  }, [mergedFsConnected, mergedPtyConnected, mergedFsError, mergedPtyError]);
  useEffect(() => {
    if (bootstrap.activeFile && !activeFile) {
      setActiveFile(bootstrap.activeFile);
      if (loadingFile == bootstrap.activeFile) {
        setLoadingFile(null);
      }
    }
  }, [bootstrap.activeFile, activeFile]);

  // Get current file content (prioritize local edits over server)
  const getCurrentFileContent = useCallback((filePath: string): string => {
    if (localFileContents[filePath] !== undefined) {
      return localFileContents[filePath];
    }
    if (bootstrap.fileContents[filePath] !== undefined) {
      return bootstrap.fileContents[filePath];
    }
    return '';
  }, [localFileContents, bootstrap.fileContents]);


  // Handle file selection
  const handleFileSelect = useCallback(async (path: string) => {
    if (activeFile === path) return;
    
    setActiveFile(path);
    setLoadingFile(path);
    
    try {
      // Load file content from server if not already loaded
      if (bootstrap.fileContents[path] === undefined) {
        setConsoleLogs(prev => [...prev, {
          type: 'info',
          message: `Loading ${path}...`,
          timestamp: new Date()
        }]);
        await bootstrap.openFile(path);
        
        // Check if this file is still the active one
        setConsoleLogs(prev => [...prev, {
          type: 'success',
          message: `Loaded ${path}`,
          timestamp: new Date()
        }]);
      } else {
        // Content is already available, clear loading immediately
        setLoadingFile(null);
      }
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to load ${path}: ${error}`,
        timestamp: new Date()
      }]);
    } finally {
      // Clear loading state only if this file is still the active one
      setLoadingFile(current => current === path ? null : current);
    }
  }, [activeFile, bootstrap.fileContents, bootstrap.openFile]);

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
        
        await bootstrap.loadDirectory(path);        
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
  }, [expandedDirs, bootstrap.loadDirectory]);

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
    if (!activeFile || savingFiles.current.has(activeFile) || !dirtyFiles.has(activeFile)) return;

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

  await bootstrap.saveFile(activeFile, content);

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
  }, [activeFile, getCurrentFileContent, bootstrap.saveFile]);

  // Handle file creation
  const handleFileCreate = useCallback(async (path: string, isDirectory: boolean) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Creating ${isDirectory ? 'directory' : 'file'} ${path}...`,
        timestamp: new Date()
      }]);
      
  await bootstrap.createFile(path, isDirectory, isDirectory ? undefined : '');
      
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
  }, [bootstrap.createFile]);

  // Handle file deletion
  const handleFileDelete = useCallback(async (path: string) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Deleting ${path}...`,
        timestamp: new Date()
      }]);
      
  await bootstrap.deleteFile(path);
      
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
  }, [bootstrap.deleteFile, activeFile]);

  // Handle file rename
  const handleFileRename = useCallback(async (oldPath: string, newPath: string) => {
    try {
      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `Renaming ${oldPath} to ${newPath}...`,
        timestamp: new Date()
      }]);
      
  await bootstrap.renameFile(oldPath, newPath);
      
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
  }, [bootstrap.renameFile, activeFile]);

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

  // NOW WE CAN HAVE CONDITIONAL RETURNS - ALL HOOKS ARE ABOVE THIS LINE

  // Show loading screen until connections are established AND file tree is loaded
  dlog('Main page debug:', {
    isReady: mergedIsReady,
    fileTreeKeys: Object.keys(bootstrap.fileTree),
    fileTreeLength: Object.keys(bootstrap.fileTree).length,
    fsConnected: mergedFsConnected,
    ptyConnected: mergedPtyConnected,
    bootstrapPhase: bootstrap.phase
  });
  
  if (!loadingDone && !mergedIsReady) {
    return (
      <>
        <LoadingScreen
          language={language}
          labId={labId}
          bootstrap={bootstrap}
          onReady={() => {
            dlog('Loading screen complete, transitioning to IDE (setting loadingDone)');
            setLoadingDone(true);
          }}
        />
  {bootstrap.fsReady && !bootstrapHasFiles && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full text-center pointer-events-none">
            <div className="inline-block bg-gray-800/80 border border-gray-700 rounded p-4 pointer-events-auto">
              <div className="text-xs text-gray-300 flex flex-col gap-2 items-center">
                <span>Connected to workspace but file list is still empty.</span>
                {bootstrap.error && <span className="text-red-400">{bootstrap.error.message}</span>}
                <button
                  onClick={() => bootstrap.retryFetchMeta()}
                  className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-xs"
                >Retry Loading Files</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Once loadingDone is true we proceed to render IDE regardless of mergedIsReady; placeholders will show until data fills.

  // Get current file content (prioritize local edits over server)
  const currentFileContent = activeFile ? getCurrentFileContent(activeFile) : '';

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden relative">

      {/* Save toast */}
      {saveToast && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-3 py-1 rounded text-sm">
          {saveToast}
        </div>
      )}

      {/* Main Content - Show IDE immediately when connected */}
      <PanelGroup direction="horizontal">
        {/* File Explorer Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
      {Object.keys(bootstrap.fileTree).length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs px-2 text-center">
  {'Still fetching project files...'}
            </div>
          ) : (
            <FileExplorer
              fileTree={bootstrap.fileTree}
              activeFile={activeFile}
              dirtyFiles={dirtyFiles}
              expandedDirs={expandedDirs}
              onFileSelect={handleFileSelect}
              onDirectoryToggle={handleDirectoryToggle}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onFileRename={handleFileRename}
              isLoading={false}
            />
          )}
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
            isLoading={loadingFile === activeFile}
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
    </div>
  );
}
