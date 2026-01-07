"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye,
  RotateCcw,
  ExternalLink,
  Terminal, // Icon for the UI
  Power,      // Icon for the UI
  WifiOff     // Icon for the UI
} from 'lucide-react';
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { dlog } from '@/utils/debug';

interface PreviewPanelProps {
  // Props are kept for potential future use, but not directly used in this logic
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onExport?: () => void;
  params:ProjectParams;
  startCommands?: string[];
}

// A dedicated component for the "App Not Running" UI
const AppOfflineUI = ({ onRetry, startCommands }: { onRetry: () => void; startCommands?: string[] }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700">
    <div className="p-6 bg-red-50 rounded-full mb-6 shadow-sm">
      <Power size={40} className="text-red-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-800 mb-3">Application Not Running</h2>
    <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
      To see your live preview, please start the development server in the terminal below.
    </p>
    {startCommands && startCommands.length > 0 && (
      <div className="bg-gray-900 border border-gray-700 text-left p-5 rounded-lg font-mono text-sm w-full max-w-sm mb-8 shadow-lg">
        <div className="text-gray-300 text-xs mb-3 font-sans font-medium uppercase tracking-wide">Run these commands:</div>
        {startCommands.map((command, index) => (
          <div key={index} className="flex items-center py-1.5">
            <span className="text-green-400 mr-3 text-sm">$</span>
            <span className="text-gray-100 font-medium">{command}</span>
          </div>
        ))}
      </div>
    )}
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onRetry}
      className="bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 px-8 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 shadow-lg"
    >
      <RotateCcw className="w-4 h-4" />
      Retry Connection
    </motion.button>
  </div>
);

// A simple loading indicator
const LoadingUI = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
      <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-4 text-gray-600 font-medium">Connecting to your application...</p>
    </div>
);


export function PreviewPanel({ htmlContent, cssContent, jsContent, onExport, params, startCommands }: PreviewPanelProps) {
  const iFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [appStatus, setAppStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const appUrl = window.location.protocol === 'https:' ? `https://${params.labId}.devsarena.in/` : `http://${params.labId}.devsarena.in/`;

  // We use useCallback to prevent this function from being recreated on every render
  const checkAppStatus = useCallback(async () => {
    setAppStatus('loading');
    try {
      // We use AbortController for a request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(appUrl, { signal: controller.signal, cache: 'no-store' });
      console.log('Health check response status:', response.status);
      clearTimeout(timeoutId);

      // Check if the server responded with a successful status code (2xx)
      if (response.ok) {
        setAppStatus('online');
      } else {
        setAppStatus('offline');
      }
    } catch (error) {
      dlog("CONNECTION ERROR",error);
      // This catches network errors (e.g., connection refused)
      setAppStatus('offline');
    }
  }, [appUrl]);

  // Run the check when the component first mounts
  useEffect(() => {
    checkAppStatus();
  }, [checkAppStatus]);

  const onRefresh = () => {
    // If the app is online, hard-reload the iframe
    if (appStatus === 'online' && iFrameRef.current) {
      const iframe = iFrameRef.current;
      const base = iframe.src.split('?')[0];
      iframe.src = `${base}?_=${Date.now()}`;
    } else {
      // If the app is offline or loading, re-run the connection check
      checkAppStatus();
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between z-10">
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-2 text-purple-400" />
          <span className="text-white font-medium">Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Refresh Preview"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={()=>{ window.open(appUrl,'_blank'); }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      <div className="w-full h-full flex-grow">
        {appStatus === 'loading' && <LoadingUI />}
        {appStatus === 'offline' && <AppOfflineUI onRetry={checkAppStatus} startCommands={startCommands} />}
        {appStatus === 'online' && (
          <iframe
            ref={iFrameRef}
            src={appUrl}
            className="w-full h-full border-none"
            title="Live Preview"
          />
        )}
      </div>
    </div>
  );
}