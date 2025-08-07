import React, { FC, useState, useRef } from 'react';

const ResizableSidebar: FC<{
  children: React.ReactNode;
  minWidth?: number;
}> = ({ children, minWidth = 200 }) => {
  // percentage width of sidebar between 15% and 25%
  const [percent, setPercent] = useState<number>(20);
  const [open, setOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    
    const startX = e.clientX;
    const startPct = percent;
    
    const onMouseMove = (e2: MouseEvent) => {
      e2.preventDefault();
      const delta = e2.clientX - startX;
      const deltaPct = (delta / window.innerWidth) * 100;
      const newPct = Math.max(15, Math.min(30, startPct + deltaPct));
      setPercent(newPct);
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex h-full flex-shrink-0" style={{ width: open ? `${percent}%` : '32px' }}>
      {/* Toggle button always visible */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 bg-gray-200 dark:bg-gray-700 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 flex-shrink-0 border-r border-gray-300 dark:border-gray-600"
        title={open ? 'Collapse Sidebar' : 'Expand Sidebar'}
      >
        {open ? '◀' : '▶'}
      </div>
      {/* Collapsible container */}
      {open && (
        <>
          <div className="flex-1 overflow-hidden min-w-0">
            {children}
          </div>
          <div
            onMouseDown={onMouseDown}
            className={`w-1 cursor-col-resize bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 dark:hover:bg-blue-400 flex-shrink-0 transition-colors ${
              isDragging ? 'bg-blue-500 dark:bg-blue-400' : ''
            }`}
            title="Resize Sidebar"
          />
        </>
      )}
    </div>
  );
};

export default ResizableSidebar;
