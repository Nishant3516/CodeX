'use client';

import React, { useState } from 'react';
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
import { EllipsisVertical } from 'lucide-react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface FileExplorerProps {
  isCollapsed: boolean;
  fileTree: any;
  activeFile: string | null;
  dirtyFiles: Set<string>;
  expandedDirs: Set<string>;
  onFileSelect: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onFileCreate: (path: string, isDirectory: boolean) => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  isLoading: boolean;
  showDirtyIndicators?: boolean;
}

const FileItem: React.FC<{
  name: string;
  path: string;
  item: any;
  isActive: boolean;
  isDirty: boolean;
  isExpanded: boolean;
  level: number;
  isCollapsed: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onFileCreate: (path: string, isDirectory: boolean) => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  showDirtyIndicators: boolean;
}> = ({
  name,
  path,
  item,
  isActive,
  isDirty,
  isExpanded,
  level,
  isCollapsed,
  onSelect,
  onToggle,
  onFileCreate,
  onFileDelete,
  onFileRename,
  showDirtyIndicators
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(name);
  const isDirectory = item.type === 'folder';
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
  const handleClick = () => {
    if (isDirectory) {
      onToggle(path);
    } else {
      onSelect(path);
    }
  };

  const handleRename = () => {
    if (newName && newName !== name) {
      const newPath = path.replace(name, newName);
      onFileRename(path, newPath);
    }
    setIsRenaming(false);
    setNewName(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(name);
    }
  };

  if (isCollapsed && level === 0) {
    return (
      <div
        className={`w-full p-2 hover:bg-gray-700 cursor-pointer flex items-center justify-center ${
          isActive ? 'bg-blue-600' : ''
        }`}
        onClick={handleClick}
        title={name}
      >
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="w-5 h-5 text-yellow-400" />
          ) : (
            <Folder className="w-5 h-5 text-yellow-400" />
          )
        ) : (
          getFileIcon(name)
        )}
      </div>
    );
  }

  if (isCollapsed && level > 0) {
    return null;
  }

  return (
    <div className="relative group">
      <div
        className={`flex items-center px-2 py-1 hover:bg-gray-700 cursor-pointer text-sm ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        {isDirectory && (
          <ChevronRight 
            className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
        
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 mr-2 text-yellow-400" />
          ) : (
            <Folder className="w-4 h-4 mr-2 text-yellow-400" />
          )
        ) : (
         getFileIcon(name)
        )}

        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="bg-gray-700 text-white px-1 py-0 text-sm flex-1 outline-none border border-blue-500"
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate">
            {name}
            {showDirtyIndicators && isDirty && (
              <FiberManualRecord
                style={{
                  fontSize: 10,
                  color: '#f97316',
                  marginLeft: 6,
                }}
              />
            )}
          </span>
        )}

        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <EllipsisVertical className="w-3 h-3" />
        </button>
      </div>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full z-20 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[120px]">
            <button
              className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-gray-300"
              onClick={() => {
                setIsRenaming(true);
                setShowMenu(false);
              }}
            >
              Rename
            </button>
            {isDirectory && (
              <>
                <button
                  className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-gray-300"
                  onClick={() => {
                    const fileName = prompt('Enter file name:');
                    if (fileName) {
                      onFileCreate(`${path}/${fileName}`, false);
                    }
                    setShowMenu(false);
                  }}
                >
                  New File
                </button>
                <button
                  className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-gray-300"
                  onClick={() => {
                    const folderName = prompt('Enter folder name:');
                    if (folderName) {
                      onFileCreate(`${path}/${folderName}`, true);
                    }
                    setShowMenu(false);
                  }}
                >
                  New Folder
                </button>
              </>
            )}
            <button
              className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-red-400"
              onClick={() => {
                if (confirm(`Delete ${name}?`)) {
                  onFileDelete(path);
                }
                setShowMenu(false);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const renderFileTree = (
  tree: any,
  expandedDirs: Set<string>,
  activeFile: string | null,
  dirtyFiles: Set<string>,
  isCollapsed: boolean,
  onFileSelect: (path: string) => void,
  onDirectoryToggle: (path: string) => void,
  onFileCreate: (path: string, isDirectory: boolean) => void,
  onFileDelete: (path: string) => void,
  onFileRename: (oldPath: string, newPath: string) => void,
  level = 0,
  parentPath = '',
  showDirtyIndicators = true
): React.ReactNode => {
  // Sort entries: directories first, then files, both alphabetically
  const entries = Object.entries(tree).sort(([nameA, itemA]: [string, any], [nameB, itemB]: [string, any]) => {
    const isDirectoryA = itemA.type === 'folder';
    const isDirectoryB = itemB.type === 'folder';
    
    // If both are directories or both are files, sort alphabetically
    if (isDirectoryA === isDirectoryB) {
      return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
    }
    
    // Directories come first
    return isDirectoryA ? -1 : 1;
  });
  
  return entries.map(([name, item]: [string, any]) => {
    const fullPath = item.path || (parentPath ? `${parentPath}/${name}` : name);
    const isDirectory = item.type === 'folder';
    const isExpanded = expandedDirs.has(fullPath);
    const isActive = activeFile === fullPath;
    const isDirty = dirtyFiles.has(fullPath);

    return (
      <div key={fullPath}>
        <FileItem
          name={name}
          path={fullPath}
          item={item}
          isActive={isActive}
          isDirty={isDirty}
          isExpanded={isExpanded}
          level={level}
          isCollapsed={isCollapsed}
          onSelect={onFileSelect}
          onToggle={onDirectoryToggle}
          onFileCreate={onFileCreate}
          onFileDelete={onFileDelete}
          onFileRename={onFileRename}
          showDirtyIndicators={showDirtyIndicators}
        />
        {isDirectory && isExpanded && item.children && (
          <div>
            {renderFileTree(
              item.children,
              expandedDirs,
              activeFile,
              dirtyFiles,
              isCollapsed,
              onFileSelect,
              onDirectoryToggle,
              onFileCreate,
              onFileDelete,
              onFileRename,
              level + 1,
              fullPath,
              showDirtyIndicators
            )}
          </div>
        )}
      </div>
    );
  });
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  isCollapsed,
  fileTree,
  activeFile,
  dirtyFiles,
  expandedDirs,
  onFileSelect,
  onDirectoryToggle,
  onFileCreate,
  onFileDelete,
  onFileRename,
  isLoading,
  showDirtyIndicators = true
}) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="h-full bg-gray-800 border-r border-gray-700 flex items-center justify-center">
        <div className="text-gray-400 text-sm">
          {isCollapsed ? '...' : 'Loading files...'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700 bg-gray-900">
        {!isCollapsed && (
          <>
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
              Explorer
            </span>
            <div className="relative">
              <button
                className="p-1 hover:bg-gray-700 rounded"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
              >
                <PlusIcon className="w-4 h-4 text-gray-400" />
              </button>
              
              {showCreateMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowCreateMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 bg-gray-800 border border-gray-600 rounded shadow-lg py-1 min-w-[120px]">
                    <button
                      className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-gray-300"
                      onClick={() => {
                        const fileName = prompt('Enter file name:');
                        if (fileName) {
                          onFileCreate(fileName, false);
                        }
                        setShowCreateMenu(false);
                      }}
                    >
                      New File
                    </button>
                    <button
                      className="w-full text-left px-3 py-1 hover:bg-gray-700 text-sm text-gray-300"
                      onClick={() => {
                        const folderName = prompt('Enter folder name:');
                        if (folderName) {
                          onFileCreate(folderName, true);
                        }
                        setShowCreateMenu(false);
                      }}
                    >
                      New Folder
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full">
            <Folder className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(fileTree).length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {isCollapsed ? '' : 'No files found'}
          </div>
        ) : (
          renderFileTree(
            fileTree,
            expandedDirs,
            activeFile,
            dirtyFiles,
            isCollapsed,
            onFileSelect,
            onDirectoryToggle,
            onFileCreate,
            onFileDelete,
            onFileRename,
            0,
            '',
            showDirtyIndicators
          )
        )}
      </div>
    </div>
  );
};

export default FileExplorer;