import React, { FC, useState } from 'react';

type FileCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (filename: string, isDirectory?: boolean) => void;
};

const FileCreateModal: FC<FileCreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isDirectory, setIsDirectory] = useState(false);
  
  if (!isOpen) return null;

  const handleCreate = () => {
    if (name.trim()) {
      if (!isDirectory) {
        // Validate file extension for files
        const ext = name.split('.').pop()?.toLowerCase();
        const allowedExts = ['html', 'css', 'js', 'txt', 'json', 'md', 'go', 'yml', 'yaml'];
        
        if (!ext || !allowedExts.includes(ext)) {
          alert('⚠️ Only .html, .css, .js, .txt, .json, .md, .go, .yml, .yaml files are allowed');
          return;
        }
      }
      
      onCreate(name.trim(), isDirectory);
      setName('');
      setIsDirectory(false);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {isDirectory ? '� New Folder' : '�📄 New File'}
        </h2>
        
        {/* Type selector */}
        <div className="mb-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="file"
                checked={!isDirectory}
                onChange={() => setIsDirectory(false)}
                className="mr-2"
              />
              📄 File
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="folder"
                checked={isDirectory}
                onChange={() => setIsDirectory(true)}
                className="mr-2"
              />
              📁 Folder
            </label>
          </div>
        </div>
        
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder={isDirectory ? "folder-name" : "filename.ext"}
          autoFocus
        />
        
        {!isDirectory && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Supported extensions: .html, .css, .js, .txt, .json, .md, .go, .yml, .yaml
          </div>
        )}
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileCreateModal;
