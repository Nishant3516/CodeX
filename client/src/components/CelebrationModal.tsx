import React, { useEffect, useState, useCallback } from 'react';
import Confetti from 'react-confetti';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  totalCheckpoints: number;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  totalCheckpoints
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'celebrating' | 'settling'>('entering');

  const handleResize = useCallback(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [handleResize]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setShowConfetti(true);
      setAnimationPhase('entering');
      
      // Phase transitions for smoother experience
      const enteringTimer = setTimeout(() => setAnimationPhase('celebrating'), 500);
      const celebratingTimer = setTimeout(() => setAnimationPhase('settling'), 3000);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
      
      // Auto close after 8 seconds
      const autoCloseTimer = setTimeout(() => {
        handleClose();
      }, 8000);
      
      return () => {
        clearTimeout(enteringTimer);
        clearTimeout(celebratingTimer);
        clearTimeout(confettiTimer);
        clearTimeout(autoCloseTimer);
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setShowConfetti(false);
    setTimeout(() => {
      setAnimationPhase('entering');
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Confetti Layer */}
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={animationPhase === 'celebrating'}
          numberOfPieces={animationPhase === 'celebrating' ? 200 : 50}
          gravity={0.1}
          wind={0.02}
          colors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
        />
      )}

      {/* Modal Backdrop */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
          isVisible 
            ? 'bg-black/60 backdrop-blur-md' 
            : 'bg-black/0 backdrop-blur-none pointer-events-none'
        }`}
        onClick={handleClose}
      >
        {/* Main Modal */}
        <div 
          className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full mx-6 overflow-hidden transition-all duration-700 transform ${
            isVisible 
              ? 'scale-100 opacity-100 translate-y-0 rotate-0' 
              : 'scale-75 opacity-0 translate-y-12 rotate-3'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-blue-50/50 to-purple-50/50 dark:from-emerald-900/20 dark:via-blue-900/20 dark:to-purple-900/20" />
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm shadow-md hover:shadow-lg hover:scale-105"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative p-8 text-center">
            {/* Trophy Animation */}
            <div className="mb-8">
              <div 
                className={`relative inline-block transition-all duration-1000 ${
                  animationPhase === 'celebrating' ? 'animate-bounce' : ''
                }`}
              >
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
                  {/* Trophy glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-yellow-700 rounded-full animate-pulse opacity-50" />
                  
                  {/* Trophy Icon */}
                  <svg className="w-14 h-14 text-white relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 2c-1.1 0-2 .9-2 2v3.5c0 3.82 2.66 7.03 6.25 7.74.22 1.57.81 3.04 1.75 4.26v1.5h-2c-.55 0-1 .45-1 1s.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1h-2v-1.5c.94-1.22 1.53-2.69 1.75-4.26C17.34 12.53 20 9.32 20 5.5V4c0-1.1-.9-2-2-2H6zm0 2h12v1.5c0 2.76-2.24 5-5 5h-2c-2.76 0-5-2.24-5-5V4z"/>
                  </svg>
                  
                  {/* Sparkle effects */}
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full opacity-80 animate-ping" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }} />
                </div>
                
                {/* Radiating circles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border-2 border-yellow-300/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute w-40 h-40 border border-yellow-400/20 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                </div>
              </div>
            </div>

            {/* Celebration Text */}
            <div className="mb-8 space-y-4">
              <div 
                className={`transition-all duration-1000 delay-300 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              >
                <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  Congratulations!
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                  Project Successfully Completed
                </p>
              </div>
              
              <div 
                className={`transition-all duration-1000 delay-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
              >
                <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 dark:from-emerald-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {projectTitle}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>All {totalCheckpoints} checkpoints completed!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Stats */}
            <div 
              className={`grid grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110 shadow-lg">
                  <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tests Passed</p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110 shadow-lg">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Checkpoints</p>
              </div>
              
              <div className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110 shadow-lg">
                  <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Achievement</p>
              </div>
            </div>

            {/* Action Button */}
            <div 
              className={`transition-all duration-1000 delay-900 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl backdrop-blur-sm"
              >
                Continue Your Journey
              </button>
            </div>

            {/* Motivational Message */}
            <div 
              className={`mt-6 transition-all duration-1000 delay-1100 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                🚀 Outstanding work! You're building incredible skills!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CelebrationModal;
