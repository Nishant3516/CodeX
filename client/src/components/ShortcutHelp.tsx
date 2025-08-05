import React, { FC, useState } from 'react';
import { KeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type ShortcutHelpProps = {
  shortcuts: KeyboardShortcuts;
};

const ShortcutHelp: FC<ShortcutHelpProps> = ({ shortcuts }) => {
  const [isVisible, setIsVisible] = useState(false);

  const shortcutList = [
    { key: 'run', label: 'Run Code', icon: '▶️' },
    { key: 'prettify', label: 'Prettify Code', icon: '✨' },
    { key: 'submit', label: 'Submit Project', icon: '📤' },
    { key: 'toggleConsole', label: 'Toggle Console', icon: '🖥️' },
    { key: 'toggleValidation', label: 'Toggle Validation', icon: '✅' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
        title="Keyboard Shortcuts"
      >
        <span className="text-lg">⌨️</span>
        <span>Shortcuts</span>
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-600 z-50">
          <div className="p-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              ⌨️ Keyboard Shortcuts
            </h3>
            <div className="space-y-1">
              {shortcutList.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span>{icon}</span>
                    <span>{label}</span>
                  </span>
                  <kbd className="px-2 py-0.5 bg-gray-700 rounded text-xs font-mono">
                    {shortcuts[key as keyof KeyboardShortcuts]}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
              Click Settings ⚙️ to customize shortcuts
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutHelp;
