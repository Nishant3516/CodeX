"use client";
import React, { useState, useEffect, useRef } from "react";
import ResizableSidebar from "@/components/ResizableSidebar";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import PreviewIframe from "@/components/PreviewIframe";
import RunControls from "@/components/RunControls";
import Tabs from "@/components/Tabs";
import SplitPane from "@/components/SplitPane";
import ConsoleOutput from "@/components/ConsoleOutput";
import ValidationOutput from "@/components/ValidationOutput";
import CheckpointFloatingUI from "@/components/CheckpointFloatingUI";
import SettingsModal, { SettingsState, defaultSettings } from "@/components/SettingsModal";
import { validateHTML, validateCSS, validateJS, generateLinkSuggestions } from "@/utils/validators";
import { prettifyCode } from "@/utils/prettifier";
import { TestRunner } from "@/utils/testRunner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useProjectStore } from "@/store/projectStore";
import { ProjectData, CheckpointProgress } from "@/types/project";
import todoProjectData from "@/data/todoProject.json";

const defaultFiles = ["index.html", "styles.css", "script.js"];
const defaultContents: Record<string, string> = {
  "index.html": "", // Will be auto-populated by CodeEditor
  "styles.css": "", // Will be auto-populated by CodeEditor  
  "script.js": "", // Will be auto-populated by CodeEditor
};

type Params = {
  params: Promise<{
    projectID: string;
  }>;
};

const getLanguage = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "css":
      return "css";
    case "html":
      return "html";
    default:
      return "plaintext";
  }
};

