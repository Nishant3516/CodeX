'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon,
  PlayIcon,
  CheckIcon,
  DocumentArrowDownIcon,
  DocumentIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Folder,
  FolderOpen,
  InsertDriveFile,
  Description,
  DataObject,
  FiberManualRecord ,
  Code,
  IntegrationInstructions,
  Javascript,
  ChevronRight,
  Css,
  Html,
} from '@mui/icons-material';

// Import CodeMirror extensions
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { html, htmlCompletionSource, htmlLanguage } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { tokyoNight } from "../../constants/TokyoNight";
import { linter, lintGutter } from "@codemirror/lint";
import { autocompletion } from "@codemirror/autocomplete";

// Import editor styles
import "../../styles/editor.css";

interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
}

interface CodeEditorProps {
  // Real file operations (experimental mode)
  openFiles?: OpenFile[];
  activeFile?: string | null;
  onFileSelect?: (path: string) => void;
  onFileClose?: (path: string) => void;
  onFileContentChange?: (path: string, content: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  onSave?: (path?: string) => void;
  isRunning?: boolean;
  isRunningTests?: boolean;
  currentTestingCheckpoint?: string | null;
  language?: string;
  className?: string;
  loadingFile?: string | null;
  shouldShowTest?: boolean;
  showDirtyIndicators?: boolean;
  // Legacy props (for backward compatibility)
  activeFileName?: string;
  fileContent?: string;
  onCodeChange?: (value: string) => void;
  isLoading?: boolean;
}

export default function CodeEditor({
  // Experimental mode props
  openFiles = [],
  activeFile,
  onFileSelect,
  onFileClose,
  onFileContentChange,
  onRun,
  onSubmit,
  onSave,
  isRunning = false,
  isRunningTests = false,
  currentTestingCheckpoint,
  shouldShowTest = true, 
  showDirtyIndicators = true,
  language = 'javascript',
  className = '',
  loadingFile = null,
  
  // Legacy props
  activeFileName,
  fileContent,
  onCodeChange,
  isLoading = false
}: CodeEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Determine if we're in experimental mode
  const isExperimental = openFiles.length > 0 || activeFile !== undefined;
  
  // Get current file data
  const currentFile = isExperimental 
    ? openFiles.find(f => f.path === activeFile)
    : null;
  
  const displayFileName = isExperimental 
    ? (activeFile?.split('/').pop() || '')
    : (activeFileName || '');
  
  const content = isExperimental 
    ? (currentFile?.content || '')
    : (fileContent || '');

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    const iconStyle = { fontSize: 18, marginRight: 8 };

    switch (ext) {
      case 'js':
        return <Javascript style={{ ...iconStyle, color: '#f7df1e' }} />;

      case 'jsx':
        return <IntegrationInstructions style={{ ...iconStyle, color: '#61dafb' }} />;

      case 'ts':
        return <Code style={{ ...iconStyle, color: '#3178c6' }} />;

      case 'tsx':
        return <IntegrationInstructions style={{ ...iconStyle, color: '#61dafb' }} />;

      case 'json':
        return <DataObject style={{ ...iconStyle, color: '#fbc02d' }} />;

      case 'md':
        return <Description style={{ ...iconStyle, color: '#90a4ae' }} />;

      case 'html':
        return <Html style={{ ...iconStyle, color: '#e34f26' }} />;

      case 'css':
        return <Css style={{ ...iconStyle, color: '#1572b6' }} />;

      default:
        return <InsertDriveFile style={{ ...iconStyle, color: '#9e9e9e' }} />;
    }
  };

  const getLanguageConfig = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "jsx":
        return {
          extension: [
            javascript({ jsx: true }),
            html(),
            javascriptLanguage.data.of({
              autocomplete: htmlCompletionSource,
            }),
            htmlLanguage.data.of({
              autocompletion: htmlCompletionSource,
            }),
          ],
        };
      case "ts":
      case "tsx":
        return {
          extension: [
            javascript({ jsx: true, typescript: true }),
            html(),
            javascriptLanguage.data.of({
              autocomplete: htmlCompletionSource,
            }),
          ],
        };
      case "html":
        return { extension: [html()] };
      case "css":
        return { extension: [css()] };
      case "json":
        return { extension: [json()] };
      case "md":
        return { extension: [markdown()] };
      default:
        return { extension: [] };
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handleContentChange = useCallback((value: string) => {
    if (isExperimental && activeFile) {
      onFileContentChange?.(activeFile, value);
    } else if (onCodeChange) {
      onCodeChange(value);
    }
  }, [isExperimental, activeFile, onFileContentChange, onCodeChange]);

