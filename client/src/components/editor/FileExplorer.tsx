import React, { FC, useState, useCallback, useRef } from 'react';

const getFileIcon = (filename: string, isDir: boolean) => {
  if (isDir) return '📁';
  
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return '🌐';
    case 'css': return '🎨';
    case 'js': return '⚡';
    case 'txt': return '📝';
    case 'go': return '🐹';
    case 'json': return '📋';
    case 'md': return '📖';
    case 'yml':
    case 'yaml': return '⚙️';
    default: return '📄';
  }
};

// Sort helper: filter out entries we don't want to render ('.', 'workspace'),
// then directories first, then files; within each group sort by name
const sortEntries = (entries: [string, FileTreeNode][]) => {
  const filtered = entries.filter(([name]) => name !== '.' && name.toLowerCase() !== 'workspace');
  const sorted = [...filtered].sort((a, b) => {
    const aIsDir = a[1].isDir ? 0 : 1;
    const bIsDir = b[1].isDir ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a[0].localeCompare(b[0]);
  });

  // Deduplicate by node.path while preserving order
  const seen = new Set<string>();
  const deduped: [string, FileTreeNode][] = [];
  for (const entry of sorted) {
    const path = entry[1]?.path || entry[0];
    if (!seen.has(path)) {
      seen.add(path);
      deduped.push(entry);
    }
  }
  return deduped;
};

interface FileTreeNode {
  type: 'file' | 'folder';
  children?: Record<string, FileTreeNode>;
  path: string;
  size?: number;
  modTime?: string;
  isDir: boolean;
}

type FileExplorerProps = {
  fileTree: Record<string, FileTreeNode>;
  activeFile: string | null;
  dirtyFiles: Set<string>;
  expandedDirs: Set<string>;
  onFileSelect: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onFileCreate: (path: string, isDir: boolean) => void;
  onFileDelete?: (path: string) => void;
  onFileRename?: (oldPath: string, newPath: string) => void;
};

interface FileItemProps {
  name: string;
  node: FileTreeNode;
  level: number;
  // pass global state so children can compute their own state
  activeFile: string | null;
  dirtyFiles: Set<string>;
  expandedDirs: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
}

