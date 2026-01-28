"use client";
import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

import '@xterm/xterm/css/xterm.css';
import '../../styles/terminal.css';

export interface TerminalHandle {
  focus: () => void;
  forceFit: () => void;
  write: (data: string) => void;
  clear: () => void;
}

interface TerminalProps {
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
  labId?: string;
  terminalId?: string;
  isConnected: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
}

const TerminalComponent = forwardRef<TerminalHandle, TerminalProps>(({ 
  onInput, 
  onResize, 
  labId, 
  terminalId, 
  isConnected, 
  connectionError, 
  onRetry 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isRendered = useRef(false);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const currentCommandRef = useRef('');
  const localEchoRef = useRef(true);
  const didNudgeRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || isRendered.current) return;
    isRendered.current = true;

    let term: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');

        if (!containerRef.current) return;

        term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          lineHeight: 1.2,
          theme: {
            background: '#0a0a0a',
            foreground: '#e5e7eb',
            cursor: '#06b6d4',
            selectionBackground: 'rgba(255, 255, 255, 0.2)',
          },
          allowTransparency: true,
          convertEol: true, 
        });

        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        
        term.open(containerRef.current);
        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // 1. Initial Fit & Resize Trigger (Fixes missing prompt)
        // We must tell the backend the size immediately so bash knows how to render
        setTimeout(() => {
          try {
              fitAddon?.fit();
              if (onResize && term?.cols && term?.rows) {
                  onResize(term.cols, term.rows);
              }
              term?.focus();
          } catch (e) {
              console.warn("Initial fit failed", e);
          }
        }, 100);

        // 2. Bind Input
        term.onData((data) => {
          // Only do local echo for control characters, let server handle printable chars
          if (localEchoRef.current) {
            if (data === '\r' || data === '\n') {
              term?.write('\r\n');
            } else if (data === '\x7f' || data === '\b') {
              term?.write('\b \b');
            }
            // Removed local echo for printable characters to avoid double rendering
          }

          if (data === '\r' || data === '\n') {
            currentCommandRef.current = '';
          } else if (data === '\x7f' || data === '\b') {
            currentCommandRef.current = currentCommandRef.current.slice(0, -1);
          } else if (data >= ' ' && data <= '~') {
            currentCommandRef.current += data;
          }

          if (onInput) {
            onInput(data);
          } else {
            console.warn("Terminal: onInput prop is missing");
          }
        });

        // 3. Handle Resizing
        const handleResize = () => {
          if (!term || !fitAddon) return;
          try {
            fitAddon.fit();
            if (onResize && term.cols && term.rows) {
              onResize(term.cols, term.rows);
            }
          } catch {}
        };
        
        window.addEventListener('resize', handleResize);
        resizeObserver = new ResizeObserver(() => requestAnimationFrame(handleResize));
        resizeObserver.observe(containerRef.current);

        setIsTerminalReady(true);

        // Initial Message
        term.writeln('\x1b[2mInitializing environment...\x1b[0m\r\n');

      } catch (err) {
        console.error("Failed to load terminal", err);
      }
    };

    initTerminal();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (term) term.dispose();
      isRendered.current = false;
    };
  }, []); // Run once on mount

  useImperativeHandle(ref, () => ({
    focus: () => terminalRef.current?.focus(),
    forceFit: () => fitAddonRef.current?.fit(),
    write: (data: string) => {
      terminalRef.current?.write(data);
    },
    clear: () => terminalRef.current?.reset(),
  }));

  useEffect(() => {
    if (isConnected && isTerminalReady) {
      try {
        terminalRef.current?.focus();
      } catch {}
    }
  }, [isConnected, isTerminalReady]);

  return (
    <div className="w-full h-full flex flex-col bg-black relative" style={{ minHeight: '300px' }}>
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="text-xs text-gray-500">Lab: {labId || 'Unknown'}</div>
      </div>
      
      <div
        ref={containerRef}
        className="flex-1 w-full h-full overflow-hidden"
        tabIndex={0}
        onMouseDown={() => {
          try {
            terminalRef.current?.focus();
          } catch {}
        }}
      />
      
      {(!isTerminalReady || (!isConnected && !isTerminalReady)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-10">
          <div className="text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
             <p className="text-gray-400 text-sm">{connectionError || 'Connecting...'}</p>
             {connectionError && onRetry && (
               <button onClick={onRetry} className="mt-2 px-3 py-1 bg-cyan-600 rounded text-xs text-white">Retry</button>
             )}
          </div>
        </div>
      )}
    </div>
  );
});

TerminalComponent.displayName = 'TerminalComponent';
export default TerminalComponent;