export default function ProjectPage({ params }: Params) {
  const [projectID, setProjectID] = useState<string>("");
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isIframeReady, setIsIframeReady] = useState<boolean>(false);
  
  // Zustand store
  const {
    projectData,
    currentCheckpoint,
    checkpointProgress,
    files,
    contents,
    activeFile,
    isTestingInProgress,
    initializeProject,
    navigateToCheckpoint,
    canNavigateToCheckpoint,
    updateFileContent,
    setActiveFile,
    addFile,
    setIsTestingInProgress,
    updateCheckpointProgress
  } = useProjectStore();
  
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    params.then(({ projectID }) => setProjectID(projectID));
  }, [params]);

  const handleSelect = (file: string) => setActiveFile(file);

  const handleCreate = (filename: string) => {
    if (!files.includes(filename)) {
      addFile(filename);
      setActiveFile(filename);
    }
  };

  const handleContentChange = (value: string) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Debounce the store update
    debounceTimerRef.current = setTimeout(() => {
      updateFileContent(activeFile, value);
    }, 300); // 300ms debounce for content changes
    
    // Run validation on content change only if auto-validation is enabled
    if (settings.autoValidation) {
      const ext = activeFile.split('.').pop()?.toLowerCase();
      let errors: string[] = [];
      let suggestions: string[] = [];
      
      switch (ext) {
        case 'html':
          errors = validateHTML(value);
          suggestions = generateLinkSuggestions(activeFile, files);
          break;
        case 'css':
          errors = validateCSS(value, settings.cssAutoSemicolon);
          break;
        case 'js':
          errors = validateJS(value);
          break;
      }
      
      setValidationErrors(errors.filter(msg => msg.includes('❌') || msg.includes('⚠️')));
      setValidationSuggestions([...errors.filter(msg => msg.includes('💡') || msg.includes('🎨') || msg.includes('🚀') || msg.includes('📱') || msg.includes('🌐') || msg.includes('📄') || msg.includes('♿') || msg.includes('🧹') || msg.includes('✨') || msg.includes('⚡')), ...suggestions]);
      
      // Auto-show validation panel if there are errors
      if (errors.some(msg => msg.includes('❌') || msg.includes('⚠️'))) {
        setShowValidation(true);
      }
    } else {
      // Clear validation if auto-validation is disabled
      setValidationErrors([]);
      setValidationSuggestions([]);
    }
  };

  const handleRun = () => {
    // Clear previous logs and errors
    setConsoleLogs([]);
    setConsoleErrors([]);
    
    const html = contents["index.html"] || "";
    const css = contents["styles.css"] || "";
    const js = contents["script.js"] || "";
    
    // Validate code and separate validation from runtime errors
    const htmlValidation = validateHTML(html);
    const cssValidation = validateCSS(css, settings.cssAutoSemicolon);
    const jsValidation = validateJS(js);
    
    // Only show actual syntax errors in console, not suggestions
    const consoleCSSErrors = cssValidation.filter(msg => msg.includes('❌') || msg.includes('⚠️'));
    const consoleJSErrors = jsValidation.filter(msg => msg.includes('❌') || msg.includes('⚠️'));
    const consoleHTMLErrors = htmlValidation.filter(msg => msg.includes('❌') || msg.includes('⚠️'));
    
    const runtimeErrors = [...consoleHTMLErrors, ...consoleCSSErrors, ...consoleJSErrors];
    setConsoleErrors(runtimeErrors);
    
    // Update validation panel with all validation messages
    const allValidationErrors = [...htmlValidation, ...cssValidation, ...jsValidation];
    setValidationErrors(allValidationErrors.filter(msg => msg.includes('❌') || msg.includes('⚠️')));
    setValidationSuggestions(allValidationErrors.filter(msg => msg.includes('💡') || msg.includes('🎨') || msg.includes('🚀') || msg.includes('📱') || msg.includes('🌐') || msg.includes('📄') || msg.includes('♿') || msg.includes('🧹') || msg.includes('✨') || msg.includes('⚡')));
    
    // Auto-show validation panel if there are validation issues
    if (allValidationErrors.length > 0) {
      setShowValidation(true);
    }
    
    // Auto-show console only if there are runtime errors
    if (runtimeErrors.length > 0) {
      setShowConsole(true);
    }

    // Create enhanced HTML with console capture
    const enhancedJS = `
      // Capture console logs
      const originalLog = console.log;
      const originalError = console.error;
      const logs = [];
      const errors = [];
      
      console.log = function(...args) {
        logs.push(args.join(' '));
        originalLog.apply(console, args);
        window.parent.postMessage({type: 'console-log', data: args.join(' ')}, '*');
      };
      
      console.error = function(...args) {
        errors.push(args.join(' '));
        originalError.apply(console, args);
        window.parent.postMessage({type: 'console-error', data: args.join(' ')}, '*');
      };
      
      window.onerror = function(msg, url, line, col, error) {
        const errorMsg = \`Error at line \${line}: \${msg}\`;
        errors.push(errorMsg);
        window.parent.postMessage({type: 'console-error', data: errorMsg}, '*');
        return false;
      };
      
      // Notify parent when iframe is ready
      window.addEventListener('load', function() {
        window.parent.postMessage({type: 'iframe-ready'}, '*');
      });
      
      // Listen for test script injection requests
      window.addEventListener('message', function(event) {
        if (event.data.type === 'inject-test-script') {
          try {
            const script = document.createElement('script');
            script.textContent = event.data.script;
            document.head.appendChild(script);
            
            // Clean up the script after execution
            setTimeout(() => {
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
            }, 500);
          } catch (error) {
            window.parent.postMessage({
              type: 'test-result',
              testId: event.data.testId,
              result: { passed: false, message: 'Script injection failed: ' + error.message }
            }, '*');
          }
        }
      });
      
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
    setConsoleLogs(['🚀 Code executed successfully']);
  };

  const handleSubmit = () => {
    // TODO: implement submission logic, e.g., send contents to server
    console.log("Submit project", projectID, contents);
  };

  const handlePrettify = async () => {
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

  const handleClearValidation = () => {
    setValidationErrors([]);
    setValidationSuggestions([]);
  };

  const handleSaveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    localStorage.setItem('editorSettings', JSON.stringify(newSettings));
  };

  // Checkpoint management functions
  const handleCheckpointChange = (checkpointId: number): boolean => {
    if (!projectData || !canNavigateToCheckpoint(checkpointId)) {
      return false;
    }
    
    navigateToCheckpoint(checkpointId);
    setConsoleLogs(prev => [...prev, `📍 Switched to checkpoint: ${projectData.checkpoints.find(cp => cp.id === checkpointId)?.title}`]);
    return true;
  };

  const handleRunTests = async () => {
    if (!projectData) {
      setConsoleErrors(['❌ Cannot run tests: project data not available']);
      return;
    }
    
    const currentCheckpointData = projectData.checkpoints.find(cp => cp.id === currentCheckpoint);
    if (!currentCheckpointData || !previewIframeRef.current) {
      setConsoleErrors(['❌ Cannot run tests: checkpoint or preview not available']);
      return;
    }

    setConsoleLogs(prev => [...prev, '🧪 Running tests...']);
    setIsTestingInProgress(true);
    
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
        `${result.passed ? '✅' : '❌'} Test ${testId}: ${result.message}`
      )
    ]);
    
    if (newProgress.completed) {
      setConsoleLogs(prev => [...prev, `🎉 Checkpoint "${currentCheckpointData.title}" completed!`]);
    }
    
    setIsTestingInProgress(false);
    
    setShowConsole(true);
  };

  // Initialize checkpoint progress on component mount
  useEffect(() => {
    initializeProject(todoProjectData);
  }, [initializeProject]);

  // Update preview whenever files change (debounced)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (files.length > 0 && contents) {
        handleRun();
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [files, contents]);

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
    onToggleValidation: () => setShowValidation(!showValidation),
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
        setConsoleLogs(prev => [...prev, '✅ Preview iframe is ready']);
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
      {/* Checkpoint Floating UI */}
      {projectData && (
        <CheckpointFloatingUI
          projectData={projectData}
          currentCheckpoint={currentCheckpoint}
          checkpointProgress={checkpointProgress}
          isTestingInProgress={isTestingInProgress}
          onCheckpointChange={handleCheckpointChange}
          onRunTests={handleRunTests}
          canNavigateToCheckpoint={canNavigateToCheckpoint}
        />
      )}
      
      {/* File Explorer Sidebar */}
      <ResizableSidebar>
        <FileExplorer
          files={files}
          activeFile={activeFile}
          onSelect={handleSelect}
          onCreate={handleCreate}
        />
      </ResizableSidebar>

      {/* Draggable Editor/Preview Split */}
      <SplitPane initialLeftWidth={50} minLeftWidth={45} maxLeftWidth={60}>
        <div className="flex flex-col h-full overflow-hidden">
          <Tabs files={files} activeFile={activeFile} onSelect={handleSelect} />
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              language={getLanguage(activeFile)}
              value={contents[activeFile] || ""}
              onChange={handleContentChange}
              files={files}
              settings={settings}
            />
          </div>
          <ValidationOutput
            errors={validationErrors}
            suggestions={validationSuggestions}
            isVisible={showValidation}
            onToggle={() => setShowValidation(!showValidation)}
            onClear={handleClearValidation}
          />
          <RunControls 
            onRun={handleRun} 
            onSubmit={handleSubmit}
            onPrettify={handlePrettify}
            onSettings={() => setShowSettings(true)}
            shortcuts={settings.shortcuts}
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
    </div>
  );
}
