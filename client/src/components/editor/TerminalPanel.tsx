"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProjectParams } from '@/constants/FS_MessageTypes';
const XTerminal = dynamic(() => import("./Terminal"), {ssr: false});
interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  logs: LogEntry[];
  isRunning: boolean;
  onClear: () => void;
  params: ProjectParams
}

export function TerminalPanel({ logs, isRunning, onClear, params }: TerminalPanelProps) {
  
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="h-full bg-black flex flex-col">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          <Terminal className="w-4 h-4 mr-2 text-red-400" />
          <span className="text-white font-medium">Console</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClear}
          className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear
        </motion.button>
      </div>
      <div className="flex-1 p-3 overflow-y-auto font-mono text-sm">
      <XTerminal params={params}/>
      </div>
    </div>
  );
}

// Small client-only component to avoid SSR/CSR time formatting mismatch
function LogItem({ log, className }: { log: LogEntry; className?: string }) {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    try {
      setTimeStr(log.timestamp.toLocaleTimeString());
    } catch (e) {
      setTimeStr('');
    }
  }, [log.timestamp]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mb-1 ${className}`}>
      <span className="text-gray-500 text-xs mr-2">{timeStr}</span>
      {log.message}
    </motion.div>
  );
}
