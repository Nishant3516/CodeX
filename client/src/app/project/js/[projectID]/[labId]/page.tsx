"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ResizableSidebar from "@/components/ResizableSidebar";
import FileExplorer from "@/components/v1/FileExplorer";
import CodeEditor from "@/components/v1/CodeEditor";
import PreviewIframe from "@/components/PreviewIframe";
import RunControls from "@/components/RunControls";
import SplitPane from "@/components/SplitPane";
import ConsoleOutput from "@/components/ConsoleOutput";
import CheckpointFloatingUI from "@/components/CheckpointFloatingUI";
import CelebrationModal from "@/components/CelebrationModal";
import SettingsModal, { SettingsState, defaultSettings } from "@/components/SettingsModal";
import { prettifyCode } from "@/utils/prettifier";
import { TestRunner } from "@/utils/testRunner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useProject } from "@/hooks/useProject";
import { useProjectStore } from "@/store/projectStore";
import { ProjectData, CheckpointProgress, StoredProgress } from "@/types/project";

type FileTreeNode =
  | { type: "folder"; path: string; children: Record<string, FileTreeNode> }
  | { type: "file"; path: string };


type Params = {
  params: Promise<{
    projectID: string;
  }>;
};

const getLanguage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "css":
      return "css";
    case "html":
      return "html";
    case "json":
      return "json";
    case "md":
      return "markdown";
    default:
      return "text";
  }
};

const buildFileTree = (files: string[], folders: string[]): Record<string, FileTreeNode> => {
  const tree: Record<string, FileTreeNode> = {};

  const addFolder = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    let node = tree;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!node[part] || node[part].type !== "folder") {
        node[part] = { type: "folder", path: currentPath, children: {} };
      }
      node = (node[part] as { type: "folder"; children: Record<string, FileTreeNode> }).children;
    }
  };

  const addFile = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    let node = tree;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (index === parts.length - 1) {
        node[part] = { type: "file", path: currentPath };
      } else {
        if (!node[part] || node[part].type !== "folder") {
          node[part] = { type: "folder", path: currentPath, children: {} };
        }
        node = (node[part] as { type: "folder"; children: Record<string, FileTreeNode> }).children;
      }
    });
  };

  folders.forEach(addFolder);
  files.forEach(addFile);

  return tree;
};

