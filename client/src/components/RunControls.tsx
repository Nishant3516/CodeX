import React, { FC } from 'react';
import ShortcutHelp from './ShortcutHelp';
import { KeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type RunControlsProps = {
  onRun: () => void;
  onSubmit: () => void;
  onPrettify: () => void;
  onSettings: () => void;
  shortcuts: KeyboardShortcuts;
};

const RunControls: FC<RunControlsProps> = ({ onRun, onSubmit, onPrettify, onSettings, shortcuts }) => (
  <div className="flex items-center justify-between p-3 bg-[#2d2d30] border-t border-[#3c3c3c]">
    <div className="flex gap-3">
      <button
        onClick={onRun}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium"
        title={`Run Code (${shortcuts.run})`}
      >
        ▶️ Run
      </button>
      <button
        onClick={onPrettify}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors font-medium"
        title={`Prettify Code (${shortcuts.prettify})`}
      >
        ✨ Prettify
      </button>
      <button
        onClick={onSubmit}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
        title={`Submit Project (${shortcuts.submit})`}
      >
        📤 Submit
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
);

export default RunControls;
