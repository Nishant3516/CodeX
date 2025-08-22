"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { 
  File, 
  Play, 
  Square, 
  Settings,
  Save
} from 'lucide-react';

interface CodeEditorProps {
  activeFile: string;
  fileContent: string;
  isRunning: boolean;
  onCodeChange: (value: string) => void;
  onRun: () => void;
  onSave?: () => void;
}

export function CodeEditor({ 
  activeFile, 
  fileContent, 
  isRunning, 
  onCodeChange, 
  onRun,
  onSave 
}: CodeEditorProps) {
  
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconClass = "w-4 h-4 mr-2";
    
    switch (ext) {
      case 'html': return <File className={`${iconClass} text-red-400`} />;
      case 'css': return <File className={`${iconClass} text-blue-400`} />;
      case 'js': return <File className={`${iconClass} text-yellow-400`} />;
      case 'json': return <File className={`${iconClass} text-green-400`} />;
      case 'md': return <File className={`${iconClass} text-gray-400`} />;
      default: return <File className={`${iconClass} text-gray-400`} />;
    }
  };

  const getLanguageFromFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'plaintext';
    }
  };

  return (
    <div className="h-full bg-black flex flex-col">
      {/* Editor Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          {getFileIcon(activeFile.split('/').pop() || '')}
          <span className="text-white font-medium">{activeFile}</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-sm rounded transition-colors"
          >
            {isRunning ? (
              <Square className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {isRunning ? 'Stop' : 'Run'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSave}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <Save className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguageFromFile(activeFile)}
          value={fileContent}
          onChange={(value) => onCodeChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            cursorBlinking: 'blink',
            cursorSmoothCaretAnimation: 'on'
          }}
        />
      </div>
    </div>
  );
}
