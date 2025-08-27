'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Move, ChevronRight, Trophy, Target } from 'lucide-react';

interface ProgressData {
  currentStep: number;
  totalSteps: number;
  completedTasks: number;
  totalTasks: number;
  questName: string;
  steps: {
    id: number;
    name: string;
    completed: boolean;
    current: boolean;
  }[];
}

interface ProgressIndicatorProps {
  progress: ProgressData;
  isVisible?: boolean;
  onClose?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  isVisible = true,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const completionPercentage = Math.round((progress.completedTasks / progress.totalTasks) * 100);

  if (!isVisible) return null;

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded) return;
    
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (!rect) return;

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - offsetX;
      const newY = e.clientY - offsetY;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (rect.width || 300);
      const maxY = window.innerHeight - (rect.height || 400);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Collapsed circle view
  const CollapsedView = () => (
    <motion.div
      className="fixed z-50 cursor-pointer"
      style={{ right: position.x, top: position.y }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      onClick={() => setIsExpanded(true)}
    >
      <div className="relative">
        {/* Progress circle */}
        <svg width="60" height="60" className="transform -rotate-90">
          <circle
            cx="30"
            cy="30"
            r="26"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-dark-800"
          />
          <circle
            cx="30"
            cy="30"
            r="26"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${163 * (completionPercentage / 100)} 163`}
            className="text-primary-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-dark-900 rounded-full w-12 h-12 flex items-center justify-center border-2 border-primary-500">
            <span className="text-xs font-bold text-primary-400">
              {completionPercentage}%
            </span>
          </div>
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-primary-500 opacity-20 animate-ping" />
      </div>
    </motion.div>
  );

  // Expanded panel view
  const ExpandedView = () => (
    <motion.div
      ref={dragRef}
      className="fixed z-50 bg-dark-900 border border-dark-700 rounded-lg shadow-2xl"
      style={{ left: position.x, top: position.y }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-dark-700 cursor-move bg-dark-800 rounded-t-lg"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-dark-400" />
          <Trophy className="w-5 h-5 text-primary-500" />
          <span className="font-semibold text-white">{progress.questName}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-dark-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-dark-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Progress overview */}
      <div className="p-4 space-y-4 w-80">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-300">Overall Progress</span>
          <span className="text-sm font-bold text-primary-400">{completionPercentage}%</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-dark-800 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        {/* Tasks summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-dark-400">Tasks Completed</span>
          <span className="text-white font-medium">
            {progress.completedTasks} / {progress.totalTasks}
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-dark-300">
            <Target className="w-4 h-4" />
            Steps
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {progress.steps.map((step) => (
              <motion.div
                key={step.id}
                className={`flex items-center gap-3 p-2 rounded text-sm transition-colors ${
                  step.current
                    ? 'bg-primary-500/20 border border-primary-500/30'
                    : step.completed
                    ? 'bg-dark-800'
                    : 'bg-dark-800/50'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.id * 0.1 }}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    step.completed
                      ? 'bg-primary-500'
                      : step.current
                      ? 'bg-secondary-500 animate-pulse'
                      : 'bg-dark-600'
                  }`}
                />
                <span
                  className={`flex-1 ${
                    step.completed
                      ? 'text-dark-300 line-through'
                      : step.current
                      ? 'text-white font-medium'
                      : 'text-dark-400'
                  }`}
                >
                  {step.name}
                </span>
                {step.current && (
                  <ChevronRight className="w-4 h-4 text-secondary-500" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isExpanded ? <ExpandedView /> : <CollapsedView />}
    </AnimatePresence>
  );
};

export default ProgressIndicator;
