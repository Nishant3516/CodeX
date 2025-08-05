import React, { FC } from 'react';

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

type TabsProps = {
  files: string[];
  activeFile: string;
  onSelect: (file: string) => void;
};

const Tabs: FC<TabsProps> = ({ files, activeFile, onSelect }) => (
  <div className="flex bg-[#2d2d30] text-gray-300 text-sm h-9 border-b border-[#3c3c3c] overflow-x-auto">
    {files.map((file) => (
      <button
        key={file}
        onClick={() => onSelect(file)}
        className={`flex items-center gap-2 px-4 h-full whitespace-nowrap border-r border-[#3c3c3c] hover:bg-[#37373d] transition-colors ${
          file === activeFile
            ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500'
            : ''
        }`}
      >
        <span>{getFileIcon(file)}</span>
        <span>{file}</span>
      </button>
    ))}
  </div>
);

export default Tabs;
