import React, { useState, useEffect } from 'react';

interface LoadingTipsProps {
  showTips: boolean;
  getTips: () => string[];
  className?: string;
}

export function LoadingTips({ showTips, getTips, className = '' }: LoadingTipsProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tips, setTips] = useState<string[]>([]);

  // Default user-friendly tips
  const defaultTips = [
    "💡 Pro tip: Use Ctrl+S to save your work quickly",
    "🎯 Focus on one task at a time for better productivity",
    "🔄 Your changes are automatically saved as you type",
    "📁 Organize your files with clear, descriptive names",
    "⚡ Use keyboard shortcuts to speed up your workflow"
  ];

  useEffect(() => {
    if (showTips) {
      const customTips = getTips();
      const finalTips = customTips.length > 0 ? customTips : defaultTips;
      setTips(finalTips);
      setCurrentTipIndex(0);

      // Rotate through tips every 4 seconds
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % finalTips.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [showTips, getTips]);

  if (!showTips || tips.length === 0) {
    return null;
  }

  return (
    <div className={`mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">💡</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 mb-1">While you wait...</p>
          <p className="text-sm text-blue-700 transition-opacity duration-500 leading-relaxed">
            {tips[currentTipIndex]}
          </p>
          {tips.length > 1 && (
            <div className="flex space-x-2 mt-3">
              {tips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentTipIndex
                      ? 'bg-blue-500 scale-110'
                      : 'bg-blue-300 hover:bg-blue-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
