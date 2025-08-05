import React, { FC, useState, useRef } from 'react';

type SplitPaneProps = {
  /** percentages of container width */
  initialLeftWidth?: number; // default percent for left pane
  minLeftWidth?: number;     // minimum percent for left pane
  maxLeftWidth?: number;     // maximum percent for left pane
  children: [React.ReactNode, React.ReactNode];
};

const SplitPane: FC<SplitPaneProps> = ({
  children,
  initialLeftWidth = 50,  // percent for code editor
  minLeftWidth = 45,      // minimum percent
  maxLeftWidth = 60,      // maximum percent
}) => {
  // percent width of left pane
  const [leftPct, setLeftPct] = useState<number>(initialLeftWidth);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // disable text selection and change cursor
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.body.style.pointerEvents = 'none';
    
    const startX = e.clientX;
    const startPct = leftPct;
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    
    const onMouseMove = (e2: MouseEvent) => {
      e2.preventDefault();
      e2.preventDefault();
      const deltaPx = e2.clientX - startX;
      const deltaPct = (deltaPx / containerWidth) * 100;
      const newPct = Math.max(minLeftWidth, Math.min(maxLeftWidth, startPct + deltaPct));
      setLeftPct(newPct);
      // Trigger resize event immediately for Monaco
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);
      // restore text selection and cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.style.pointerEvents = '';
      // Final resize event
      setTimeout(() => window.dispatchEvent(new Event('resize')), 10);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };  const [leftChild, rightChild] = children;

  return (
    <div ref={containerRef} className="flex flex-1 h-full select-none">
      {/* Left pane with fixed width */}
      <div style={{ width: `${leftPct}%`, flexShrink: 0 }} className="flex flex-col h-full overflow-hidden">
        {leftChild}
      </div>
      {/* Resizer handle */}
      <div
        onMouseDown={onMouseDown}
        className={`flex-shrink-0 w-1 h-full cursor-col-resize border-r border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-500 hover:bg-opacity-20 transition-colors z-10 ${
          isDragging ? 'bg-blue-500 bg-opacity-30' : ''
        }`}
        style={{ minWidth: '4px' }}
      />
      {/* Right pane flex-grow */}
      <div style={{ width: `${100 - leftPct}%`, flexShrink: 0 }} className="flex flex-col h-full overflow-auto">
        {rightChild}
      </div>
    </div>
  );
};

export default SplitPane;
