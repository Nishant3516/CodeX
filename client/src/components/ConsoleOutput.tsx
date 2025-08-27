import React, { FC, useState } from 'react';

type ConsoleOutputProps = {
  logs: string[];
  errors: string[];
  isVisible: boolean;
  onToggle: () => void;
  onClear: () => void;
};

const ConsoleOutput: FC<ConsoleOutputProps> = ({ logs, errors, isVisible, onToggle, onClear }) => {
  const [height, setHeight] = useState(192); // 192px = h-48
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const newHeight = Math.max(120, Math.min(400, height - e.movementY));
      setHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  if (!isVisible) {
    return (
      <div className="h-8 bg-gray-800 dark:bg-gray-900 border-t border-gray-600 flex items-center px-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
        >
          ▶ Console ({logs.length + errors.length})
        </button>
      </div>
    );
  }

  return (
    <div 
      className="bg-gray-900 border-t border-gray-600 flex flex-col relative"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500 transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      <div className="h-8 bg-gray-800 flex items-center justify-between px-3 border-b border-gray-600">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-gray-300 hover:text-white text-sm"
        >
          ▼ Console
        </button>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            {errors.length > 0 && (
              <span className="text-red-400">🔴 {errors.length} errors</span>
            )}
            {logs.length > 0 && (
              <span className="text-blue-400">📋 {logs.length} logs</span>
            )}
          </div>
          <button
            onClick={onClear}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition-colors"
            title="Clear console"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-sm">
        {errors.map((error, i) => (
          <div key={`error-${i}`} className="text-red-400 mb-1">
            🔴 {error}
          </div>
        ))}
        {logs.map((log, i) => (
          <div key={`log-${i}`} className="text-gray-300 mb-1">
            📋 {log}
          </div>
        ))}
        {logs.length === 0 && errors.length === 0 && (
          <div className="text-gray-500 italic">No output</div>
        )}
      </div>
    </div>
  );
};

export default ConsoleOutput;