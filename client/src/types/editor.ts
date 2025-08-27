// Core types for the editor
export interface FileSystemItem {
  type: 'file' | 'folder';
  content?: string;
  children?: { [key: string]: FileSystemItem };
}

export interface FileInfo {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  modTime?: string;
}

export interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

export interface Checkpoint {
  id: number;
  name: string;
  completed: boolean;
}

export interface ProgressData {
  current: number;
  total: number;
  checkpoints: Checkpoint[];
}

export interface EditorState {
  activeFile: string;
  fileContents: { [key: string]: string };
  expandedFolders: Set<string>;
  isRunning: boolean;
  showProgress: boolean;
  consoleLogs: LogEntry[];
}

// Component Props Types
export interface FileExplorerProps {
  files: { [key: string]: FileSystemItem };
  activeFile: string;
  expandedFolders: Set<string>;
  onFileSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

export interface CodeEditorProps {
  activeFile: string;
  fileContent: string;
  isRunning: boolean;
  onCodeChange: (value: string) => void;
  onRun: () => void;
  onSave?: () => void;
}

export interface PreviewPanelProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export interface TerminalPanelProps {
  logs: LogEntry[];
  isRunning: boolean;
  onClear: () => void;
}

export interface ProgressIndicatorProps {
  progress: ProgressData;
  isVisible: boolean;
  onClose: () => void;
}

// Language and file type definitions
export type SupportedLanguage = 'html' | 'css' | 'javascript' | 'json' | 'markdown' | 'plaintext';

export interface FileTypeConfig {
  extension: string;
  language: SupportedLanguage;
  icon: string;
  color: string;
}

// Editor configuration types
export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: string;
  minimap: boolean;
  lineNumbers: string;
  theme: string;
}

export interface PanelSizes {
  fileExplorer: { default: number; min: number; max: number };
  codeEditor: { default: number; min: number };
  rightPanel: { default: number; min: number };
  preview: { default: number; min: number };
  terminal: { default: number; min: number };
}
