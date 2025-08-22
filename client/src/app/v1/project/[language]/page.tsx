"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Components
import { FileExplorer } from '@/components/editor/FileExplorer';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import { TerminalPanel } from '@/components/editor/TerminalPanel';
import ProgressIndicator from '@/components/editor/ProgressIndicator';

// Data
import { mockFiles, extractFileContents } from '@/data/mockData';
import useV1Lab from '@/hooks/useV1Lab';

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
  const language = (params?.language as string) || 'html';
  
  // State management
  const [activeFile, setActiveFile] = useState('src/index.html');
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [isRunning, setIsRunning] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'info', message: 'Welcome to DevArena Editor!', timestamp: new Date() },
    { type: 'success', message: 'Project loaded successfully', timestamp: new Date() }
  ]);

  useV1Lab();

  // Initialize file contents on mount
  useEffect(() => {
    const contents = extractFileContents(mockFiles);
    setFileContents(contents);
  }, []);

  // Event handlers
  const handleFileSelect = (path: string) => {
    setActiveFile(path);
  };

  const handleToggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCodeChange = (value: string) => {
    setFileContents(prev => ({
      ...prev,
      [activeFile]: value
    }));
  };

  const handleRun = () => {
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
  };

  const handleSave = () => {
    setConsoleLogs(prev => [...prev, {
      type: 'success',
      message: `Saved ${activeFile}`,
      timestamp: new Date()
    }]);
  };

  const handleClearConsole = () => {
    setConsoleLogs([]);
  };

  const handleCreateFile = (path: string, type: string) => {
    setConsoleLogs(prev => [...prev, {
      type: 'success',
      message: `Created new ${type} file: ${path}`,
      timestamp: new Date()
    }]);
  };

  const handleCreateFolder = (path: string) => {
    setConsoleLogs(prev => [...prev, {
      type: 'success',
      message: `Created new folder: ${path}`,
      timestamp: new Date()
    }]);
  };

  return (
    <div className="h-screen w-screen bg-dark-950 overflow-hidden relative">
      {/* Progress Indicator */}
      <ProgressIndicator
        progress={mockProgress}
        isVisible={showProgress}
        onClose={() => setShowProgress(false)}
      />

      <PanelGroup direction="horizontal">
        {/* File Explorer Panel */}
        <Panel defaultSize={20} minSize={15} maxSize={30}>
          <FileExplorer
            files={mockFiles}
            activeFile={activeFile}
            expandedFolders={expandedFolders}
            onFileSelect={handleFileSelect}
            onToggleFolder={handleToggleFolder}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

        {/* Code Editor Panel */}
        <Panel defaultSize={50} minSize={30}>
          <CodeEditor
            activeFile={activeFile}
            fileContent={fileContents[activeFile] || ''}
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
                htmlContent={fileContents['src/index.html'] || ''}
                cssContent={fileContents['src/styles.css'] || ''}
                jsContent={fileContents['src/script.js'] || ''}
              />
            </Panel>

            <PanelResizeHandle className="h-1 bg-primary-600/30 hover:bg-primary-600/50 transition-colors" />

            {/* Terminal Panel */}
            <Panel defaultSize={40} minSize={20}>
              <TerminalPanel
                logs={consoleLogs}
                isRunning={isRunning}
                onClear={handleClearConsole}
              />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
