"use client";
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal, RotateCcw } from 'lucide-react';
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { TerminalTabs } from './TerminalTabs';
import type { TerminalHandle } from './Terminal';
interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

interface TerminalPanelProps {
  logs: LogEntry[];
  isRunning: boolean;
  onClear: () => void;
  params: ProjectParams;
  onTerminalReady?: (terminalRef: React.RefObject<TerminalHandle | null>) => void;
}

export function TerminalPanel({ logs, isRunning, onClear, params, onTerminalReady }: TerminalPanelProps) {
  const [terminalKey, setTerminalKey] = useState(0);
  
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  const handleRestart = () => {
    setTerminalKey(prev => prev + 1);
  };

  return (
    <div className="h-full  flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {/* <TerminalTabs key={terminalKey} params={params} onTerminalReady={onTerminalReady} /> */}
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
