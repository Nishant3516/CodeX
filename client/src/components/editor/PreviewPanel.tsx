"use client";
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye,
  RotateCcw,
  Download,
  Terminal, // Icon for the UI
  Power,      // Icon for the UI
  WifiOff     // Icon for the UI
} from 'lucide-react';
import { ProjectParams } from '@/constants/FS_MessageTypes';

interface PreviewPanelProps {
  // Props are kept for potential future use, but not directly used in this logic
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onExport?: () => void;
  params:ProjectParams
}

// A dedicated component for the "App Not Running" UI
const AppOfflineUI = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 text-gray-700">
    <div className="p-4 bg-red-100 rounded-full mb-4">
      <Power size={32} className="text-red-500" />
    </div>
    <h2 className="text-xl font-semibold text-gray-800 mb-2">Application Not Running</h2>
    <p className="text-gray-500 mb-6 max-w-sm">
      To see your live preview, please start the development server in the terminal.
    </p>
    <div className="bg-gray-800 text-left p-4 rounded-lg font-mono text-sm text-white w-full max-w-xs">
      <span className="text-green-400">$</span> <span className="text-white">npm run dev</span>
      <br />

    </div>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onRetry}
      className="mt-8 bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
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


export function PreviewPanel({ htmlContent, cssContent, jsContent, onExport, params }: PreviewPanelProps) {
  const iFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [appStatus, setAppStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const appUrl = `http://${params.labId}.quest.arenas.devsarena.in/`;

  // We use useCallback to prevent this function from being recreated on every render
  const checkAppStatus = useCallback(async () => {
    setAppStatus('loading');
    try {
      // We use AbortController for a request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const response = await fetch(appUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      // Check if the server responded with a successful status code (2xx)
      if (response.ok) {
        setAppStatus('online');
      } else {
        setAppStatus('offline');
      }
    } catch (error) {
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
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      <div className="w-full h-full flex-grow">
        {appStatus === 'loading' && <LoadingUI />}
        {appStatus === 'offline' && <AppOfflineUI onRetry={checkAppStatus} />}
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