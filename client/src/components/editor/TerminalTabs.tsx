"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { usePty } from '@/hooks/usePty';
// Import the exact TerminalHandle type from Terminal to avoid ref incompatibility
import type { TerminalHandle } from './Terminal';

const XTerminal = dynamic(() => import("./Terminal"), { ssr: false });

interface TerminalTab {
  id: string;
  name: string;
  isActive: boolean;
}

interface TerminalTabsProps {
  onTerminalReady?: (terminalRef: React.RefObject<TerminalHandle | null>) => void;
    isConnected?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export function TerminalTabs({ onTerminalReady, isConnected, connectionError, onRetry, onInput, onResize }: TerminalTabsProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: '1', name: 'Terminal', isActive: true }
  ]);
  const [nextTabId, setNextTabId] = useState(2);
  const terminalRef = useRef<TerminalHandle>(null);
  const activeTab = tabs.find(tab => tab.isActive);

  const createNewTab = useCallback(() => {
    const newTab: TerminalTab = {
      id: nextTabId.toString(),
      name: `Terminal ${nextTabId}`,
      isActive: true
    };

    setTabs(prevTabs => [
      ...prevTabs.map(tab => ({ ...tab, isActive: false })),
      newTab
    ]);
    setNextTabId(prev => prev + 1);
  }, [nextTabId]);

  const switchTab = useCallback((tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId
      }))
    );
  }, []);

  const closeTab = useCallback((tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (tabs.length === 1) return; // Don't close the last tab

    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const isActiveTab = tabs[tabIndex].isActive;

    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      if (isActiveTab && newTabs.length > 0) {
        // If we're closing the active tab, activate another one
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        newTabs[newActiveIndex].isActive = true;
      }
      
      return newTabs;
    });
  }, [tabs]);

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-gray-900 border-b border-gray-700 flex items-center px-2 py-1 shrink-0">
        {/* <div className="flex items-center space-x-1 flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-lg cursor-pointer group transition-colors min-w-0 ${
                tab.isActive
                  ? 'bg-black text-white border-t-2 border-cyan-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => switchTab(tab.id)}
            >
              <Terminal className="w-3 h-3 shrink-0" />
              <span className="text-xs truncate min-w-0">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="w-4 h-4 rounded-full hover:bg-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </div> */}
        
        {/* New Tab Button
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createNewTab}
          className="ml-2 p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors shrink-0"
          title="New Terminal"
        >
          <Plus className="w-4 h-4" />
        </motion.button> */}
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab && (
            <motion.div
              key={`terminal-${activeTab.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <XTerminal 
                  terminalId="main"
                  isConnected={!!isConnected}
                  connectionError={connectionError || null}
                  onRetry={onRetry}
                  onInput={onInput || (() => {})}
                  onResize={onResize || (() => {})}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
