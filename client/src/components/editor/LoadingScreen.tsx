"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Code, Play, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { LoadingTips } from '../LoadingTips';
import { useLabProgress } from '../../hooks/useLabProgress';
import { useSimpleConnections } from '../../hooks/useSimpleConnections';

interface LoadingScreenProps {
  language: string;
  labId: string;
  onReady?: () => void;
}

export function LoadingScreen({
  language,
  labId,
  onReady
}: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Use the lab progress hook first to get service status
  const {
    data: progressData,
    loading: progressLoading,
    status: labStatus,
    fsActive,
    ptyActive
  } = useLabProgress({ labId, language });

  // Use the simplified connections hook with service status
  const {
    fsConnected,
    ptyConnected,
    isReady
  } = useSimpleConnections({
    labId,
    language,
    fsActive,
    ptyActive
  });

  // Define user-friendly loading steps
  const loadingSteps = [
    {
      icon: <Terminal className="w-6 h-6" />,
      title: "Setting up your workspace",
      description: "Preparing your coding environment",
      color: "text-blue-400"
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Loading project files",
      description: "Getting your code ready",
      color: "text-purple-400"
    },
    {
      icon: <Play className="w-6 h-6" />,
      title: "Starting development server",
      description: "Almost there...",
      color: "text-green-400"
    }
  ];

  // Update current step based on connection status
  useEffect(() => {
    if (fsConnected && ptyConnected) {
      setCurrentStep(2);
      setIsComplete(true);
    } else if (fsConnected || ptyConnected) {
      setCurrentStep(1);
    } else if (fsActive || ptyActive) {
      setCurrentStep(0);
    }
  }, [fsConnected, ptyConnected, fsActive, ptyActive]);

  // Handle completion
  useEffect(() => {
    if (isReady && isComplete) {
      // Immediate transition when ready - no artificial delay
      onReady?.();
    }
  }, [isReady, isComplete, onReady]);

  const getProgressPercentage = () => {
    if (isComplete) return 100;
    if (currentStep === 2) return 90;
    if (currentStep === 1) return 60;
    if (currentStep === 0) return 30;
    return 10;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-green-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-lg w-full mx-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Preparing Your Environment
          </h1>
          <p className="text-gray-400 text-lg">
            {isComplete ? "Ready to code!" : "Setting everything up for you..."}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span>Progress</span>
            <span className="font-medium">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-full rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </motion.div>
          </div>
        </motion.div>

        {/* Loading Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          {loadingSteps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep || (index === currentStep && isComplete);

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gray-800/80 border border-gray-600 shadow-lg'
                    : isCompleted
                    ? 'bg-green-900/20 border border-green-700/50'
                    : 'bg-gray-800/40 border border-gray-700/30'
                }`}
              >
                <div className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : isCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-600/20 text-gray-500'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : isActive ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className={`font-semibold transition-colors duration-300 ${
                    isActive
                      ? 'text-white'
                      : isCompleted
                      ? 'text-green-300'
                      : 'text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm transition-colors duration-300 ${
                    isActive
                      ? 'text-gray-300'
                      : isCompleted
                      ? 'text-green-200'
                      : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Completion Animation */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-full shadow-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Environment Ready!</span>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Starting your coding session...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-2 bg-gray-800/60 text-gray-300 px-3 py-1 rounded-full text-sm">
            <Code className="w-4 h-4" />
            <span>{language.charAt(0).toUpperCase() + language.slice(1)} Environment</span>
          </div>
        </motion.div>

        {/* Helpful Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <LoadingTips
            showTips={true}
            getTips={() => []} // Will use default tips
            className="mt-6"
          />
        </motion.div>
      </div>
    </div>
  );
}
