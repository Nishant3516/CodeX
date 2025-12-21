import React, { FC } from 'react';
import ShortcutHelp from './ShortcutHelp';
import { KeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { CheckpointProgress } from '@/types/project';

type RunControlsProps = {
  onRun: () => void;
  onTest: () => void;
  onSubmit: () => void;
  onPrettify: () => void;
  onSettings: () => void;
  shortcuts: KeyboardShortcuts;
  progress:CheckpointProgress[];
  isTestRunning?: boolean;
};

const RunControls: FC<RunControlsProps> = ({ onRun, onTest, progress, onPrettify, onSubmit, onSettings, shortcuts, isTestRunning = false }) => {
const isProjectComplete = progress.every(p => p.completed);
  return (
<div className="flex items-center justify-between p-3 bg-[#2d2d30] border-t border-[#3c3c3c]">
    <div className="flex gap-3">
      <button
        onClick={onRun}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
        title={`Run Code (${shortcuts.run})`}
      >
        ▶️ Run & Test
      </button>
      <button
        onClick={onPrettify}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-medium"
        title={`Prettify Code (${shortcuts.prettify})`}
      >
        ✨ Prettify
      </button>
      <button
        onClick={onTest}
        disabled={isTestRunning || isProjectComplete}
        className={`flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-md transition-colors font-medium ${isProjectComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={`Run Tests (${shortcuts.submit})`}
      >
        {isTestRunning ? (
          <>
            <span className="animate-spin">⏳</span>
            Testing...
          </>
        ) : (
          <>
            🧪 Test
          </>
        )}
      </button>
    </div>
    
    <div className="flex items-center gap-2">
      <ShortcutHelp shortcuts={shortcuts} />
      <button
        onClick={onSettings}
        className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  </div>

  )
}
  

export default RunControls;
