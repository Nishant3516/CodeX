"use client";
import React, { useState, useEffect, useCallback, useRef, act } from 'react';
import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Loader2 } from 'lucide-react';

// Components
import FileExplorer from "@/components/v1/FileExplorer";
import CodeEditor from "@/components/v1/CodeEditor";
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import { TerminalPanel } from '@/components/editor/TerminalPanel';
import type { TerminalHandle } from '@/components/editor/Terminal';
import ProgressIndicator from '@/components/editor/ProgressIndicator';
import { LoadingScreen } from '@/components/editor/LoadingScreen';
import { MaxLabsModal } from '@/components/editor/MaxLabsModal';
import { useLabBootstrap } from '@/hooks/useLabBootstrap';

// Hooks
// Legacy hooks removed – migrated to unified bootstrap
import { PLAYGROUND_OPTIONS } from '@/constants/playground';
import { dlog } from '@/utils/debug';
import { usePty } from '@/hooks/usePty';
import TerminalComponent from '@/components/editor/Terminal';
import { TerminalTabs } from '@/components/editor/TerminalTabs';
import { ResizablePanel } from '@/components/v1/ResizablePanel';


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

  // Find the current playground option based on language
  const currentPlaygroundOption = PLAYGROUND_OPTIONS.find(option => option.id === language);

  // Unified bootstrap hook (single path)
  const bootstrap = useLabBootstrap({ labId, language, autoConnectPty: false });

  // State management - ALL useState calls MUST be at the top
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [localFileContents, setLocalFileContents] = useState<{[key: string]: string}>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));
    const [fileExplorerCollapsed, setFileExplorerCollapsed] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Editor!', timestamp: new Date() },
  ]);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  // Set when LoadingScreen reports ready; allows us to hide it even if bootstrap says not fully ready yet
  const [loadingDone, setLoadingDone] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(bootstrap.activeFile);
  const [showMaxLabsModal, setShowMaxLabsModal] = useState(false);
  
  const lastRunCommandRef = useRef<string | null>(null);
  const savingFiles = useRef<Set<string>>(new Set());
    const terminalRef = useRef<TerminalHandle>(null);
    const [previewReloadNonce, setPreviewReloadNonce] = useState<number>(0);
      const [openFiles, setOpenFiles] = useState<
        Array<{
          path: string;
          name: string;
          content: string;
          isDirty: boolean;
          language: string;
        }>
      >([]);
  
    // Initialize PTY Hook
    const pty = usePty({
      labId,
      language,
      // 1. Pipe Incoming Data: Socket -> Terminal UI
      onTerminalData: (data) => {
        terminalRef.current?.write(data);
      },
      // 2. Handle Server Ready (Auto-open preview)
      onServerReady: (url) => {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "success",
            message: `Server ready at ${url}`,
            timestamp: new Date(),
          },
        ]);
        setPreviewReloadNonce(Date.now());
      },
    });
  
    const isRunning = pty.runStatus.isRunning;
  
    // 3. Connect/Disconnect Lifecycle
    // We trigger connection only when the FileSystem is ready
    useEffect(() => {
      if (bootstrap.fsReady) {
        pty.connect();
      }
      return () => pty.disconnect();
    }, [bootstrap.fsReady, pty.connect, pty.disconnect]);
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      pty.killProcesses();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      pty.killProcesses();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [pty.killProcesses]);

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

  // Show max labs modal when error occurs
  useEffect(() => {
    console.log('Bootstrap error changed:', bootstrap.error);
    if (bootstrap.error?.code === 'max_labs_exceeded' ||
        (bootstrap.error?.message && bootstrap.error.message.toLowerCase().includes('maximum')) ||
        (bootstrap.error?.message && bootstrap.error.message.toLowerCase().includes('exceeded'))) {
      console.log('Showing max labs modal');
      setShowMaxLabsModal(true);
    } else if (bootstrap.error) {
      console.log('Different error detected:', bootstrap.error.code, bootstrap.error.message);
    }
  }, [bootstrap.error]);

  useEffect(() => {
     if (bootstrap.activeFile && !activeFile) {
       setActiveFile(bootstrap.activeFile);
       // If there's an initial activeFile but no content yet, show loading
       if (!bootstrap.fileContents[bootstrap.activeFile]) {
         setLoadingFile(bootstrap.activeFile);
       }
 
       // Add the initial active file to openFiles if not already there
       const fileName =
         bootstrap.activeFile.split("/").pop() || bootstrap.activeFile;
       const language = fileName.split(".").pop()?.toLowerCase() || "text";
       const content = bootstrap.fileContents[bootstrap.activeFile] || "";
 
       setOpenFiles((prev) => {
         if (prev.find((f) => f.path === bootstrap.activeFile)) return prev;
         return [
           ...prev,
           {
             path: bootstrap.activeFile!, // Non-null assertion since we checked above
             name: fileName,
             content,
             isDirty: false,
             language,
           },
         ];
       });
     }
   }, [bootstrap.activeFile, activeFile, bootstrap.fileContents]);
 
   // Sync bootstrap file contents with openFiles
   useEffect(() => {
     setOpenFiles((prev) => {
       return prev.map((file) => {
         const bootstrapContent = bootstrap.fileContents[file.path];
         if (
           bootstrapContent !== undefined &&
           file.content !== bootstrapContent
         ) {
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
     setLoadingFile((current) => {
       if (current && bootstrap.fileContents[current] !== undefined) {
         return null;
       }
       return current;
     });
   }, [bootstrap.fileContents, localFileContents]);
 
   // Show max labs modal when error occurs
   useEffect(() => {
     if (
       bootstrap.error?.code === "max_labs_exceeded" ||
       (bootstrap.error?.message &&
         bootstrap.error.message.toLowerCase().includes("maximum")) ||
       (bootstrap.error?.message &&
         bootstrap.error.message.toLowerCase().includes("exceeded"))
     ) {
       setShowMaxLabsModal(true);
     }
   }, [bootstrap.error]);
 
   // Get current file content (prioritize local edits over server)
   const getCurrentFileContent = useCallback(
     (filePath: string): string => {
       if (localFileContents[filePath] !== undefined) {
         return localFileContents[filePath];
       }
       if (bootstrap.fileContents[filePath] !== undefined) {
         return bootstrap.fileContents[filePath];
       }
       return "";
     },
     [localFileContents, bootstrap.fileContents],
   );
 
   // Handle file selection
   const handleFileSelect = useCallback(
     async (path: string) => {
       if (activeFile === path) return;
 
       setActiveFile(path);
 
       // Add to open files immediately if not already there
       const fileName = path.split("/").pop() || path;
       const language = fileName.split(".").pop()?.toLowerCase() || "text";
 
       setOpenFiles((prev) => {
         if (prev.find((f) => f.path === path)) return prev;
         return [
           ...prev,
           {
             path,
             name: fileName,
             content: "", // Start with empty content, will be updated when loaded
             isDirty: false,
             language,
           },
         ];
       });
 
       try {
         // Only fetch if we don't have the content yet
         if (bootstrap.fileContents[path] === undefined) {
           setLoadingFile(path);
 
           setConsoleLogs((prev) => [
             ...prev,
             {
               type: "info",
               message: `Loading ${path}...`,
               timestamp: new Date(),
             },
           ]);
 
           await bootstrap.openFile(path);
 
           setConsoleLogs((prev) => [
             ...prev,
             {
               type: "success",
               message: `Loaded ${path}`,
               timestamp: new Date(),
             },
           ]);
         } else {
           // File already loaded, update content immediately
           const content = getCurrentFileContent(path);
           const originalContent = bootstrap.fileContents[path] || "";
           const isDirty =
             localFileContents[path] !== undefined &&
             localFileContents[path] !== originalContent;
 
           setOpenFiles((prev) =>
             prev.map((f) => (f.path === path ? { ...f, content, isDirty } : f)),
           );
         }
       } catch (error) {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "error",
             message: `Failed to load ${path}: ${error}`,
             timestamp: new Date(),
           },
         ]);
       } finally {
         // Clear loading state only if this is still the file being loaded
         setLoadingFile((current) => (current === path ? null : current));
       }
     },
     [
       activeFile,
       bootstrap.fileContents,
       bootstrap.openFile,
       getCurrentFileContent,
       localFileContents,
     ],
   );
 
   // Handle directory toggle
   const handleDirectoryToggle = useCallback(
     async (path: string) => {
       const newExpanded = new Set(expandedDirs);
       if (newExpanded.has(path)) {
         newExpanded.delete(path);
       } else {
         newExpanded.add(path);
 
         try {
           setConsoleLogs((prev) => [
             ...prev,
             {
               type: "info",
               message: `Loading directory ${path}...`,
               timestamp: new Date(),
             },
           ]);
 
           await bootstrap.loadDirectory(path);
           setConsoleLogs((prev) => [
             ...prev,
             {
               type: "success",
               message: `Loaded directory ${path}`,
               timestamp: new Date(),
             },
           ]);
         } catch (error) {
           setConsoleLogs((prev) => [
             ...prev,
             {
               type: "error",
               message: `Failed to load directory ${path}: ${error}`,
               timestamp: new Date(),
             },
           ]);
         }
       }
       setExpandedDirs(newExpanded);
     },
     [expandedDirs, bootstrap.loadDirectory],
   );
 
   // Handle code changes
   const handleCodeChange = useCallback(
     (filePath: string, content: string) => {
       setLocalFileContents((prev) => ({ ...prev, [filePath]: content }));
 
       // Only mark as dirty if the content is different from the original server content
       const originalContent = bootstrap.fileContents[filePath] || "";
       const isDirty = content !== originalContent;
 
       if (isDirty) {
         setDirtyFiles((prev) => new Set([...prev, filePath]));
       } else {
         setDirtyFiles((prev) => {
           const newDirty = new Set(prev);
           newDirty.delete(filePath);
           return newDirty;
         });
       }
 
       // Update open files list
       setOpenFiles((prev) =>
         prev.map((f) => (f.path === filePath ? { ...f, content, isDirty } : f)),
       );
     },
     [bootstrap.fileContents],
   );
 
   // Handle save (Ctrl+S)
   const handleSave = useCallback(async () => {
     if (
       !activeFile ||
       savingFiles.current.has(activeFile) ||
       !dirtyFiles.has(activeFile)
     )
       return;
 
     const content = getCurrentFileContent(activeFile);
     savingFiles.current.add(activeFile);
 
     setDirtyFiles((prev) => {
       const newDirty = new Set(prev);
       newDirty.delete(activeFile);
       return newDirty;
     });
 
     setSaveToast(`${activeFile} saved`);
     const toastTimer = setTimeout(() => setSaveToast(null), 2000);
 
     try {
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "info",
           message: `Saving ${activeFile}...`,
           timestamp: new Date(),
         },
       ]);
 
       await bootstrap.saveFile(activeFile, content);
       setOpenFiles((prev) =>
         prev.map((f) => (f.path === activeFile ? { ...f, isDirty: false } : f)),
       );
 
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "success",
           message: `Saved ${activeFile}`,
           timestamp: new Date(),
         },
       ]);
     } catch (error) {
       setDirtyFiles((prev) => new Set(prev).add(activeFile));
       clearTimeout(toastTimer);
       setSaveToast(`${activeFile} save failed`);
       setTimeout(() => setSaveToast(null), 2500);
 
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "error",
           message: `Failed to save ${activeFile}: ${error}`,
           timestamp: new Date(),
         },
       ]);
     } finally {
       savingFiles.current.delete(activeFile);
     }
   }, [activeFile, getCurrentFileContent, bootstrap.saveFile]);
   const handleRun = useCallback(async () => {
     const startList = currentPlaygroundOption?.startCommands || [];
     if (startList.length === 0) {
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "warning",
           message: "No start commands configured for this project type",
           timestamp: new Date(),
         },
       ]);
       return;
     }
 
     // Prevent duplicate runs
     const primary = startList[0];
     if (pty.runStatus.isRunning && lastRunCommandRef.current === primary) {
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "warning",
           message: `Already running: ${primary}`,
           timestamp: new Date(),
         },
       ]);
       return;
     }
 
     lastRunCommandRef.current = primary;
 
     // Note: pty.runStatus.isRunning will update automatically via socket events,
     // but we log immediately for UI responsiveness.
     setConsoleLogs((prev) => [
       ...prev,
       { type: "info", message: "Starting project...", timestamp: new Date() },
     ]);
 
     try {
 
 
       // 2. Prepare Command Structure
       // We treat the *last* command in startList as the "Main Run Command"
       // and everything before it (plus initCommand) as "Initialization".
       const initCmds: string[] = [];
 
       // Check node_modules using bootstrap state
       const hasNodeModules = !!bootstrap.fileTree["node_modules"];
       const needsInit = currentPlaygroundOption?.initCommand && !hasNodeModules;
 
       if (needsInit) {
         const initCmd = currentPlaygroundOption!.initCommand as string;
         setConsoleLogs((prev) => [
           ...prev,
           { type: "info", message: `Init: ${initCmd}`, timestamp: new Date() },
         ]);
         initCmds.push(initCmd);
       }
 
       // Split startList: All except last are init; Last is run.
       const runCommand = startList[startList.length - 1];
       const preRunCommands = startList.slice(0, -1);
 
       preRunCommands.forEach((cmd) => {
         setConsoleLogs((prev) => [
           ...prev,
           { type: "info", message: `Exec: ${cmd}`, timestamp: new Date() },
         ]);
         initCmds.push(cmd);
       });
 
       // 3. Execute via PTY Hook
       // This handles the JSON wrapping and socket transmission
       pty.runProject(initCmds, runCommand);
 
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "success",
           message: "Startup commands sent. Waiting for server output...",
           timestamp: new Date(),
         },
       ]);
 
       // Note: The `setTimeout` fallback is no longer strictly necessary as
       // `pty.runStatus` is managed by the server, but we leave it implicitly
       // handled by the hook's state management.
     } catch (e: any) {
       setConsoleLogs((prev) => [
         ...prev,
         {
           type: "error",
           message: `Run failed: ${e?.message || e}`,
           timestamp: new Date(),
         },
       ]);
     }
   }, [currentPlaygroundOption, bootstrap.fileTree, pty]);


   const handleSubmit = () => {dlog("DEBUG: SUBMITTED")}
   // Handle file creation
   const handleFileCreate = useCallback(
     async (path: string, isDirectory: boolean) => {
       try {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "info",
             message: `Creating ${isDirectory ? "directory" : "file"} ${path}...`,
             timestamp: new Date(),
           },
         ]);
 
         await bootstrap.createFile(
           path,
           isDirectory,
           isDirectory ? undefined : "",
         );
 
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "success",
             message: `Created ${isDirectory ? "directory" : "file"} ${path}`,
             timestamp: new Date(),
           },
         ]);
       } catch (error) {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "error",
             message: `Failed to create ${path}: ${error}`,
             timestamp: new Date(),
           },
         ]);
       }
     },
     [bootstrap.createFile],
   );
 
   // Handle file deletion
   const handleFileDelete = useCallback(
     async (path: string) => {
       try {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "info",
             message: `Deleting ${path}...`,
             timestamp: new Date(),
           },
         ]);
 
         await bootstrap.deleteFile(path);
 
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "success",
             message: `Deleted ${path}`,
             timestamp: new Date(),
           },
         ]);
 
         if (activeFile === path) {
           setActiveFile(null);
         }
       } catch (error) {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "error",
             message: `Failed to delete ${path}: ${error}`,
             timestamp: new Date(),
           },
         ]);
       }
     },
     [bootstrap.deleteFile, activeFile],
   );
 
   // Handle file rename
   const handleFileRename = useCallback(
     async (oldPath: string, newPath: string) => {
       try {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "info",
             message: `Renaming ${oldPath} to ${newPath}...`,
             timestamp: new Date(),
           },
         ]);
 
         await bootstrap.renameFile(oldPath, newPath);
 
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "success",
             message: `Renamed ${oldPath} to ${newPath}`,
             timestamp: new Date(),
           },
         ]);
 
         if (activeFile === oldPath) {
           setActiveFile(newPath);
         }
       } catch (error) {
         setConsoleLogs((prev) => [
           ...prev,
           {
             type: "error",
             message: `Failed to rename ${oldPath}: ${error}`,
             timestamp: new Date(),
           },
         ]);
       }
     },
     [bootstrap.renameFile, activeFile],
   );
 
   // Keyboard shortcuts
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       const isSave =
         (e.ctrlKey || e.metaKey || e.altKey) &&
         (e.key === "s" || e.key === "S");
       if (isSave) {
         e.preventDefault();
         handleSave();
       }
     };
 
     window.addEventListener("keydown", handleKeyDown);
     return () => window.removeEventListener("keydown", handleKeyDown);
   }, [handleSave]);
 
   // Handle file operations for CodeEditor
   const handleFileClose = useCallback(
     (filePath: string) => {
       setOpenFiles((prev) => prev.filter((f) => f.path !== filePath));
       // If closing the active file, switch to another open file or clear active file
       if (activeFile === filePath) {
         const remaining = openFiles.filter((f) => f.path !== filePath);
         setActiveFile(remaining.length > 0 ? remaining[0].path : null);
       }
     },
     [openFiles, activeFile],
   );



  
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
            onSubmit={handleSubmit}
            shouldShowTest={false}
            onSave={handleSave}
            isRunning={isRunning}
            isRunningTests={pty.testState.isRunning}
            currentTestingCheckpoint={pty.testState.currentCheckpoint}
            language={language}
            loadingFile={loadingFile}
          />
        </div>
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
                startCommands={currentPlaygroundOption ? [ ...(currentPlaygroundOption?.initCommand ? [currentPlaygroundOption.initCommand] : []), ...(currentPlaygroundOption.startCommands || [])].filter(Boolean) : []}
              />
            </Panel>

            <PanelResizeHandle className="h-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

            {/* Terminal Panel */}
            <Panel defaultSize={40} minSize={20}>
              <TerminalComponent
                ref={terminalRef}
                isConnected={pty.connectionState === "connected"}
                connectionError={pty.runStatus.error}
                labId={labId}
                onRetry={pty.connect}
                onInput={(data) => pty.write(data)}
                onResize={(cols, rows) => pty.resize(cols, rows)}
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {/* Max Labs Modal */}
      <MaxLabsModal
        isOpen={showMaxLabsModal}
        onClose={() => setShowMaxLabsModal(false)}
      />
    </div>
  );
}
