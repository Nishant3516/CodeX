import React, { useState } from 'react';
import { ProjectData, Checkpoint, CheckpointProgress } from '@/types/project';

interface CheckpointFloatingUIProps {
  projectData: ProjectData;
  currentCheckpoint: string;
  checkpointProgress: CheckpointProgress[];
  isTestingInProgress: boolean;
  onCheckpointChange: (checkpointId: string) => boolean;
  canNavigateToCheckpoint: (checkpointId: string) => boolean;
}

const CheckpointFloatingUI: React.FC<CheckpointFloatingUIProps> = ({
  projectData,
  currentCheckpoint,
  checkpointProgress,
  isTestingInProgress,
  onCheckpointChange,
  canNavigateToCheckpoint
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const getCurrentCheckpoint = () => {
    return projectData.checkpoints.find(cp => cp.id === currentCheckpoint);
  };

  const getProgressForCheckpoint = (checkpointId: string) => {
    return checkpointProgress.find(cp => cp.checkpointId === checkpointId);
  };

  const calculateOverallProgress = () => {
    const completedCheckpoints = checkpointProgress.filter(cp => cp.completed).length;
    return Math.round((completedCheckpoints / projectData.checkpoints.length) * 100);
  };

  const calculateCheckpointTestProgress = (checkpointId: string) => {
    const progress = getProgressForCheckpoint(checkpointId);
    if (!progress) return 0;
    
    const passedTests = Object.values(progress.testsResults).filter(result => result.passed).length;
    const totalTests = Object.keys(progress.testsResults).length;
    
    if (totalTests === 0) return 0;
    return Math.round((passedTests / totalTests) * 100);
  };

  const handleCheckpointClick = (checkpointId: string) => {
    if (!canNavigateToCheckpoint(checkpointId)) {
      return;
    }
    setShowRequirements(!showRequirements);
    onCheckpointChange(checkpointId);
  };

  const currentCheckpointData = getCurrentCheckpoint();
  const overallProgress = calculateOverallProgress();

  return (
    <>
      {/* Floating Progress Indicator */}
      <div className="fixed top-6 right-6 z-50">
        <div 
          className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 transition-all duration-300 ${
            isExpanded ? 'w-96' : 'w-72'
          }`}
          style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
        >
          {/* Header */}
          <div 
            className="p-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/50 rounded-t-2xl transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[50%] flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">
                      {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1}
                    </span>
                  </div>
                  {/* Progress ring */}
                  <svg className="absolute -top-1 -left-1 w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      className="text-gray-200 dark:text-gray-600"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 30}`}
                      strokeDashoffset={`${2 * Math.PI * 30 * (1 - overallProgress / 100)}`}
                      className="text-green-500 transition-all duration-700 ease-out"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                    {currentCheckpointData?.title || 'Loading...'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Overall Progress: {overallProgress}%
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-gray-400 dark:text-gray-500 text-lg">
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              {/* Current Checkpoint Details */}
              <div className="p-5 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Current Checkpoint
                  </span>
                  <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full font-medium">
                    {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1} of {projectData.checkpoints.length}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {currentCheckpointData?.description}
                </p>
                
           
              </div>

              {/* Checkpoint Navigation */}
              <div className="p-5">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  All Checkpoints
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {projectData.checkpoints.map((checkpoint) => {
                    const progress = getProgressForCheckpoint(checkpoint.id);
                    const testProgress = calculateCheckpointTestProgress(checkpoint.id);
                    const isCompleted = progress?.completed || false;
                    const isCurrent = checkpoint.id === currentCheckpoint;
                    const canNavigate = canNavigateToCheckpoint(checkpoint.id);
                    
                    return (
                      <div
                        key={checkpoint.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          !canNavigate
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                            : isCurrent
                            ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-md'
                            : isCompleted
                            ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => handleCheckpointClick(checkpoint.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                              !canNavigate
                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                                : isCompleted
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                : isCurrent
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}>
                              {!canNavigate ? '🔒' : isCompleted ? '✓' : '🕛'}
                            </div>
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                {checkpoint.title}
                              </h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {checkpoint.tests.length} tests
                                {!canNavigate && ' • Complete previous checkpoint to unlock'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${
                              isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                            }`}>
                              {testProgress}%
                            </div>
                            {canNavigate && testProgress > 0 && (
                              <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${testProgress}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Requirements Panel */}
      {showRequirements && currentCheckpointData && (
        <div className="fixed top-6 right-[26rem] z-40 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                📋 Requirements
              </h3>
              <button
                onClick={() => setShowRequirements(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-5 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 text-base">
              {currentCheckpointData.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
              {currentCheckpointData.description}
            </p>
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-3">
                ✅ Tasks to Complete:
              </h5>
              <ul className="space-y-3">
                {currentCheckpointData.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0 shadow-sm">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {requirement}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckpointFloatingUI;
