import React, { FC, useState } from 'react';
import FileCreateModal from './FileCreateModal';

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return '🌐';
    case 'css': return '🎨';
    case 'js': return '⚡';
    case 'txt': return '📝';
    default: return '📄';
  }
};

type FileExplorerProps = {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
  onCreate: (file: string) => void;
};

const FileExplorer: FC<FileExplorerProps> = ({ files, activeFile, onSelect, onCreate }) => {
  // file creation modal
  const [isOpen, setIsOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreate = () => setIsModalOpen(true);
  const handleModalCreate = (filename: string) => {
    // Validate file extension
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExts = ['html', 'css', 'js', 'txt'];
    
    if (!ext || !allowedExts.includes(ext)) {
      alert('⚠️ Only .html, .css, .js, and .txt files are allowed');
      return;
    }
    
    onCreate(filename);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div
        className="px-3 py-2 border-b border-gray-400 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-1 text-sm font-semibold">
          {isOpen ? '▼' : '►'} Files
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleCreate(); }}
          className="text-blue-600 dark:text-blue-400 hover:text-opacity-80"
          title="New file"
        >
          ➕
        </button>
      </div>
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {files.map((file) => (
              <li key={file}>
                <button
                  onClick={() => onSelect(file)}
                  className={`w-full text-left flex items-center gap-1 px-2 py-1 rounded ${
                    file === activeFile
                      ? 'bg-blue-600 text-white font-medium'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {getFileIcon(file)} {file}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FileCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleModalCreate}
      />
    </div>
  );
}

export default FileExplorer;