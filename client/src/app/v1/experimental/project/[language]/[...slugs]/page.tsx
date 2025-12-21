"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Components
import { ResizablePanel } from '@/components/v1/ResizablePanel';
import FileExplorer from '@/components/v1/FileExplorer';
import CodeEditor from '@/components/v1/CodeEditor';
import { RightPanel } from '@/components/v1/RightPanel';
import { LoadingScreen } from '@/components/editor/LoadingScreen';
import { MaxLabsModal } from '@/components/editor/MaxLabsModal';

// Hooks
import { useLabBootstrap } from '@/hooks/useLabBootstrap';
import { PLAYGROUND_OPTIONS } from '@/constants/playground';
import { dlog } from '@/utils/debug';

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

interface QuestMetadata {
  success: boolean;
  quest: {
    id: string;
    name: string;
    description: string;
    difficulty: string;
    category: string;
    tech_stack: string[];
    topics: string[];
    checkpoints: number;
    requirements: string[];
  };
  projectSlug: string;
  metadata: {
    name: string;
    description: string;
    difficulty: string;
    category: string;
    techStack: string[];
    topics: string[];
    checkpoints: number;
    requirements: string[];
  };
}

export default function ExperimentalProjectPage() {
  const params = useParams();
  const getParamString = (p?: string | string[] | undefined) => {
    if (Array.isArray(p)) return p[0] || '';
    if (typeof p === 'string') return p;
    return '';
  };

  const language = getParamString(params?.language) || 'html';
  const slugsArray = Array.isArray(params?.slugs) ? params?.slugs : [];
  const [projectSlug, labId] = slugsArray;
  console.log('Params:', params, 'LabId:', labId, 'ProjectSlug:', projectSlug);
  
  // Find the current playground option based on language
  const currentPlaygroundOption = PLAYGROUND_OPTIONS.find(option => option.id === language);

  // Unified bootstrap hook
  const bootstrap = useLabBootstrap({ 
    labId, // Use projectId as labId for the bootstrap hook
    language, 
    autoConnectPty: true,
    requirePtyForReady: true
  });

  // State management
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [localFileContents, setLocalFileContents] = useState<{[key: string]: string}>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Experimental IDE!', timestamp: new Date() },
  ]);
  const terminalHandleRef = useRef<any>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [showMaxLabsModal, setShowMaxLabsModal] = useState(false);
  const [fileExplorerCollapsed, setFileExplorerCollapsed] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'instructions' | 'test-results' | 'discussions' | 'video'>('preview');
  const [showTerminal, setShowTerminal] = useState(true);
  const [openFiles, setOpenFiles] = useState<Array<{path: string, name: string, content: string, isDirty: boolean, language: string}>>([]);
  const [questMetadata, setQuestMetadata] = useState<QuestMetadata | null>(null);
  const [loadingQuestData, setLoadingQuestData] = useState(false);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loadingTestResults, setLoadingTestResults] = useState(false);
  const [currentTestingCheckpoint, setCurrentTestingCheckpoint] = useState<string | null>(null);
  // Test state is now managed by useLabBootstrap

  const savingFiles = useRef<Set<string>>(new Set());


  const bootstrapHasFiles = Object.keys(bootstrap.fileTree).length > 0;
  const mergedIsReady = bootstrap.fsReady && bootstrapHasFiles;
  const mergedFsConnected = bootstrap.fsReady;
  const mergedPtyConnected = bootstrap.ptyReady;
  // Test server connection is now managed by bootstrap
  const mergedFsError = bootstrap.error?.code === 'fs_connect_failed' ? bootstrap.error.message : null;
  const mergedPtyError = bootstrap.error?.code === 'pty_connect_failed' ? bootstrap.error.message : null;

  useEffect(() => {
    if (mergedIsReady) dlog('Experimental IDE is ready - user can now interact with the interface');
  }, [mergedIsReady]);

  // Fetch quest metadata when component mounts
  useEffect(() => {
    const fetchQuestData = async () => {
      if (!labId) return;
      
      setLoadingQuestData(true);
      try {
        const [metadataResponse, checkpointsResponse] = await Promise.all([
          fetch(`/api/v1/experimental/quest/${projectSlug}`),
          fetch(`/api/v1/experimental/quest/${projectSlug}/checkpoints`)
        ]);

        if (metadataResponse.ok) {
          const data: QuestMetadata = await metadataResponse.json();
          setQuestMetadata(data);
          
          setConsoleLogs(prev => [...prev, {
            type: 'success',
            message: `Loaded quest: ${data.metadata.name} (${data.metadata.difficulty})`,
            timestamp: new Date()
          }]);
        }

        if (checkpointsResponse.ok) {
          const checkpointsData = await checkpointsResponse.json();
          console.log('Checkpoints data fetched:', checkpointsData);
          setCheckpoints(checkpointsData.checkpoints || []);
          
          setConsoleLogs(prev => [...prev, {
            type: 'success',
            message: `Loaded ${checkpointsData.checkpoints?.length || 0} checkpoints`,
            timestamp: new Date()
          }]);
        } else {
          console.warn('Failed to fetch checkpoints:', checkpointsResponse.status);
          setConsoleLogs(prev => [...prev, {
            type: 'warning',
            message: 'Failed to load checkpoints data',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error fetching quest data:', error);
        setConsoleLogs(prev => [...prev, {
          type: 'warning',
          message: 'Could not load quest metadata - continuing with basic mode',
          timestamp: new Date()
        }]);
      } finally {
        setLoadingQuestData(false);
      }
    };

    fetchQuestData();
  }, [labId, projectSlug]);

  // Fetch test results
  useEffect(() => {
    const fetchTestResults = async () => {
      if (!labId) return;
      
      setLoadingTestResults(true);
      try {
        const response = await fetch(`/api/v1/test-results/${labId}`);
        if (response.ok) {
          const data = await response.json();
          // Test results are now managed by bootstrap hook
          // setTestResults(data.results || {});
        }
      } catch (error) {
        console.error('Error fetching test results:', error);
      } finally {
        setLoadingTestResults(false);
      }
    };

    fetchTestResults();
  }, [labId]);

  useEffect(() => {
    if (mergedFsConnected) {
      setConsoleLogs(prev => [...prev, { type: 'success', message: 'Connected to all services - IDE ready!', timestamp: new Date() }]);
    } else if (mergedFsError || mergedPtyError) {
      setConsoleLogs(prev => [...prev, { type: 'warning', message: `Connection issues: ${mergedFsError || mergedPtyError}`, timestamp: new Date() }]);
    }
  }, [mergedFsConnected, mergedPtyConnected, mergedFsError, mergedPtyError]);

  useEffect(() => {
    if (bootstrap.activeFile && !activeFile) {
      setActiveFile(bootstrap.activeFile);
      // If there's an initial activeFile but no content yet, show loading
      if (!bootstrap.fileContents[bootstrap.activeFile]) {
        setLoadingFile(bootstrap.activeFile);
      }
      
      // Add the initial active file to openFiles if not already there
      const fileName = bootstrap.activeFile.split('/').pop() || bootstrap.activeFile;
      const language = fileName.split('.').pop()?.toLowerCase() || 'text';
      const content = bootstrap.fileContents[bootstrap.activeFile] || '';
      
      setOpenFiles(prev => {
        if (prev.find(f => f.path === bootstrap.activeFile)) return prev;
        return [...prev, { 
          path: bootstrap.activeFile!, // Non-null assertion since we checked above
          name: fileName, 
          content, 
          isDirty: false, 
          language 
        }];
      });
    }
  }, [bootstrap.activeFile, activeFile, bootstrap.fileContents]);

  // Sync bootstrap file contents with openFiles
  useEffect(() => {
    setOpenFiles(prev => {
      return prev.map(file => {
        const bootstrapContent = bootstrap.fileContents[file.path];
        if (bootstrapContent !== undefined && file.content !== bootstrapContent) {
          // Only update if there's no local unsaved content
          const hasLocalChanges = localFileContents[file.path] !== undefined;
          if (!hasLocalChanges) {
            return { ...file, content: bootstrapContent, isDirty: false };
          }
        }
        return file;
      });
    });

    // Clear loading state for files that have been loaded
    setLoadingFile(current => {
      if (current && bootstrap.fileContents[current] !== undefined) {
        return null;
      }
      return current;
    });
  }, [bootstrap.fileContents, localFileContents]);

  // Show max labs modal when error occurs
  useEffect(() => {
    if (bootstrap.error?.code === 'max_labs_exceeded' ||
        (bootstrap.error?.message && bootstrap.error.message.toLowerCase().includes('maximum')) ||
        (bootstrap.error?.message && bootstrap.error.message.toLowerCase().includes('exceeded'))) {
      setShowMaxLabsModal(true);
    }
  }, [bootstrap.error]);

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
    
    // Add to open files immediately if not already there
    const fileName = path.split('/').pop() || path;
    const language = fileName.split('.').pop()?.toLowerCase() || 'text';
    
    setOpenFiles(prev => {
      if (prev.find(f => f.path === path)) return prev;
      return [...prev, { 
        path, 
        name: fileName, 
        content: '', // Start with empty content, will be updated when loaded
        isDirty: false, 
        language 
      }];
    });
    
    try {
      // Only fetch if we don't have the content yet
      if (bootstrap.fileContents[path] === undefined) {
        setLoadingFile(path);
        
        setConsoleLogs(prev => [...prev, {
          type: 'info',
          message: `Loading ${path}...`,
          timestamp: new Date()
        }]);
        
        await bootstrap.openFile(path);
        
        setConsoleLogs(prev => [...prev, {
          type: 'success',
          message: `Loaded ${path}`,
          timestamp: new Date()
        }]);
      } else {
        // File already loaded, update content immediately
        const content = getCurrentFileContent(path);
        const originalContent = bootstrap.fileContents[path] || '';
        const isDirty = localFileContents[path] !== undefined && localFileContents[path] !== originalContent;
        
        setOpenFiles(prev => prev.map(f => 
          f.path === path ? { ...f, content, isDirty } : f
        ));
      }
      
    } catch (error) {
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `Failed to load ${path}: ${error}`,
        timestamp: new Date()
      }]);
    } finally {
      // Clear loading state only if this is still the file being loaded
      setLoadingFile(current => current === path ? null : current);
    }
  }, [activeFile, bootstrap.fileContents, bootstrap.openFile, getCurrentFileContent, localFileContents]);

  // Handle directory toggle
  const handleDirectoryToggle = useCallback(async (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      
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
  const handleCodeChange = useCallback((filePath: string, content: string) => {
    setLocalFileContents(prev => ({ ...prev, [filePath]: content }));
    
    // Only mark as dirty if the content is different from the original server content
    const originalContent = bootstrap.fileContents[filePath] || '';
    const isDirty = content !== originalContent;
    
    if (isDirty) {
      setDirtyFiles(prev => new Set([...prev, filePath]));
    } else {
      setDirtyFiles(prev => {
        const newDirty = new Set(prev);
        newDirty.delete(filePath);
        return newDirty;
      });
    }
    
    // Update open files list
    setOpenFiles(prev => prev.map(f => 
      f.path === filePath ? { ...f, content, isDirty } : f
    ));
  }, [bootstrap.fileContents]);

  // Handle save (Ctrl+S)
  const handleSave = useCallback(async () => {
    if (!activeFile || savingFiles.current.has(activeFile) || !dirtyFiles.has(activeFile)) return;

    const content = getCurrentFileContent(activeFile);
    savingFiles.current.add(activeFile);

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
      const isSave = (e.ctrlKey || e.metaKey || e.altKey) && (e.key === 's' || e.key === 'S');
      if (isSave) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Handle file operations for CodeEditor
  const handleFileClose = useCallback((filePath: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== filePath));
    // If closing the active file, switch to another open file or clear active file
    if (activeFile === filePath) {
      const remaining = openFiles.filter(f => f.path !== filePath);
      setActiveFile(remaining.length > 0 ? remaining[0].path : null);
    }
  }, [openFiles, activeFile]);

  const handleTest = useCallback(async () => {
    if (bootstrap.isRunningTests) {
      setConsoleLogs(prev => [...prev, {
        type: 'warning',
        message: 'Tests are already running. Please wait...',
        timestamp: new Date()
      }]);
      return;
    }

    console.log('Submitting code for testing...');

    try {
      // Save all dirty files first
      await handleSave();

      // Switch to test results tab immediately
      setActiveRightTab('test-results');

      // Determine current checkpoint to test
      const nextCheckpoint = bootstrap.currentCheckpoint + 1;
      const checkpointId = `${nextCheckpoint}`;

      setConsoleLogs(prev => [...prev, {
        type: 'info',
        message: `🔄 Running tests for checkpoint ${nextCheckpoint}...`,
        timestamp: new Date()
      }]);
      console.log('Checkpoint ID:', checkpointId);

      // Run test using the bootstrap hook
      await bootstrap.runCheckpointTest(checkpointId, language);

      // Check results and log them
      const results = bootstrap.testResults[checkpointId];
      console.log('Test results:', results);
      if (results) {
        setConsoleLogs(prev => [...prev, {
          type: results.passed ? 'success' : 'error',
          message: `${results.passed ? '✅' : '❌'} Checkpoint ${nextCheckpoint} tests ${results.passed ? 'passed' : 'failed'}. Passed: ${results.summary?.passedTests || 0}, Failed: ${results.summary?.failedTests || 0}`,
          timestamp: new Date()
        }]);

        // Add detailed test results
        if (results.tests && Array.isArray(results.tests)) {
          results.tests.forEach((test: any) => {
            setConsoleLogs(prev => [...prev, {
              type: test.status === 'passed' ? 'success' : 'error',
              message: `  ${test.status === 'passed' ? '✓' : '✗'} ${test.testName}${test.message ? ` - ${test.message}` : ''}`,
              timestamp: new Date()
            }]);
          });
        }
      }

    } catch (error: any) {
      console.error('Error running tests:', error);
      setConsoleLogs(prev => [...prev, {
        type: 'error',
        message: `❌ Failed to run checkpoint tests: ${error.message || error}`,
        timestamp: new Date()
      }]);
    }
  }, [language, handleSave, bootstrap, setActiveRightTab]);

  // Handle run with smart command execution
  const lastRunCommandRef = useRef<string | null>(null);
  const handleRun = useCallback(async () => {
    const startList = currentPlaygroundOption?.startCommands || [];
    if (startList.length === 0) {
      setConsoleLogs(prev => [...prev, { type: 'warning', message: 'No start commands configured for this project type', timestamp: new Date() }]);
      return;
    }
    const hasNodeModules = !!bootstrap.fileTree['node_modules'];
    const needsInit = currentPlaygroundOption?.initCommand && !hasNodeModules;

    // Avoid duplicate run of same primary command
    const primary = startList[0];
    if (isRunning && lastRunCommandRef.current === primary) {
      setConsoleLogs(prev => [...prev, { type: 'warning', message: `Already running: ${primary}`, timestamp: new Date() }]);
      return;
    }

    if (!terminalHandleRef.current) {
      setConsoleLogs(prev => [...prev, { type: 'error', message: 'Terminal not ready yet', timestamp: new Date() }]);
      return;
    }

    // Switch to preview tab to show terminal
    setActiveRightTab('preview');

    lastRunCommandRef.current = primary;
    setIsRunning(true);
    setConsoleLogs(prev => [...prev, { type: 'info', message: 'Starting project...', timestamp: new Date() }]);

    try {
      if (needsInit) {
        setConsoleLogs(prev => [...prev, { type: 'info', message: `Init: ${currentPlaygroundOption!.initCommand}`, timestamp: new Date() }]);
        terminalHandleRef.current.executeCommand(currentPlaygroundOption!.initCommand);
        // crude wait; in future parse install output
        await new Promise(r => setTimeout(r, 2500));
      }
      for (const cmd of startList) {
        setConsoleLogs(prev => [...prev, { type: 'info', message: `Exec: ${cmd}`, timestamp: new Date() }]);
        terminalHandleRef.current.executeCommand(cmd);
        await new Promise(r => setTimeout(r, 400));
      }
      setConsoleLogs(prev => [...prev, { type: 'success', message: 'Startup commands sent. Waiting for server output...', timestamp: new Date() }]);
      // Fallback: auto-clear running after 5 minutes if no manual stop (avoid stuck state)
      setTimeout(() => {
        setIsRunning(current => current && lastRunCommandRef.current === primary ? false : current);
      }, 5 * 60 * 1000);
    } catch (e:any) {
      setConsoleLogs(prev => [...prev, { type: 'error', message: `Run failed: ${e?.message || e}`, timestamp: new Date() }]);
      setIsRunning(false);
      return;
    }
  }, [currentPlaygroundOption, bootstrap.fileTree, isRunning]);

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  // Show loading screen until connections are established AND file tree is loaded
  if (!loadingDone && !mergedIsReady) {
    return (
      <>
        <LoadingScreen
          language={language}
          labId={labId}
          bootstrap={bootstrap}
          onReady={() => {
            dlog('Loading screen complete, transitioning to Experimental IDE');
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

  const currentFileContent = activeFile ? getCurrentFileContent(activeFile) : '';

  // Debug log for checkpoints
  useEffect(() => {
    console.log('Checkpoints state updated:', checkpoints);
  }, [checkpoints]);

  // Handle test completion and show notification
  useEffect(() => {
    const testResultsKeys = Object.keys(bootstrap.testResults);
    if (testResultsKeys.length > 0 && !bootstrap.isRunningTests) {
      const latestResult = bootstrap.testResults[testResultsKeys[testResultsKeys.length - 1]];
      if (latestResult) {
        setConsoleLogs(prev => [...prev, {
          type: latestResult.passed ? 'success' : 'error',
          message: `${latestResult.passed ? '✅' : '❌'} Test results available in Test Results tab`,
          timestamp: new Date()
        }]);
      }
    }
  }, [bootstrap.testResults, bootstrap.isRunningTests]);

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden relative">
      {/* Save toast */}
      {saveToast && (
        <div className="absolute top-4 right-4 z-50 bg-green-600 text-white px-3 py-1 rounded text-sm">
          {saveToast}
        </div>
      )}

      {/* Main IDE Layout */}
      <div className="flex h-full">
        {/* Left Panel - File Explorer */}
        <ResizablePanel 
          minWidth={fileExplorerCollapsed ? 50 : 200}
          maxWidth={400}
          defaultWidth={280}
          collapsed={fileExplorerCollapsed}
          onCollapseChange={setFileExplorerCollapsed}
        >
          <FileExplorer
            fileTree={bootstrap.fileTree}
            activeFile={activeFile}
            dirtyFiles={dirtyFiles}
            expandedDirs={expandedDirs}
            isCollapsed={fileExplorerCollapsed}
            onFileSelect={handleFileSelect}
            onDirectoryToggle={handleDirectoryToggle}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            isLoading={Object.keys(bootstrap.fileTree).length === 0}
          />
        </ResizablePanel>

        {/* Center Panel - Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <CodeEditor
            openFiles={openFiles}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            onFileClose={handleFileClose}
            onFileContentChange={handleCodeChange}
            onRun={handleRun}
            onSubmit={handleTest}
            onSave={handleSave}
            isRunning={isRunning}
            isRunningTests={bootstrap.isRunningTests}
            currentTestingCheckpoint={bootstrap.isRunningTests ? `${bootstrap.currentCheckpoint + 1}` : null}
            language={language}
            loadingFile={loadingFile}
          />
        </div>

        {/* Right Panel - Preview/Instructions/etc */}
        <ResizablePanel 
          minWidth={350}
          maxWidth={800}
          defaultWidth={450}
          position="right"
        >
          <RightPanel
            activeTab={activeRightTab as 'preview' | 'instructions' | 'test-results'}
            onTabChange={setActiveRightTab}
            htmlContent={getCurrentFileContent('index.html')}
            cssContent={getCurrentFileContent('style.css')}
            jsContent={getCurrentFileContent('script.js')}
            language={language}
            labId={labId}
            startCommands={currentPlaygroundOption?.startCommands}
            questMetadata={questMetadata}
            loadingQuestData={loadingQuestData}
            checkpoints={checkpoints}
            testResults={bootstrap.testResults}
            loadingTestResults={bootstrap.isRunningTests}
            isRunningTests={bootstrap.isRunningTests}
            currentTestingCheckpoint={bootstrap.isRunningTests ? `${bootstrap.currentCheckpoint + 1}` : null}
            params={{
              language,
              labId
            }}
            onTerminalReady={(handle) => { terminalHandleRef.current = handle; }}
          />
        </ResizablePanel>
      </div>

      {/* Max Labs Modal */}
      <MaxLabsModal
        isOpen={showMaxLabsModal}
        onClose={() => setShowMaxLabsModal(false)}
      />
    </div>
  );
}