  const handleSave = useCallback(() => {
    if (isExperimental && onSave) {
      onSave(activeFile || undefined);
    } else if (onSave) {
      onSave();
    }
  }, [isExperimental, activeFile, onSave]);

  const { extension } = getLanguageConfig(displayFileName);
  const extensions = useMemo(() => [
    ...extension,
    keymap.of([
      indentWithTab,
      {
        key: 'Ctrl-s',
        mac: 'Cmd-s',
        run: () => {
          handleSave();
          return true;
        }
      }
    ]),
    lintGutter(),
    autocompletion(),
  ], [extension, handleSave]);

  // Experimental mode with tabs
  if (isExperimental) {
    return (
      <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
        {/* Tab Bar */}
        <div className="flex items-center bg-gray-800 border-b border-gray-700 min-h-[42px]">
          <div className="flex flex-1 overflow-x-auto">
            {openFiles.map((file) => (
              <div
                key={file.path}
                className={`flex items-center px-3 py-2 text-sm border-r border-gray-700 cursor-pointer hover:bg-gray-700 ${
                  activeFile === file.path ? 'bg-gray-900 text-white' : 'text-gray-300'
                }`}
                onClick={() => onFileSelect?.(file.path)}
              >
                {getFileIcon(file.name)}
                <span className="truncate max-w-[120px]">
                  {file.name}
                </span>
                {loadingFile === file.path && (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent ml-2 flex-shrink-0" />
                )}
                {showDirtyIndicators && file.isDirty && loadingFile !== file.path && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full ml-2 flex-shrink-0" />
                )}
                <button
                  className="ml-2 hover:bg-gray-600 rounded p-1 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClose?.(file.path);
                  }}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center px-2 space-x-2">
            {onRun  &&  (
              <button
                onClick={onRun}
                disabled={isRunning}
                className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4 mr-1" />
                    Run
                  </>
                )}
              </button>
            )}
            {onSubmit && shouldShowTest && (
              <button
                onClick={onSubmit}
                disabled={isRunningTests}
                className={`flex items-center px-3 py-1 rounded text-sm ${
                  isRunningTests 
                    ? 'bg-blue-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunningTests ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {currentTestingCheckpoint ? `Testing Checkpoint ${currentTestingCheckpoint}...` : 'Running Tests...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Test
                  </>
                )}
              </button>
            )}
            {onSave && (
              <button
                onClick={() => onSave(activeFile || undefined)}
                className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                Save
              </button>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 relative overflow-hidden">
          {openFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <DocumentIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No files open</p>
                <p className="text-sm mt-2">Select a file from the explorer to start coding</p>
              </div>
            </div>
          ) : loadingFile === activeFile ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4" />
                <p>Loading file content...</p>
                <p className="text-sm mt-2">{activeFile}</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <CodeMirror
                ref={editorRef}
                value={content}
                height="100%"
                theme={tokyoNight}
                extensions={extensions}
                onChange={handleContentChange}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  searchKeymap: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                }}
                style={{ 
                  fontSize: 14, 
                  height: '100%',
                  fontFamily: 'JetBrains Mono, Monaco, Menlo, "Ubuntu Mono", monospace'
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Legacy mode (single file)
  return (
    <div className="h-full bg-black flex flex-col" onContextMenu={handleContextMenu} onClick={() => setContextMenu(null)}>
      {/* Editor Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          {getFileIcon(displayFileName)}
          <span className="text-white font-medium">{displayFileName}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRun  &&  (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-1" />
                  Run
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-y-auto h-full relative">
        <CodeMirror
          ref={editorRef}
          value={content}
          height="100%"
          theme={tokyoNight}
          extensions={extensions}
          onChange={handleContentChange}
          style={{ fontSize: 14, height: '100%' }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center text-white">
              <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm">Loading file content...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Custom Context Menu */}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <ul>
            <li onClick={handleSave}>Save</li>
          </ul>
        </div>
      )}
    </div>
  );
}