export default function ProjectPage({ params }: Params) {
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isIframeReady, setIsIframeReady] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [fileExplorerCollapsed] = useState(false);
  
  // Use the project hook for dynamic data loading
  const { loading, error } = useProject(params);
  
  // Zustand store
  const {
    projectData,
    currentCheckpoint,
    checkpointProgress,
    files,
    contents,
    activeFile,
    isTestingInProgress,
    navigateToCheckpoint,
    canNavigateToCheckpoint,
    updateFileContent,
    setFiles,
    setActiveFile,
    addFile,
    setIsTestingInProgress,
    updateCheckpointProgress,
    initializeProject,
    saveProgress,
  } = useProjectStore();

  // Initialize state from localStorage or boilerplate when projectData is ready
  useEffect(() => {
    if (!projectData) return;
    (async () => {
	  const { projectID } = await params;
	  initializeProject(projectID, projectData);
    })();
  }, [projectData, initializeProject, params]);

  // Check for completion and show celebration
  useEffect(() => {
    if (!projectData || checkpointProgress.length === 0) return;
    
    const completedCheckpoints = checkpointProgress.filter(cp => cp.completed).length;
    const totalCheckpoints = projectData.checkpoints.length;
    
    // Show celebration when all checkpoints are completed
    if (completedCheckpoints === totalCheckpoints && totalCheckpoints > 0) {
      // Small delay to let the user see the final checkpoint completion
      const timer = setTimeout(() => {
        setShowCelebration(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [checkpointProgress, projectData]);
  
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const ensureParentFolders = useCallback((path: string) => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length <= 1) return;
    const parents: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join("/");
      parents.push(folderPath);
    }
    setFolderPaths((prev) => Array.from(new Set([...prev, ...parents])));
    setExpandedDirs((prev) => new Set([...prev, ...parents]));
  }, []);

  const handleSelect = (file: string) => setActiveFile(file);

  const handleDirectoryToggle = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleCreate = (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      setFolderPaths((prev) => Array.from(new Set([...prev, path])));
      setExpandedDirs((prev) => new Set([...prev, path]));
      return;
    }

    if (!files.includes(path)) {
      addFile(path);
      ensureParentFolders(path);
    }
    setActiveFile(path);
  };

  const handleDelete = (path: string) => {
    setFiles(files.filter((file) => file !== path));
    if (activeFile === path) {
      const remaining = files.filter((file) => file !== path);
      setActiveFile(remaining[0] || "index.html");
    }
  };

  const handleRename = (oldPath: string, newPath: string) => {
    if (oldPath === newPath) return;
    const content = contents[oldPath] || "";
    setFiles(files.map((file) => (file === oldPath ? newPath : file)));
    updateFileContent(newPath, content);
    ensureParentFolders(newPath);
    if (activeFile === oldPath) {
      setActiveFile(newPath);
    }
  };

  const updateStoredContent = async (filePath: string, content: string) => {
    const storedProgress = localStorage.getItem('projectProgress');
    const parsedProgress = storedProgress ? JSON.parse(storedProgress) : [];
    const { projectID:projectId } = await params;
    let progress: StoredProgress = parsedProgress.find(async (p: StoredProgress) => p.projectId === projectId) ||   {
      files: {},
      projectId: projectId,
      checkPointProgress: []
    };
    if(!storedProgress){
      localStorage.setItem('projectProgress', JSON.stringify([progress]));
      return;
    }

    parsedProgress.forEach((p: StoredProgress) => {
      if (p.projectId === projectId) {
        p.files[filePath] = content;
        p.checkPointProgress = checkpointProgress;
      }
    });
    // Update the stored progress in localStorage
    localStorage.setItem('projectProgress', JSON.stringify(parsedProgress));
  }

  const handleContentChange = useCallback((filePath: string, value: string) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    
    
    // Debounce the store update
    debounceTimerRef.current = setTimeout(() => {
      updateStoredContent(filePath, value);
      updateFileContent(filePath, value);
    }, 300); // 300ms debounce for content changes
  }, [updateFileContent]);

  const derivedFolders = useMemo(() => {
    const set = new Set<string>();
    files.forEach((file) => {
      const parts = file.split("/").filter(Boolean);
      for (let i = 0; i < parts.length - 1; i++) {
        set.add(parts.slice(0, i + 1).join("/"));
      }
    });
    return Array.from(set);
  }, [files]);

  const allFolders = useMemo(
    () => Array.from(new Set([...derivedFolders, ...folderPaths])),
    [derivedFolders, folderPaths]
  );

  const fileTree = useMemo(() => buildFileTree(files, allFolders), [files, allFolders]);

  const dirtyFiles = useMemo(() => new Set<string>(), []);

  const openFiles = useMemo(
    () =>
      files.map((file) => ({
        path: file,
        name: file.split("/").pop() || file,
        content: contents[file] || "",
        isDirty: false,
        language: getLanguage(file),
      })),
    [files, contents]
  );

  const handleRun = useCallback(() => {
    // Clear previous logs and errors
    setConsoleLogs([]);
    setConsoleErrors([]);
    
    const html = contents["index.html"] || "";
    const css = contents["styles.css"] || "";
    const js = contents["script.js"] || "";

    // Create enhanced HTML with console capture and custom alert/prompt
    const enhancedJS = `
      // Custom alert and prompt implementations for iframe
      window.alert = function(message) {
        window.parent.postMessage({
          type: 'custom-alert', 
          message: String(message)
        }, '*');
      };
      
      window.prompt = function(message, defaultValue = '') {
        const userInput = prompt(message, defaultValue);
        window.parent.postMessage({
          type: 'custom-prompt', 
          message: String(message),
          result: userInput
        }, '*');
        return userInput;
      };
      
      window.confirm = function(message) {
        const result = confirm(message);
        window.parent.postMessage({
          type: 'custom-confirm', 
          message: String(message),
          result: result
        }, '*');
        return result;
      };
      
      // Capture console logs and redirect to parent console
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      
      console.log = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: message}, '*');
        // Don't call original to avoid duplication in devtools
      };
      
      console.error = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-error', data: message}, '*');
        // Don't call original to avoid duplication in devtools
      };
      
      console.warn = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: '⚠️ ' + message}, '*');
      };
      
      console.info = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: 'ℹ️ ' + message}, '*');
      };
      
      // Capture runtime errors
      window.onerror = function(msg, url, line, col, error) {
        const errorMsg = \`Error at line \${line}: \${msg}\`;
        window.parent.postMessage({type: 'console-error', data: errorMsg}, '*');
        return false;
      };
      
      window.addEventListener('unhandledrejection', function(event) {
        window.parent.postMessage({
          type: 'console-error', 
          data: 'Unhandled Promise Rejection: ' + event.reason
        }, '*');
      });
      
      // Notify parent when iframe is ready
      window.addEventListener('load', function() {
        window.parent.postMessage({type: 'iframe-ready'}, '*');
      });
      
      // Listen for test script injection requests
      window.addEventListener('message', function(event) {
        if (event.data.type === 'inject-test-script') {
          try {
            // Create a script element and append to document head for safer execution
            const script = document.createElement('script');
            script.textContent = event.data.script;
            document.head.appendChild(script);
            
            // Clean up the script after execution
            setTimeout(() => {
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
            }, 100);
          } catch (error) {
            window.parent.postMessage({
              type: 'test-result',
              testId: event.data.testId,
              result: { passed: false, message: 'Script injection failed: ' + error.message }
            }, '*');
          }
        }
      });
      
      // Execute user's JavaScript code
      ${js}
    `;    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${enhancedJS}</script>
</body>
</html>`;
    
    setSrcDoc(fullHTML);
    setIsIframeReady(false); // Reset iframe ready state
    setConsoleLogs(['🚀 Code executed successfully']);
  }, [contents, settings.cssAutoSemicolon]); // Only depend on contents and settings

  const handleSubmit = async () => {
    // Save progress to localStorage
	const { projectID } = await params;
    saveProgress(projectID);
    setConsoleLogs(prev => [...prev, '💾 Progress saved successfully']);
    console.log("Project progress saved", contents);
  };

  const handlePrettify = async () => {
    if (!activeFile) return;
    const language = getLanguage(activeFile);
    const currentContent = contents[activeFile] || "";
    const prettified = await prettifyCode(currentContent, language);
    updateFileContent(activeFile, prettified);
    setConsoleLogs(prev => [...prev, `✨ Code formatted for ${activeFile}`]);
  };

  const handleClearConsole = () => {
    setConsoleLogs([]);
    setConsoleErrors([]);
  };

  const handleSaveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    localStorage.setItem('editorSettings', JSON.stringify(newSettings));
  };

  // Checkpoint management functions
  const handleCheckpointChange = useCallback(
    (checkpointId: string): void => {
      if (!projectData) {
        return 
      }
      navigateToCheckpoint(checkpointId);
    },
    [navigateToCheckpoint, projectData]
  );

  const handleRunTests = async () => {
    if (!projectData) {
      setConsoleErrors(['❌ Cannot run tests: project data not available']);
      return;
    }
    
    const currentCheckpointData = projectData.checkpoints.find(cp => cp.id === currentCheckpoint);
    if (!currentCheckpointData) {
      setConsoleErrors(['❌ Cannot run tests: checkpoint not found']);
      return;
    }

    // First, execute the code to update the preview
    handleRun();
    
    // Wait a bit for the iframe to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!previewIframeRef.current) {
      setConsoleErrors(['❌ Cannot run tests: preview not available']);
      return;
    }

    setConsoleLogs(prev => [...prev, '🧪 Running tests...']);
    setIsTestingInProgress(true);
    
    try {
      const testRunner = new TestRunner(previewIframeRef.current);
      const testResults = await testRunner.runAllTests(currentCheckpointData.tests);
      
      // Update checkpoint progress
      const newProgress: CheckpointProgress = {
        checkpointId: currentCheckpoint,
        completed: Object.values(testResults).every(result => result.passed),
        testsResults: testResults
      };
      
      updateCheckpointProgress(newProgress);
      
      // Log test results
      const passedTests = Object.values(testResults).filter(result => result.passed).length;
      const totalTests = Object.keys(testResults).length;
      
      setConsoleLogs(prev => [
        ...prev,
        `✅ Tests completed: ${passedTests}/${totalTests} passed`,
        ...Object.entries(testResults).map(([testId, result]) => 
          `${result.passed ? '✅' : '❌'} Test: ${result.message}`
        )
      ]);
      
      if (newProgress.completed) {
        const completionMessages = [
          `🎉 Checkpoint "${currentCheckpointData.title}" completed!`
        ];
        const currentIndex = projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint);
        const nextCheckpoint =
          currentIndex >= 0 ? projectData.checkpoints[currentIndex + 1] : undefined;
        if (nextCheckpoint && navigateToCheckpoint(nextCheckpoint.id)) {
          completionMessages.push(`➡️ Advanced to "${nextCheckpoint.title}"`);
        }
        setConsoleLogs(prev => [...prev, ...completionMessages]);
      }
    } catch (error) {
      setConsoleErrors(prev => [...prev, `❌ Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsTestingInProgress(false);
      setShowConsole(true);
    }
  };

  // Separate function to update preview without validation side effects
  const updatePreview = useCallback(() => {
    const html = contents["index.html"] || "";
    const css = contents["styles.css"] || "";
    const js = contents["script.js"] || "";
    
    // Create enhanced HTML with console capture and custom alert/prompt
    const enhancedJS = `
      // Custom alert and prompt implementations for iframe
     
      
      // Capture console logs and redirect to parent console
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;
      
      console.log = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: message}, '*');
        // Don't call original to avoid duplication in devtools
      };
      
      console.error = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-error', data: message}, '*');
        // Don't call original to avoid duplication in devtools
      };
      
      console.warn = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: '⚠️ ' + message}, '*');
      };
      
      console.info = function(...args) {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        window.parent.postMessage({type: 'console-log', data: 'ℹ️ ' + message}, '*');
      };
      
      // Capture runtime errors
      window.onerror = function(msg, url, line, col, error) {
        const errorMsg = \`Error at line \${line}: \${msg}\`;
        window.parent.postMessage({type: 'console-error', data: errorMsg}, '*');
        return false;
      };
      
      window.addEventListener('unhandledrejection', function(event) {
        window.parent.postMessage({
          type: 'console-error', 
          data: 'Unhandled Promise Rejection: ' + event.reason
        }, '*');
      });
      
      // Notify parent when iframe is ready
      window.addEventListener('load', function() {
        window.parent.postMessage({type: 'iframe-ready'}, '*');
      });
      
      // Listen for test script injection requests
      window.addEventListener('message', function(event) {
        if (event.data.type === 'inject-test-script') {
          try {
            // Create a script element and append to document head for safer execution
            const script = document.createElement('script');
            script.textContent = event.data.script;
            document.head.appendChild(script);
            
            // Clean up the script after execution
            setTimeout(() => {
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
            }, 100);
          } catch (error) {
            window.parent.postMessage({
              type: 'test-result',
              testId: event.data.testId,
              result: { passed: false, message: 'Script injection failed: ' + error.message }
            }, '*');
          }
        }
      });
      
      // Execute user's JavaScript code
      ${js}
    `;
    
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <style>${css}</style>
</head>
<body>
  ${html}
  <script>${enhancedJS}</script>
</body>
</html>`;
    
    setSrcDoc(fullHTML);
    setIsIframeReady(false); // Reset iframe ready state
  }, [contents]);

  // Update preview whenever the actual code content changes (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (files.length > 0 && Object.keys(contents).length > 0) {
        const html = contents["index.html"] || "";
        const css = contents["styles.css"] || "";
        const js = contents["script.js"] || "";
        
        // Only update if we have actual content to render
        if (html || css || js) {
          updatePreview();
        }
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [contents["index.html"], contents["styles.css"], contents["script.js"], updatePreview]);


  async function loadAndInitializeProject(params: Promise<{ projectID: string }>, storedProgress: string ) {
   const projectId = (await params).projectID;
    try {
      const parsedProgress = JSON.parse(storedProgress) as StoredProgress[];

      const thisProjectData = parsedProgress.find((p: StoredProgress) => p.projectId === projectId) as StoredProgress;
      if (!thisProjectData) {
        return;
      }
      setFiles(Object.keys(thisProjectData.files));
      Object.entries(thisProjectData.files).forEach(([fileName, fileContent]) => {
        updateFileContent(fileName, fileContent);
      });
      thisProjectData.checkPointProgress.forEach((checkpoint: CheckpointProgress) => {
        updateCheckpointProgress(checkpoint);
      });
      setActiveFile(thisProjectData.files[0] || "index.html");
    } catch (error) {
      console.error("Failed to load project:", error);
      return;
    }
  }
  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('editorSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    }
  }, []);

  // Set up keyboard shortcuts
  useKeyboardShortcuts(settings.shortcuts, {
    onRun: handleRun,
    onPrettify: handlePrettify,
    onSubmit: handleSubmit,
    onToggleConsole: () => setShowConsole(!showConsole),
  });

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console-log') {
        setConsoleLogs(prev => [...prev, event.data.data]);
        setShowConsole(true);
      } else if (event.data.type === 'console-error') {
        setConsoleErrors(prev => [...prev, event.data.data]);
        setShowConsole(true);
      } else if (event.data.type === 'iframe-ready') {
        setIsIframeReady(true);
      } else if (event.data.type === 'custom-alert') {
        // Handle custom alert from iframe
        setConsoleLogs(prev => [...prev, `🚨 Alert: ${event.data.message}`]);
        setShowConsole(true);
        // You could also show a custom modal here if needed
      } else if (event.data.type === 'custom-prompt') {
        // Handle custom prompt from iframe
        setConsoleLogs(prev => [...prev, `❓ Prompt: ${event.data.message} → ${event.data.result}`]);
        setShowConsole(true);
      } else if (event.data.type === 'custom-confirm') {
        // Handle custom confirm from iframe
        setConsoleLogs(prev => [...prev, `❓ Confirm: ${event.data.message} → ${event.data.result ? 'OK' : 'Cancel'}`]);
        setShowConsole(true);
      } else if (event.data.type === 'run-test') {
        // Handle test execution in iframe
        const iframe = previewIframeRef.current;
        if (iframe && iframe.contentWindow && iframe.contentDocument) {
          try {
            // Create a script element and append it to the iframe's document
            const script = iframe.contentDocument.createElement('script');
            script.textContent = event.data.testCode;
            iframe.contentDocument.head.appendChild(script);
            // Remove the script after execution
            setTimeout(() => {
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
            }, 100);
          } catch (error) {
            window.postMessage({
              type: 'test-result',
              testId: event.data.testId,
              result: { 
                passed: false, 
                message: `Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}` 
              }
            }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-gray-800 overflow-hidden">
      {/* Loading Screen */}
      {loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading Project...</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Fetching project data and assets from the server
            </p>
          </div>
        </div>
      )}

      {/* Error Screen */}
      {error && !loading && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl max-w-md">
            <div className="text-red-500 text-4xl">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to Load Project</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {error.message || "Unable to load project data. Please try refreshing the page."}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show when loaded */}
      {!loading && !error && projectData && (
        <>
          {/* Checkpoint Floating UI */}
          <CheckpointFloatingUI
            projectData={projectData}
            currentCheckpoint={currentCheckpoint}
            checkpointProgress={checkpointProgress}
            isTestingInProgress={isTestingInProgress}
            onCheckpointChange={handleCheckpointChange}
            canNavigateToCheckpoint={canNavigateToCheckpoint}
          />
          
          {/* File Explorer Sidebar */}
          <ResizableSidebar>
            <FileExplorer
              isCollapsed={fileExplorerCollapsed}
              fileTree={fileTree}
              activeFile={activeFile}
              dirtyFiles={dirtyFiles}
              expandedDirs={expandedDirs}
              onFileSelect={handleSelect}
              onDirectoryToggle={handleDirectoryToggle}
              onFileCreate={handleCreate}
              onFileDelete={handleDelete}
              onFileRename={handleRename}
              isLoading={false}
              showDirtyIndicators={false}
            />
          </ResizableSidebar>

          {/* Draggable Editor/Preview Split */}
          <SplitPane initialLeftWidth={50} minLeftWidth={45} maxLeftWidth={60}>
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  openFiles={openFiles}
                  activeFile={activeFile}
                  onFileSelect={handleSelect}
                  onFileContentChange={handleContentChange}
                  shouldShowTest={false}
                  showDirtyIndicators={false}
                />
              </div>
              <RunControls 
                onRun={handleRun}
                onSubmit={handleSubmit}
                onTest={handleRunTests}
                onPrettify={handlePrettify}
                progress={checkpointProgress}
                onSettings={() => setShowSettings(true)}
                shortcuts={settings.shortcuts}
                showRun={false}
              />
            </div>
            <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <PreviewIframe ref={previewIframeRef} srcDoc={srcDoc} />
              </div>
              <ConsoleOutput
                logs={consoleLogs}
                errors={consoleErrors}
                isVisible={showConsole}
                onToggle={() => setShowConsole(!showConsole)}
                onClear={handleClearConsole}
              />
            </div>
          </SplitPane>
          
          {/* Settings Modal */}
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSave={handleSaveSettings}
          />

          {/* Celebration Modal */}
          <CelebrationModal
            isOpen={showCelebration}
            onClose={() => setShowCelebration(false)}
            projectTitle={projectData.title}
            totalCheckpoints={projectData.checkpoints.length}
          />
        </>
      )}
    </div>
  );
}