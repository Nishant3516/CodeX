'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  isCollapsed?: boolean;
  collapsed?: boolean; // Alternative prop name for consistency
  onWidthChange?: (width: number) => void;
  onToggleCollapse?: () => void;
  onCollapseChange?: (collapsed: boolean) => void; // Alternative prop name
  position?: 'left' | 'right';
  collapsible?: boolean; // Whether collapse functionality is enabled
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  isCollapsed = false,
  collapsed,
  onWidthChange,
  onToggleCollapse,
  onCollapseChange,
  position = 'left',
  collapsible = true
}) => {
  // Use collapsed prop if provided, otherwise fall back to isCollapsed
  const actualCollapsed = collapsed !== undefined ? collapsed : isCollapsed;
  
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    if (actualCollapsed) return;
    e.preventDefault();
    setIsResizing(true);
  }, [actualCollapsed]);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current || actualCollapsed) return;

    const rect = panelRef.current.getBoundingClientRect();
    let newWidth: number;

    if (position === 'left') {
      newWidth = e.clientX - rect.left;
    } else {
      newWidth = rect.right - e.clientX;
    }

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  }, [isResizing, minWidth, maxWidth, onWidthChange, position, actualCollapsed]);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      return () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      };
    }
  }, [isResizing, resize, stopResize]);

  const actualWidth = actualCollapsed ? minWidth : width;

  return (
    <div
      ref={panelRef}
      className={`relative h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        position === 'right' ? 'border-r-0 border-l' : ''
      }`}
      style={{ width: actualWidth }}
    >
      {children}
      
      {/* Resize Handle */}
      <div
        ref={resizerRef}
        className={`absolute top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors ${
          position === 'left' ? 'right-0' : 'left-0'
        } ${isResizing ? 'bg-blue-500' : 'bg-transparent'} ${
          actualCollapsed ? 'pointer-events-none' : ''
        }`}
        onMouseDown={startResize}
      >
        <div className="w-3 h-full -mx-1" />
      </div>
    </div>
  );
};