const FileItem: FC<FileItemProps> = ({
  name,
  node,
  level,
  activeFile,
  dirtyFiles,
  expandedDirs,
  onSelect,
  onToggle,
  onDelete,
  onRename
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);

  // derive local states from global props
  const isActive = activeFile === node.path;
  const isDirty = dirtyFiles.has(node.path);
  const isExpanded = expandedDirs.has(node.path);

  const handleClick = () => {
    if (node.isDir) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const handleRename = () => {
    if (newName !== name && onRename) {
      const newPath = node.path.replace(new RegExp(`${name}$`), newName);
      onRename(node.path, newPath);
    }
    setIsRenaming(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setNewName(name);
      setIsRenaming(false);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer group ${
          isActive
            ? 'bg-blue-600 text-white font-medium'
            : 'hover:bg-gray-200 dark:hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleClick}
      >
        {node.isDir && (
          <span className="text-xs w-3">
            {isExpanded ? '▼' : '►'}
          </span>
        )}
        <span className="text-sm">
          {getFileIcon(name, node.isDir)}
        </span>
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyPress={handleKeyPress}
            className="bg-white dark:bg-gray-700 text-black dark:text-white px-1 py-0 text-sm rounded"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm flex-1 truncate">
            {name}
            {isDirty && <span className="text-orange-500 ml-1">●</span>}
          </span>
        )}
        
        {/* Action buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="text-xs text-blue-500 hover:text-blue-600"
              title="Rename"
            >
              ✏️
            </button>
          )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // delegate to parent to open confirm modal
                  onDelete(node.path);
                }}
                className="text-xs text-red-500 hover:text-red-600"
                title="Delete"
              >
                🗑️
              </button>
            )}
        </div>
      </div>
      
      {/* Render children if expanded */}
      {node.isDir && isExpanded && node.children && (
        <div>
            {sortEntries(Object.entries(node.children)).map(([childName, childNode]) => (
              <FileItem
                key={`${childNode.path}-${childName}`}
                name={childName}
                node={childNode}
                level={level + 1}
                activeFile={activeFile}
                dirtyFiles={dirtyFiles}
                expandedDirs={expandedDirs}
                onSelect={onSelect}
                onToggle={onToggle}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: FC<FileExplorerProps> = ({
  fileTree,
  activeFile,
  dirtyFiles,
  expandedDirs,
  onFileSelect,
  onDirectoryToggle,
  onFileCreate,
  onFileDelete,
  onFileRename
}) => {
  const [isOpen, setIsOpen] = useState(true);
  // inline create state: path being edited ('' = root)
  const [creatingPath, setCreatingPath] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState('');
  const [creatingIsDir, setCreatingIsDir] = useState(false);
  const cancelingRef = useRef(false);

  // delete confirmation modal state
  const [deletePendingPath, setDeletePendingPath] = useState<string | null>(null);
  const deleteReasonRef = useRef<HTMLTextAreaElement | null>(null);

  const startCreate = useCallback((path: string | null = null, isDir = false) => {
    // use empty string for root path so input renders; null means not creating
    setCreatingPath(path ?? '');
    setCreatingIsDir(isDir);
    setCreatingName('');
  }, []);

  const cancelCreate = useCallback(() => {
  // mark canceling so onBlur avoids confirming
  cancelingRef.current = false;
  setCreatingPath(null);
    setCreatingName('');
    setCreatingIsDir(false);
  }, []);

  const confirmCreate = useCallback(() => {
    if (!creatingName) return;
    const fullPath = creatingPath ? `${creatingPath}/${creatingName}` : creatingName;
    onFileCreate(fullPath, creatingIsDir);
    cancelCreate();
  }, [creatingName, creatingPath, creatingIsDir, onFileCreate, cancelCreate]);

  const requestDelete = useCallback((path: string) => {
    // only set pending path; actual deletion confirmed via modal
    setDeletePendingPath(path);
  }, []);

  const cancelDelete = useCallback(() => setDeletePendingPath(null), []);

  const confirmDelete = useCallback(() => {
    if (!deletePendingPath) return;
    onFileDelete && onFileDelete(deletePendingPath);
    setDeletePendingPath(null);
  }, [deletePendingPath, onFileDelete]);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div
        className="px-3 py-2 border-b border-gray-400 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-1 text-sm font-semibold">
          {isOpen ? '▼' : '►'} Files
        </span>
        <div className="flex gap-1">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCreate('', false);
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-opacity-80 text-xs"
              title="New file"
            >
              📄
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startCreate('', true);
              }}
              className="text-green-600 dark:text-green-400 hover:text-opacity-80 text-xs"
              title="New folder"
            >
              📁
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          {Object.keys(fileTree).length === 0 ? (
            <div className="text-sm text-gray-500 italic p-2">
              No files found. Click ➕ to create a new file.
            </div>
          ) : (
            <div className="space-y-1">
              {sortEntries(Object.entries(fileTree)).map(([name, node]) => (
                <FileItem
                  key={node.path}
                  name={name}
                  node={node}
                  level={0}
                  activeFile={activeFile}
                  dirtyFiles={dirtyFiles}
                  expandedDirs={expandedDirs}
                  onSelect={onFileSelect}
                  onToggle={onDirectoryToggle}
                  onDelete={requestDelete}
                  onRename={onFileRename}
                />
              ))}
              {/* Inline create input at top when requested */}
              {creatingPath !== null && (
                <div className="px-2 py-1 flex items-center gap-2">
                  <input
                    placeholder={creatingIsDir ? 'New folder name' : 'New file name'}
                    value={creatingName}
                    onChange={(e) => setCreatingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmCreate();
                      if (e.key === 'Escape') cancelCreate();
                    }}
                    onBlur={() => {
                      // if the cancel button was clicked, avoid confirming
                      if (cancelingRef.current) {
                        cancelingRef.current = false;
                        return;
                      }
                      // blur acts as confirm if name non-empty
                      if (creatingName) confirmCreate();
                      else cancelCreate();
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border rounded text-sm"
                  />
                  <button onMouseDown={() => { cancelingRef.current = true; }} onClick={cancelCreate} className="text-red-600 text-xs">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Delete confirmation modal */}
      {deletePendingPath && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded shadow max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete</h3>
            <p className="text-sm mb-3">Are you sure you want to delete <strong>{deletePendingPath}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={cancelDelete} className="px-3 py-1 rounded border">Cancel</button>
              <button onClick={confirmDelete} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
