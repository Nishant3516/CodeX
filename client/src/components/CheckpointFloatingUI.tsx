import React, { useState, useRef } from 'react';
import { ProjectData, Checkpoint, CheckpointProgress } from '@/types/project';

interface CheckpointFloatingUIProps {
  projectData: ProjectData;
  currentCheckpoint: string;
  checkpointProgress: CheckpointProgress[];
  isTestingInProgress: boolean;
  onCheckpointChange: (checkpointId: string) => boolean;
  canNavigateToCheckpoint: (checkpointId: string) => boolean;
}

type CollapseLevel = 1 | 2 | 3 | 4;

const CheckpointFloatingUI: React.FC<CheckpointFloatingUIProps> = ({
  projectData,
  currentCheckpoint,
  checkpointProgress,
  isTestingInProgress,
  onCheckpointChange,
  canNavigateToCheckpoint
}) => {
  const [collapseLevel, setCollapseLevel] = useState<CollapseLevel>(2);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showCheckpointRequirements, setShowCheckpointRequirements] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 24 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startX: 0, startY: 0 });

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y,
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within bounds
    const maxX = window.innerWidth - 300;
    const maxY = window.innerHeight - 200;
    
    setPosition({
      x: Math.max(16, Math.min(newX, maxX)),
      y: Math.max(16, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Check if it was a click (minimal movement from start position)
    const deltaX = Math.abs(e.clientX - dragStart.startX);
    const deltaY = Math.abs(e.clientY - dragStart.startY);
    
    // Only allow expansion for level 1, other levels use minimize button
    if (deltaX < 3 && deltaY < 3 && collapseLevel === 1) {
      setCollapseLevel(2);
    }
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapseLevel(1);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (collapseLevel === 2) {
      setCollapseLevel(3);
    } else if (collapseLevel === 3) {
      setCollapseLevel(4);
    }
  };

  // Add/remove event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, position]);

  const currentCheckpointData = getCurrentCheckpoint();
  const overallProgress = calculateOverallProgress();

  return (
    <>
      {/* Main Floating Component */}
      <div
        className={`fixed z-50 transition-all duration-300 ease-out bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 ${
          collapseLevel === 1 ? 'w-16 h-16 cursor-pointer' :
          collapseLevel === 2 ? 'w-72 h-20 cursor-grab' :
          collapseLevel === 3 ? 'w-96 h-96 cursor-grab' :
          'w-[800px] h-[500px] cursor-grab'
        }`}
        style={{
          left: position.x,
          top: position.y,
          boxShadow: isDragging
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.5)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: isDragging ? 'none' : 'all 0.3s ease-out, transform 0.2s ease-out'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Level 1: Minimal Circle */}
        {collapseLevel === 1 && (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 relative cursor-pointer group">
            {/* Checkpoint number */}
            <div className="text-white font-bold text-xl group-hover:scale-110 transition-transform duration-200">
              {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1}
            </div>
            
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 42 42">
              {/* Background ring */}
              <circle
                cx="21"
                cy="21"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              {/* Progress ring */}
              <circle
                cx="21"
                cy="21"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="2"
                strokeDasharray={`${(overallProgress / 100) * 113.1} 113.1`}
                className="transition-all duration-500"
              />
            </svg>
            
            {/* Status indicator dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${
                overallProgress === 100 ? 'bg-green-500' :
                overallProgress > 0 ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}></div>
            </div>

            {/* Expand hint - shows on hover */}
            <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110">
              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>

            {/* Subtle pulse animation hint */}
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-20"></div>
          </div>
        )}

        {/* Level 2: Project Info */}
        {collapseLevel === 2 && (
          <div className="p-4 bg-white/95 dark:bg-gray-900/95 relative group hover:bg-white dark:hover:bg-gray-800 transition-all duration-200">
            {/* Minimize button */}
            <button
              onClick={handleMinimize}
              className="absolute top-2 right-2 w-7 h-7 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
              title="Minimize"
            >
              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            {/* Subtle visual cues */}
            <div className="absolute top-2 right-11 flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" style={{animationDelay: '0.2s'}}></div>
            </div>
            
            {/* Double-click hint */}
            <div className="absolute bottom-1 right-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none">
              Click to expand
            </div>
            
            <div className="flex items-center space-x-3 cursor-pointer" onClick={handleExpand}>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-base">
                    {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1}
                  </span>
                </div>
                {/* Progress ring */}
                <svg className="absolute -top-1 -left-1 w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="26"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    className="text-gray-200 dark:text-gray-600"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="26"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - overallProgress / 100)}`}
                    className="text-green-500 transition-all duration-700 ease-out"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {projectData.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Checkpoint {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1} • {overallProgress}% Complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Level 3: Full Expanded View */}
        {collapseLevel === 3 && (
          <div className="bg-white/95 dark:bg-gray-900/95 relative group hover:bg-white dark:hover:bg-gray-800 transition-all duration-200">
            {/* Minimize button */}
            <button
              onClick={handleMinimize}
              className="absolute top-2 right-2 w-7 h-7 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm z-10"
              title="Minimize"
            >
              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            {/* Subtle visual cues */}
            <div className="absolute top-2 right-11 flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            
            {/* Expand hint */}
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none">
              Click for requirements
            </div>
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer" onClick={handleExpand}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">
                        {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1}
                      </span>
                    </div>
                    {/* Progress ring */}
                    <svg className="absolute -top-1 -left-1 w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-gray-200 dark:text-gray-600"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - overallProgress / 100)}`}
                        className="text-green-500 transition-all duration-700 ease-out"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {projectData.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {overallProgress}% Complete
                    </p>
                  </div>
                </div>
              
              </div>
            </div>

            {/* Current Checkpoint */}
            <div className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Current Checkpoint
                </span>
                <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full font-medium">
                  {projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint) + 1} of {projectData.checkpoints.length}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                {currentCheckpointData?.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {currentCheckpointData?.description}
              </p>
            </div>

            {/* Checkpoint List */}
            <div className="p-4 max-h-64 overflow-y-auto">
              <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                All Checkpoints
              </h5>
              <div className="space-y-2">
                {projectData.checkpoints.map((checkpoint) => {
                  const progress = getProgressForCheckpoint(checkpoint.id);
                  const testProgress = calculateCheckpointTestProgress(checkpoint.id);
                  const isCompleted = progress?.completed || false;
                  const isCurrent = checkpoint.id === currentCheckpoint;
                  const canNavigate = canNavigateToCheckpoint(checkpoint.id);

                  return (
                    <div
                      key={checkpoint.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        !canNavigate
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                          : isCurrent
                          ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-sm'
                          : isCompleted
                          ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckpointClick(checkpoint.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
                            !canNavigate
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500'
                              : isCompleted
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm'
                              : isCurrent
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                            {!canNavigate ? '🔒' : isCompleted ? '✓' : '○'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h6 className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {checkpoint.title}
                            </h6>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {checkpoint.tests.length} tests
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-semibold ${
                            isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                          }`}>
                            {testProgress}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Level 4: Checkpoint Requirements View */}
        {collapseLevel === 4 && (
          <div className="w-full h-full p-6 overflow-hidden relative group">
            {/* Minimize button */}
            <button
              onClick={handleMinimize}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-md z-20"
              title="Minimize"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <div className="flex h-full gap-6">
              {/* Left Panel - Checkpoint Navigation */}
              <div className="w-1/3 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Checkpoints</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Progress: {overallProgress}% ({checkpointProgress.filter(cp => cp.completed).length}/{projectData.checkpoints.length})
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {projectData.checkpoints.map((checkpoint, index) => {
                    const progress = getProgressForCheckpoint(checkpoint.id);
                    const testProgress = calculateCheckpointTestProgress(checkpoint.id);
                    const isActive = checkpoint.id === currentCheckpoint;
                    const isCompleted = progress?.completed || false;
                    
                    return (
                      <div
                        key={checkpoint.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isActive 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                            : isCompleted
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                            : canNavigateToCheckpoint(checkpoint.id)
                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canNavigateToCheckpoint(checkpoint.id)) {
                            onCheckpointChange(checkpoint.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-800 dark:text-white">
                            {index + 1}. {checkpoint.title}
                          </span>
                          {isCompleted && (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Tests: {testProgress}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Right Panel - Requirements */}
              <div className="w-2/3 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                    {currentCheckpointData?.title}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Checkpoint Requirements
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {currentCheckpointData && (
                    <div className="space-y-4">
                      {/* Description */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-2">Description</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {currentCheckpointData.description}
                        </p>
                      </div>
                      
                      {/* Requirements */}
                      {currentCheckpointData.requirements && currentCheckpointData.requirements.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <h4 className="font-medium text-gray-800 dark:text-white mb-3">Requirements</h4>
                          <ul className="space-y-2">
                            {currentCheckpointData.requirements.map((req, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700 dark:text-gray-300">{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Test Results */}
                      {getProgressForCheckpoint(currentCheckpoint) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                          <h4 className="font-medium text-gray-800 dark:text-white mb-3">Test Results</h4>
                          <div className="space-y-2">
                            {Object.entries(getProgressForCheckpoint(currentCheckpoint)?.testsResults || {}).map(([testName, result]) => (
                              <div key={testName} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{testName}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  result.passed 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {result.passed ? 'Passed' : 'Failed'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requirements Panel */}
      {showRequirements && currentCheckpointData && (
        <div
          className="fixed z-40 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 transition-all duration-300"
          style={{
            left: Math.max(16, position.x - 320 - 16),
            top: position.y,
            maxHeight: '80vh',
            overflow: 'hidden'
          }}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                📋 Requirements
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRequirements(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">
              {currentCheckpointData.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {currentCheckpointData.description}
            </p>
            <div className="space-y-2">
              <h5 className="font-semibold text-gray-700 dark:text-gray-300 text-xs mb-2">
                ✅ Tasks to Complete:
              </h5>
              <ul className="space-y-2">
                {currentCheckpointData.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0 shadow-sm">
                      {index + 1}
                    </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
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
