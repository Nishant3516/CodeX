"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ResizableSidebar from "@/components/ResizableSidebar";
import FileExplorer from "@/components/v1/FileExplorer";
import CodeEditor from "@/components/v1/CodeEditor";
import PreviewIframe from "@/components/PreviewIframe";
import SplitPane from "@/components/SplitPane";
import ConsoleOutput from "@/components/ConsoleOutput";

type FileTreeNode =
  | { type: "folder"; path: string; children: Record<string, FileTreeNode> }
  | { type: "file"; path: string };

const BOILERPLATE: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Playground</title>
  </head>
  <body>
    <div id="app">
      <h1>Hello, World!</h1>
      <p>Edit HTML, CSS, and JavaScript.</p>
      <button id="myButton">Click me</button>
    </div>
  </body>
</html>`,
  "styles.css": `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: #f5f5f5;
  color: #222;
}

#app {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

button {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #1d4ed8;
}`,
  "script.js": `console.log("Playground ready");

const button = document.getElementById("myButton");
const heading = document.querySelector("h1");

button?.addEventListener("click", () => {
  heading.textContent = "Button clicked!";
  console.log("Button clicked");
});`
};

const getLanguageFromPath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
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

export default function PlaygroundPage() {
  const [fileContents, setFileContents] = useState<Record<string, string>>(BOILERPLATE);
  const [folderPaths, setFolderPaths] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>("index.html");
  const [openFiles, setOpenFiles] = useState<
    Array<{ path: string; name: string; content: string; isDirty: boolean; language: string }>
  >([
    {
      path: "index.html",
      name: "index.html",
      content: BOILERPLATE["index.html"],
      isDirty: false,
      language: "html",
    },
    {
      path: "styles.css",
      name: "styles.css",
      content: BOILERPLATE["styles.css"],
      isDirty: false,
      language: "css",
    },
    {
      path: "script.js",
      name: "script.js",
      content: BOILERPLATE["script.js"],
      isDirty: false,
      language: "javascript",
    },
  ]);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [fileExplorerCollapsed] = useState(false);
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState<boolean>(false);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const files = useMemo(() => Object.keys(fileContents), [fileContents]);
  const fileTree = useMemo(() => buildFileTree(files, folderPaths), [files, folderPaths]);

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

  const openFile = useCallback(
    (path: string) => {
      setActiveFile(path);
      setOpenFiles((prev) => {
        if (prev.find((f) => f.path === path)) return prev;
        const name = path.split("/").pop() || path;
        const content = fileContents[path] ?? "";
        return [
          ...prev,
          {
            path,
            name,
            content,
            isDirty: dirtyFiles.has(path),
            language: getLanguageFromPath(path),
          },
        ];
      });
    },
    [fileContents, dirtyFiles]
  );

  const handleSelect = (path: string) => {
    openFile(path);
  };

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

    if (fileContents[path]) {
      openFile(path);
      return;
    }

    ensureParentFolders(path);
    setFileContents((prev) => ({ ...prev, [path]: "" }));
    openFile(path);
  };

  const handleDelete = (path: string) => {
    setFileContents((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setDirtyFiles((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    if (activeFile === path) {
      const remaining = files.filter((f) => f !== path);
      setActiveFile(remaining[0] ?? null);
    }
  };

  const handleRename = (oldPath: string, newPath: string) => {
    if (oldPath === newPath) return;
    setFileContents((prev) => {
      const next = { ...prev };
      const value = next[oldPath];
      delete next[oldPath];
      next[newPath] = value ?? "";
      return next;
    });
    setDirtyFiles((prev) => {
      const next = new Set(prev);
      if (next.has(oldPath)) {
        next.delete(oldPath);
        next.add(newPath);
      }
      return next;
    });
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === oldPath
          ? {
              ...f,
              path: newPath,
              name: newPath.split("/").pop() || newPath,
              language: getLanguageFromPath(newPath),
            }
          : f
      )
    );
    if (activeFile === oldPath) {
      setActiveFile(newPath);
    }
    ensureParentFolders(newPath);
  };

  const handleClose = (path: string) => {
    setOpenFiles((prev) => {
      const remaining = prev.filter((f) => f.path !== path);
      if (activeFile === path) {
        setActiveFile(remaining[0]?.path ?? null);
      }
      return remaining;
    });
  };

  const handleContentChange = useCallback(
    (path: string, value: string) => {
      setFileContents((prev) => ({ ...prev, [path]: value }));
      setDirtyFiles((prev) => new Set(prev).add(path));
      setOpenFiles((prev) =>
        prev.map((file) =>
          file.path === path ? { ...file, content: value, isDirty: true } : file
        )
      );
    },
    []
  );

  const handleRun = useCallback(() => {
    // Clear previous logs and errors
    setConsoleLogs([]);
    setConsoleErrors([]);

    const html = fileContents["index.html"] || "";
    const css = fileContents["styles.css"] || "";
    const js = fileContents["script.js"] || "";

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
    setConsoleLogs(['🚀 Code executed successfully']);
  }, [fileContents]);

  const handleClearConsole = () => {
    setConsoleLogs([]);
    setConsoleErrors([]);
  };

  const updatePreview = useCallback(() => {
    const html = fileContents["index.html"] || "";
    const css = fileContents["styles.css"] || "";
    const js = fileContents["script.js"] || "";
    
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
  }, [fileContents]);

  // Update preview whenever the actual code content changes (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (files.length > 0) {
        const html = fileContents["index.html"] || "";
        const css = fileContents["styles.css"] || "";
        const js = fileContents["script.js"] || "";
        
        // Only update if we have actual content to render
        if (html || css || js) {
          updatePreview();
        }
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [fileContents["index.html"], fileContents["styles.css"], fileContents["script.js"], updatePreview, files.length]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console-log') {
        setConsoleLogs(prev => [...prev, event.data.data]);
        setShowConsole(true);
      } else if (event.data.type === 'console-error') {
        setConsoleErrors(prev => [...prev, event.data.data]);
        setShowConsole(true);
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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <SplitPane initialLeftWidth={60} minLeftWidth={45} maxLeftWidth={70}>
        <div className="flex h-full overflow-hidden">
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
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
              <div className="text-sm font-medium text-gray-200">JavaScript Playground</div>
              <button
                onClick={handleRun}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
              >
                ▶ Run
              </button>
            </div>
            <CodeEditor
              openFiles={openFiles}
              activeFile={activeFile}
              onFileSelect={handleSelect}
              onFileClose={handleClose}
              onFileContentChange={handleContentChange}
              shouldShowTest={false}
              showDirtyIndicators={false}
            />
          </div>
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
    </div>
  );
}