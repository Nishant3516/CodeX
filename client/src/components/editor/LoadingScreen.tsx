"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Folder, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { LoadingTips } from '../LoadingTips';
import { useLabProgress } from '../../hooks/useLabProgress';
import { useSimpleConnections } from '../../hooks/useSimpleConnections';

interface LoadingStepProps {
  icon: React.ReactNode;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
}

function LoadingStep({ icon, label, status, message }: LoadingStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
    >
      <div className="flex-shrink-0">
        {icon}
      </div>
      <div className="flex-grow">
        <div className={`flex items-center gap-2 ${getTextColor()}`}>
          {getStatusIcon()}
          <span className="font-medium">{label}</span>
        </div>
        {message && (
          <div className="text-sm text-gray-500 mt-1">{message}</div>
        )}
      </div>
    </motion.div>
  );
}

export interface LoadingScreenProps {
  language: string;
  labId: string;
  onReady?: () => void;
  showTips?: boolean;
  getLoadingTips?: () => string[];
}

export function LoadingScreen({
  language,
  labId,
  onReady,
  showTips = false,
  getLoadingTips = () => []
}: LoadingScreenProps) {
  const [dotCount, setDotCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Animated dots for loading text
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount(prev => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Track elapsed time
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Use the lab progress hook first to get service status
  const { 
    data: progressData, 
    loading: progressLoading, 
    progressLogs, 
    status: labStatus, 
    fsActive, 
    ptyActive 
  } = useLabProgress({ labId, language });

  // Use the simplified connections hook with service status
  const {
    fsConnected,
    ptyConnected,
    fsError,
    ptyError,
    isReady
  } = useSimpleConnections({
    labId,
    language,
    fsActive,
    ptyActive
  });

  // Check if all services are ready
  const allReady = isReady && fsConnected && ptyConnected;

  useEffect(() => {
    if (allReady && onReady) {
      // Small delay to show success state before transitioning
      const timer = setTimeout(onReady, 1000);
      return () => clearTimeout(timer);
    }
  }, [allReady, onReady]);

  const getFsStatus = () => {
    if (!fsActive) return 'loading';
    if (fsError) return 'error';
    if (fsConnected) return 'success';
    return 'loading';
  };

  const getPtyStatus = () => {
    if (!ptyActive) return 'loading';
    if (ptyError) return 'error';
    if (ptyConnected) return 'success';
    return 'loading';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusMessage = () => {
    if (progressLoading) return 'Checking lab status...';
    if (!fsActive || !ptyActive) return 'Services are starting up...';
    if (fsActive && ptyActive && !allReady) return 'Connecting to services...';
    return 'Environment ready!';
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
            <Terminal className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Booting Environment
          </h1>
          <p className="text-gray-400">
            {getStatusMessage()}{'.'.repeat(dotCount + 1)}
          </p>
          <div className="text-sm text-gray-500 mt-2">
            Lab ID: {labId} • {formatTime(elapsedTime)}
          </div>
        </motion.div>

        {/* Loading Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3 mb-8"
        >
          <LoadingStep
            icon={<Folder className="w-5 h-5 text-purple-400" />}
            label="File System"
            status={getFsStatus()}
            message={fsError || (fsConnected ? 'Connected' : fsActive ? 'Service ready, connecting...' : 'Starting service...')}
          />
          
          <LoadingStep
            icon={<Terminal className="w-5 h-5 text-blue-400" />}
            label="Terminal Service"
            status={getPtyStatus()}
            message={ptyError || (ptyConnected ? 'Ready' : ptyActive ? 'Service ready, connecting...' : 'Starting service...')}
          />
        </motion.div>

        {/* Progress Logs */}
        {progressLogs && progressLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h3 className="text-sm font-medium text-gray-300 mb-3">Progress Logs</h3>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {progressLogs.slice(-5).map((log: any, index: number) => (
                <div key={index} className="text-xs text-gray-400 bg-gray-800/30 p-2 rounded">
                  <span className="font-medium text-gray-300">{log.ServiceName}:</span> {log.Message}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{fsConnected && ptyConnected ? '100%' : fsConnected || ptyConnected ? '50%' : '0%'}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: '0%' }}
              animate={{
                width: fsConnected && ptyConnected ? '100%' : fsConnected || ptyConnected ? '50%' : '20%'
              }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full"
            />
          </div>
        </motion.div>

        {/* Ready State */}
        <AnimatePresence>
          {allReady && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-green-600/20 text-green-400 px-4 py-2 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Environment Ready!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading tips */}
        <LoadingTips
          showTips={showTips}
          getTips={getLoadingTips}
          className="mt-6"
        />
      </div>
    </div>
  );
}
