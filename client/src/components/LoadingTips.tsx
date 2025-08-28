import React, { useState, useEffect } from 'react';

interface LoadingTipsProps {
  showTips: boolean;
  getTips: () => string[];
  className?: string;
}

export function LoadingTips({ showTips, getTips, className = '' }: LoadingTipsProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    if (showTips) {
      const newTips = getTips();
      setTips(newTips);
      setCurrentTipIndex(0);

      // Rotate through tips every 8 seconds
      const interval = setInterval(() => {
        setCurrentTipIndex(prev => (prev + 1) % newTips.length);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [showTips, getTips]);

  if (!showTips || tips.length === 0) {
    return null;
  }

  return (
    <div className={`mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-blue-700 font-medium">Connection Tips</p>
          <p className="text-sm text-blue-600 mt-1 transition-opacity duration-500">
            {tips[currentTipIndex]}
          </p>
          {tips.length > 1 && (
            <div className="flex space-x-1 mt-2">
              {tips.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    index === currentTipIndex ? 'bg-blue-500' : 'bg-blue-300'
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
