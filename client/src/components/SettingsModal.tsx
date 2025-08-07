import React, { FC, useState, useEffect } from 'react';

export type KeyboardShortcuts = {
  run: string;
  prettify: string;
  submit: string;
  save: string;
  newFile: string;
  toggleConsole: string;
  toggleValidation: string;
};

export type SettingsState = {
  shortcuts: KeyboardShortcuts;
  fontSize: number;
  showMinimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  tabSize: number;
  autoValidation: boolean;
  cssAutoSemicolon: boolean;
};

const defaultShortcuts: KeyboardShortcuts = {
  run: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+R' : 'Ctrl+R',
  prettify: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
  submit: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+S' : 'Ctrl+S',
  save: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+S' : 'Ctrl+S',
  newFile: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+N' : 'Ctrl+N',
  toggleConsole: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+J' : 'Ctrl+J',
  toggleValidation: navigator.platform.toLowerCase().includes('mac') ? 'Cmd+Shift+M' : 'Ctrl+Shift+M',
};

const defaultSettings: SettingsState = {
  shortcuts: defaultShortcuts,
  fontSize: 14,
  showMinimap: false,
  wordWrap: true,
  lineNumbers: true,
  tabSize: 2,
  autoValidation: true,
  cssAutoSemicolon: false,
};

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsState;
  onSave: (settings: SettingsState) => void;
};

const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [tempSettings, setTempSettings] = useState<SettingsState>(settings);
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'editor'>('shortcuts');
  const [capturingShortcut, setCapturingShortcut] = useState<string | null>(null);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(tempSettings);
    onClose();
  };

  const handleReset = () => {
    setTempSettings(defaultSettings);
  };

  const updateShortcut = (key: keyof KeyboardShortcuts, value: string) => {
    setTempSettings(prev => ({
      ...prev,
      shortcuts: { ...prev.shortcuts, [key]: value }
    }));
  };

  const startCapturingShortcut = (key: string) => {
    setCapturingShortcut(key);
  };

  const handleShortcutCapture = (event: React.KeyboardEvent) => {
    if (!capturingShortcut) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const keys: string[] = [];
    const isMac = navigator.platform.toLowerCase().includes('mac');
    
    if (event.metaKey && isMac) keys.push('Cmd');
    if (event.ctrlKey && !isMac) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    
    // Don't capture modifier keys alone
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) return;
    
    keys.push(event.key.toUpperCase());
    const shortcut = keys.join('+');
    
    updateShortcut(capturingShortcut as keyof KeyboardShortcuts, shortcut);
    setCapturingShortcut(null);
  };

  const resetShortcut = (key: keyof KeyboardShortcuts) => {
    updateShortcut(key, defaultShortcuts[key]);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && capturingShortcut) {
        setCapturingShortcut(null);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [capturingShortcut]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-600">
          {[
            { id: 'shortcuts', label: '⌨️ Shortcuts', icon: '⌨️' },
            { id: 'editor', label: '📝 Editor', icon: '📝' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  💡 Tip: Use standard keyboard shortcuts for better productivity. Click on any shortcut to customize it.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(tempSettings.shortcuts).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 dark:text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {key === 'run' && 'Execute your code'}
                        {key === 'prettify' && 'Format and beautify code'}
                        {key === 'submit' && 'Save your progress'}
                        {key === 'save' && 'Save current file'}
                        {key === 'newFile' && 'Create new file'}
                        {key === 'toggleConsole' && 'Show/hide console'}
                        {key === 'toggleValidation' && 'Show/hide validation panel'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startCapturingShortcut(key)}
                        onKeyDown={capturingShortcut === key ? handleShortcutCapture : undefined}
                        className={`px-4 py-2 text-sm font-mono border rounded-md transition-colors min-w-[120px] ${
                          capturingShortcut === key
                            ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-550'
                        }`}
                        autoFocus={capturingShortcut === key}
                      >
                        {capturingShortcut === key ? 'Press keys...' : value}
                      </button>
                      <button
                        onClick={() => resetShortcut(key as keyof KeyboardShortcuts)}
                        className="px-2 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                        title="Reset to default"
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                ))}
                {capturingShortcut && (
                  <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    💡 Press the key combination you want to use, or press Escape to cancel.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>

                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 dark:text-gray-300">Font Size</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={tempSettings.fontSize}
                        onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm font-mono w-8">{tempSettings.fontSize}px</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-gray-700 dark:text-gray-300">Tab Size</label>
                    <select
                      value={tempSettings.tabSize}
                      onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                      className="px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md"
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Features</h3>
                  
                  {[
                    { key: 'showMinimap', label: 'Show Minimap', desc: 'Display code overview' },
                    { key: 'wordWrap', label: 'Word Wrap', desc: 'Wrap long lines' },
                    { key: 'lineNumbers', label: 'Line Numbers', desc: 'Show line numbers' },
                    { key: 'autoValidation', label: 'Live Validation', desc: 'Real-time error checking' },
                    { key: 'cssAutoSemicolon', label: 'CSS Semicolon Validation', desc: 'Suggest missing semicolons in CSS' },
                  ].map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between">
                      <div>
                        <label className="text-gray-700 dark:text-gray-300">{feature.label}</label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempSettings[feature.key as keyof SettingsState] as boolean}
                        onChange={(e) => updateSetting(feature.key as any, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Options</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                    Reset all settings to their default values. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    🔄 Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600 bg-black dark:bg-gray-750">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Changes will be applied immediately and saved locally.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
            >
              💾 Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
export { defaultSettings };
