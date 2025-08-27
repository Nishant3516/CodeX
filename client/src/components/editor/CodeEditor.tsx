"use client";
import React, { useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { File, Play, Square, Settings, Save } from "lucide-react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";

// Import CodeMirror extensions
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import { html, htmlCompletionSource, htmlLanguage } from "@codemirror/lang-html";
import { css} from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import {  tokyoNight} from "../../constants/TokyoNight";
import { linter, lintGutter } from "@codemirror/lint";
import { autocompletion } from "@codemirror/autocomplete";


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
  onSave,
}: CodeEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const iconClass = "w-4 h-4 mr-2";

    switch (ext) {
      case "html": return <File className={`${iconClass} text-red-400`} />;
      case "css": return <File className={`${iconClass} text-blue-400`} />;
      case "js": case "jsx": return <File className={`${iconClass} text-yellow-400`} />;
      case "ts": case "tsx": return <File className={`${iconClass} text-blue-300`} />;
      case "json": return <File className={`${iconClass} text-green-400`} />;
      case "md": return <File className={`${iconClass} text-gray-400`} />;
      default: return <File className={`${iconClass} text-gray-400`} />;
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
            // This is the magic line!
            javascriptLanguage.data.of({
              autocomplete: htmlCompletionSource,
            }),
            htmlLanguage.data.of({
              autocompletion: htmlCompletionSource,
              
            }),
          ],
          parser: "babel",
        };
      // ... other cases remain the same
      case "ts":
      case "tsx":
        return {
          extension: [
            javascript({ jsx: true, typescript: true }),
            html(),
            // You can add this for TSX files as well
            javascriptLanguage.data.of({
              autocomplete: htmlCompletionSource,
            }),
            
          ],
          parser: "typescript",
        };
      case "html":
        return { extension: [html()], parser: "html" };
      case "css":
        return { extension: [css()], parser: "css" };
      case "json":
        return { extension: [json()], parser: "json" };
      case "md":
        return { extension: [markdown()], parser: "markdown" };
      default:
        return { extension: [], parser: "babel" }; // Default to babel for unknown types
    }
  };
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };
  
  const { extension } = getLanguageConfig(activeFile);
  const extensions = useMemo(() => [
    ...extension,
    keymap.of([indentWithTab]),
    lintGutter(),
    autocompletion(),
  // Do not set language data 'autocomplete' to a non-function value;
  // autocompletion() will use language-provided completion sources when available.
  ], [extension]);

  return (
    <div className="h-full bg-black flex flex-col" onContextMenu={handleContextMenu} onClick={() => setContextMenu(null)}>
      {/* Editor Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          {getFileIcon(activeFile.split("/").pop() || "")}
          <span className="text-white font-medium">{activeFile}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Action buttons */}
        </div>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-y-auto h-full">
        <CodeMirror
          ref={editorRef}
          value={fileContent}
          height="100%"
          theme={tokyoNight}
          extensions={extensions}
          onChange={onCodeChange}
          style={{ fontSize: 14, height: '100%' }}
        />
      </div>
      
      {/* Custom Context Menu */}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <ul>
           
          </ul>
        </div>
      )}
    </div>
  );
}