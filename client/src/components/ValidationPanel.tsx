import React, { FC } from 'react';

type ValidationPanelProps = {
  errors: string[];
  suggestions: string[];
  isVisible: boolean;
  onToggle: () => void;
};

const ValidationPanel: FC<ValidationPanelProps> = ({ errors, suggestions, isVisible, onToggle }) => {
  const hasContent = errors.length > 0 || suggestions.length > 0;

  return (
    <div className="border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      {/* Header */}
      <div
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {isVisible ? '▼' : '▶'} Validation & Suggestions
          </span>
          {hasContent && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {errors.length + suggestions.length}
            </span>
          )}
        </div>
        <div className="flex space-x-1">
          {errors.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          )}
          {suggestions.length > 0 && (
            <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full">
              {suggestions.length} {suggestions.length === 1 ? 'tip' : 'tips'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isVisible && (
        <div className="p-3 max-h-48 overflow-y-auto">
          {!hasContent ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              ✅ No issues found. Your code looks good!
            </p>
          ) : (
            <div className="space-y-3">
              {/* Errors */}
              {errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                    🚨 Issues to Fix:
                  </h4>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-4 border-red-400">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                    💡 Suggestions for Improvement:
                  </h4>
                  <ul className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-4 border-yellow-400">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
