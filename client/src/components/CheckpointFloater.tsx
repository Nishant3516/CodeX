import React, { FC, useState } from 'react';
import { Checkpoint, CheckpointProgress } from '@/types/project';

interface CheckpointFloaterProps {
  checkpoints: Checkpoint[];
  currentCheckpoint: number;
  progress: CheckpointProgress[];
  onCheckpointChange: (checkpointId: number) => void;
  onToggleRequirements: () => void;
}

const CheckpointFloater: FC<CheckpointFloaterProps> = ({
  checkpoints,
  currentCheckpoint,
  progress,
  onCheckpointChange,
  onToggleRequirements
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const currentProgress = progress.find(p => p.checkpointId === currentCheckpoint);
  const currentCheckpointData = checkpoints.find(c => c.id === currentCheckpoint);
  const completedCheckpoints = progress.filter(p => p.completed).length;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const getProgressPercentage = () => {
    if (!currentProgress || !currentCheckpointData) return 0;
    const totalTests = currentCheckpointData.tests.length;
    const passedTests = Object.values(currentProgress.testsResults).filter(result => result.passed).length;
    return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  };

  const getTestsCompletedText = () => {
    if (!currentProgress || !currentCheckpointData) return '0/0 tests';
    const totalTests = currentCheckpointData.tests.length;
    const passedTests = Object.values(currentProgress.testsResults).filter(result => result.passed).length;
    return `${passedTests}/${totalTests} tests`;
  };

  const getCheckpointStatus = (checkpointId: number) => {
    const prog = progress.find(p => p.checkpointId === checkpointId);
    const checkpointData = checkpoints.find(c => c.id === checkpointId);
    
    if (!prog || !checkpointData) return 'not-started';
    if (prog.completed) return 'completed';
    
    const passedTests = Object.values(prog.testsResults).filter(result => result.passed).length;
    if (passedTests > 0) return 'in-progress';
    
    return 'not-started';
  };

  return (
    <div
      className={`fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-64'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold text-sm">
            Checkpoint {currentCheckpoint}/{checkpoints.length}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          {isExpanded ? '📌' : '📋'}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
          <span>Overall Progress</span>
          <span>{completedCheckpoints}/{checkpoints.length}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCheckpoints / checkpoints.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Current Checkpoint Info */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
          {currentCheckpointData?.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              getCheckpointStatus(currentCheckpoint) === 'completed' ? 'bg-green-500' :
              getCheckpointStatus(currentCheckpoint) === 'in-progress' ? 'bg-yellow-500' :
              'bg-gray-300'
            }`}></div>
            <span>{getProgressPercentage()}% Complete</span>
          </div>
          {currentProgress && (
            <span>
              {getTestsCompletedText()}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 space-y-2">
        <button
          onClick={onToggleRequirements}
          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          📋 View Requirements
        </button>
        
        {isExpanded && (
          <div className="space-y-2 mt-3">
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Jump to Checkpoint
            </h5>
            <div className="grid grid-cols-2 gap-1">
              {checkpoints.map((checkpoint) => (
                <button
                  key={checkpoint.id}
                  onClick={() => onCheckpointChange(checkpoint.id)}
                  className={`p-2 rounded text-xs font-medium transition-colors ${
                    checkpoint.id === currentCheckpoint
                      ? 'bg-blue-500 text-white'
                      : getCheckpointStatus(checkpoint.id) === 'completed'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : getCheckpointStatus(checkpoint.id) === 'in-progress'
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{checkpoint.id}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      getCheckpointStatus(checkpoint.id) === 'completed' ? 'bg-green-500' :
                      getCheckpointStatus(checkpoint.id) === 'in-progress' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="text-[10px] mt-1 truncate">
                    {checkpoint.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mini Navigation */}
      {!isExpanded && (
        <div className="px-3 pb-3">
          <div className="flex justify-between items-center">
            <button
              onClick={() => onCheckpointChange(Math.max(1, currentCheckpoint - 1))}
              disabled={currentCheckpoint === 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬅️
            </button>
            <span className="text-xs text-gray-500">
              {currentCheckpoint} of {checkpoints.length}
            </span>
            <button
              onClick={() => onCheckpointChange(Math.min(checkpoints.length, currentCheckpoint + 1))}
              disabled={currentCheckpoint === checkpoints.length}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➡️
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckpointFloater;
