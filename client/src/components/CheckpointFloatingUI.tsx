import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProjectData, Checkpoint, CheckpointProgress } from '@/types/project';
import MarkdownRenderer, { useMarkdownDetection } from './MarkdownRenderer';

interface CheckpointFloatingUIProps {
  projectData: ProjectData;
  currentCheckpoint: string;
  checkpointProgress: CheckpointProgress[];
  isTestingInProgress: boolean;
  onCheckpointChange: (checkpointId: string) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 100 });
  const [selectedId, setSelectedId] = useState<string>(currentCheckpoint);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const dragMovedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  const getCurrentCheckpoint = () => {
    return projectData.checkpoints.find(cp => cp.id === currentCheckpoint);
  };

  const getProgressForCheckpoint = (checkpointId: string) => {
    return checkpointProgress.find(cp => cp.checkpointId === checkpointId);
  };

  const calculateOverallProgress = () => {
    const knownIds = new Set<string>(projectData.checkpoints.map(cp => cp.id));
    checkpointProgress.forEach(cp => knownIds.add(cp.checkpointId));

    const completedIds = new Set<string>();
    checkpointProgress.forEach(cp => {
      if (cp.completed) {
        completedIds.add(cp.checkpointId);
      }
    });

    const total = Math.max(knownIds.size, 1);
    const percent = Math.round((completedIds.size / total) * 100);
    return Math.min(Math.max(percent, 0), 100);
  };

  const getCurrentCheckpointIndex = () => {
    return projectData.checkpoints.findIndex(cp => cp.id === currentCheckpoint);
  };

  // Bubble: pointer-based drag with small movement threshold; click to expand
  const onBubblePointerDown = useCallback((e: React.PointerEvent) => {
    if (isExpanded) return;
    const el = bubbleRef.current;
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    el.setPointerCapture(e.pointerId);
    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
    dragMovedRef.current = false;
  }, [isExpanded, position]);

  const onBubblePointerMove = useCallback((e: React.PointerEvent) => {
    if (isExpanded) return;
    if (pointerIdRef.current !== e.pointerId || !startRef.current) return;
    const { startX, startY, offsetX, offsetY } = startRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.hypot(dx, dy);
    if (!dragMovedRef.current && dist > 6) {
      dragMovedRef.current = true;
      setIsDragging(true);
    }
    if (!dragMovedRef.current) return;
    const nextX = Math.max(8, Math.min(e.clientX - offsetX, window.innerWidth - 92));
    const nextY = Math.max(8, Math.min(e.clientY - offsetY, window.innerHeight - 92));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setPosition({ x: nextX, y: nextY }));
  }, [isExpanded]);

  const onBubblePointerUp = useCallback((e: React.PointerEvent) => {
    const el = bubbleRef.current;
    if (pointerIdRef.current !== null && el && el.hasPointerCapture(pointerIdRef.current)) {
      el.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;

    if (!dragMovedRef.current) {
      // treat as click -> expand panel
      setIsExpanded(true);
    } else {
      // snap to nearest horizontal edge
      const w = el?.offsetWidth ?? 80;
      const margin = 12;
      const rightX = Math.max(margin, window.innerWidth - w - margin);
      const snapLeft = margin;
      const snapRight = rightX;
      const snapX = position.x + w / 2 < window.innerWidth / 2 ? snapLeft : snapRight;
      setPosition(prev => ({ x: snapX, y: prev.y }));
    }
    setIsDragging(false);
    startRef.current = null;
    dragMovedRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [position.x]);

  // No drag in expanded state per requirement

  // Avoid text selection while dragging
  useEffect(() => {
    if (isDragging) document.body.style.userSelect = 'none';
    return () => { document.body.style.userSelect = ''; };
  }, [isDragging]);

  // Keep selected details in sync with current checkpoint when it changes
  useEffect(() => {
    setSelectedId(currentCheckpoint);
  }, [currentCheckpoint]);

  // Close panel
  const closeExpanded = () => {
    if (!isDragging) setIsExpanded(false);
  };

  const nextCheckpoint = () => {
    const currentIndex = getCurrentCheckpointIndex();
    if (currentIndex < projectData.checkpoints.length - 1) {
      const nextId = projectData.checkpoints[currentIndex + 1].id;
      if (canNavigateToCheckpoint(nextId)) {
        onCheckpointChange(nextId);
      }
    }
  };

  const prevCheckpoint = () => {
    const currentIndex = getCurrentCheckpointIndex();
    if (currentIndex > 0) {
      const prevId = projectData.checkpoints[currentIndex - 1].id;
      if (canNavigateToCheckpoint(prevId)) {
        onCheckpointChange(prevId);
      }
    }
  };

  const overallProgress = calculateOverallProgress();
  const currentCheckpointData = getCurrentCheckpoint();
  const currentIndex = getCurrentCheckpointIndex();

  // Keep expanded panel within viewport by clamping position to measured panel size
  useEffect(() => {
    if (!isExpanded) return;
    const el = panelRef.current;
    if (!el) return;
    const margin = 12;
    const measureAndClamp = () => {
      const rect = el.getBoundingClientRect();
      const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
      const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
      const clampedX = Math.min(Math.max(position.x, margin), maxX);
      const clampedY = Math.min(Math.max(position.y, margin), maxY);
      if (clampedX !== position.x || clampedY !== position.y) {
        setPosition({ x: clampedX, y: clampedY });
      }
    };
    // measure after paint
    const raf = requestAnimationFrame(measureAndClamp);
    const onResize = () => measureAndClamp();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [isExpanded, position.x, position.y]);

  return (
    <div
      ref={containerRef}
  className={`fixed z-50 transition-transform duration-200 ease-out ${isDragging ? 'scale-105' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* COMPACT FLOATING BUBBLE */}
  {!isExpanded && (
        <div
          ref={bubbleRef}
          onPointerDown={onBubblePointerDown}
          onPointerMove={onBubblePointerMove}
          onPointerUp={onBubblePointerUp}
          className={`relative w-20 h-20 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden ${
            isDragging 
              ? 'cursor-grabbing scale-105' 
              : 'cursor-grab hover:scale-105'
          } ${
            overallProgress === 100
              ? 'bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600'
              : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700'
          }`}
          style={{
            background: overallProgress === 100 
              ? 'linear-gradient(135deg, #34d399, #10b981, #059669)' 
              : 'linear-gradient(135deg, #8b5cf6, #7c3aed, #6d28d9)'
          }}
        >
          {/* Glass morphism overlay */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-full" />
          
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 bg-white/20 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                style={{
                  left: `${20 + (i * 15)}%`,
                  top: `${30 + (i * 8)}%`,
                  animationDelay: `${i * 200}ms`,
                  animationDuration: `${1000 + (i * 200)}ms`,
                }}
              />
            ))}
          </div>
          
          {/* Progress ring with improved styling */}
          {/* Progress ring positioned at the very edge as border */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
            {/* Progress circle at the very edge */}
            <circle
              cx="40"
              cy="40"
              r="38"
              fill="none"
              stroke={overallProgress === 100 ? "#ffffff" : "rgba(255,255,255,0.9)"}
              strokeWidth="4"
              strokeDasharray={`${(overallProgress / 100) * 238.76} 238.76`}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))',
              }}
            />
          </svg>
          
          {/* Center content with improved typography */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="text-xl font-bold tracking-tight group-hover:scale-110 transition-transform duration-200 drop-shadow-sm">
              {currentIndex + 1}
            </div>
            <div className="text-xs opacity-90 font-semibold tracking-wide">
              {overallProgress}%
            </div>
          </div>
          
          {/* Expand indicator with better positioning */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white/95 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100 backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4a1 1 0 011-1h4M4 16v4a1 1 0 001 1h4m8-16h4a1 1 0 011 1v4m-4 12h4a1 1 0 001-1v-4" />
            </svg>
          </div>
          
          {/* Completion celebration effect */}
          {overallProgress === 100 && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping opacity-40" />
              <div className="absolute inset-1 rounded-full border border-white/30 animate-pulse opacity-60" />
              <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/10 rounded-full opacity-20 animate-pulse" />
            </>
          )}
          
          {/* Drag visual feedback */}
          {isDragging && (
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          )}
        </div>
      )}

      {/* EXPANDED PANEL */}
      {isExpanded && (
        <div ref={panelRef} className="w-[640px] max-w-[calc(100vw-24px)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-h-[70vh] overflow-hidden">
          {/* Header with drag handle */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-gray-800/50 dark:to-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">{currentIndex + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{projectData.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-28 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }} />
                    </div>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                </div>
              </div>
              <button onClick={closeExpanded} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all duration-200 hover:scale-110">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body: list + details */}
          <div className="grid grid-cols-5 gap-0 h-[56vh]">
            {/* Left list */}
            <div className="col-span-2 border-r border-gray-100 dark:border-gray-700/50 overflow-y-auto p-3">
              <div className="space-y-2">
                {projectData.checkpoints.map((checkpoint, index) => {
                  const progress = getProgressForCheckpoint(checkpoint.id);
                  const isActive = checkpoint.id === currentCheckpoint;
                  const isCompleted = progress?.completed || false;
                  const canNavigate = canNavigateToCheckpoint(checkpoint.id);
                  const isSelected = selectedId === checkpoint.id;
                  return (
                    <div
                      key={checkpoint.id}
                      className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                        isSelected ? 'ring-2 ring-blue-400' : ''
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : isCompleted
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedId(checkpoint.id);
                        if (canNavigateToCheckpoint(checkpoint.id)) {
                          onCheckpointChange(checkpoint.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isActive ? 'bg-white/20 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {isCompleted ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div>
                            <div className={`font-medium text-sm ${isActive ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{checkpoint.title}</div>
                            <div className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>{checkpoint.tests.length} tests</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right details */}
            <div className="col-span-3 overflow-y-auto p-4">
              {(() => {
                const cp = projectData.checkpoints.find(c => c.id === selectedId) || currentCheckpointData;
                if (!cp) return null;
                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{cp.title}</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedId(currentCheckpoint)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                        >
                          Current
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      {useMarkdownDetection(cp.description) ? (
                        <MarkdownRenderer content={cp.description} />
                      ) : (
                        <p>{cp.description}</p>
                      )}
                    </div>
                    {cp.requirements && cp.requirements.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-800 dark:text-white mb-2">Requirements</h5>
                        <div className="space-y-3">
                          {cp.requirements.map((req, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {useMarkdownDetection(req) ? <MarkdownRenderer content={req} /> : <span>{req}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckpointFloatingUI;
