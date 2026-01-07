"use client"
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import '../../styles/terminal.css';
import { ProjectParams } from '@/constants/FS_MessageTypes';
import { buildPtyUrl, sendPtyKillUserProcesses } from '@/lib/pty';
import { dlog } from '@/utils/debug';

export interface TerminalHandle {
  /** Focus terminal */
  focus: () => void;
  /** Force a fit recalculation */
  forceFit: () => void;
}

const TerminalComponent = forwardRef<TerminalHandle, { params: ProjectParams; terminalId?: string; isVisible?: boolean }>(({ params, terminalId, isVisible = true }, ref) => {
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingFitRef = useRef<number | null>(null);
  const initialFitAttemptsRef = useRef<number>(0);
  const maxInitialFitAttempts = 20; // ~ after panel layout settles
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const createSocketRef = useRef<(() => void) | null>(null);
  const isVisibleRef = useRef(isVisible);
  const instanceId = terminalId || 'default';
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupSentRef = useRef(false);

  // Memoize terminal configuration to prevent unnecessary re-creation
  const terminalConfig = useMemo(() => ({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
    lineHeight: 1.2,
    theme: {
      background: '#0a0a0a',
      foreground: '#e5e7eb',
      cursor: '#06b6d4',
      cursorAccent: '#0a0a0a',
      selectionBackground: 'rgba(255, 255, 255, 0.2)',
      black: '#000000',
      red: '#ef4444',
      green: '#22c55e',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#f3f4f6',
      brightBlack: '#6b7280',
      brightRed: '#f87171',
      brightGreen: '#4ade80',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    },
    allowTransparency: true,
    scrollback: 1000,
    rightClickSelectsWord: true,
    cols: 80,
    rows: 24,
    disableStdin: false,
    convertEol: true,
  }), []);

  useEffect(() => {
    console.log('Terminal: Visibility changed to:', isVisible);
    isVisibleRef.current = isVisible;

    // If terminal becomes visible and we have a socket but it's not connected, try to reconnect
    if (isVisible && socketRef.current && socketRef.current.readyState !== WebSocket.OPEN && !isConnected) {
      console.log('Terminal: Terminal became visible, checking connection status');
      if (!isReconnecting) {
        console.log('Terminal: Attempting to reconnect due to visibility change');
        createSocketRef.current?.();
      }
    }
  }, [isVisible, isConnected]);

  useEffect(() => {
    console.log('Terminal: Main useEffect triggered with params:', params, 'isVisible:', isVisible);
    if (!terminalRef.current || typeof window === 'undefined') {
      console.log('Terminal: Container not ready or SSR detected');
      return;
    }

    console.log('Terminal: Starting initialization for labId:', params?.labId);

    const term = new Terminal(terminalConfig);

    cleanupSentRef.current = false;

    let resizeHandler: (() => void) | null = null;
    // Must be let because we enhance this cleanup later after dynamic import
    let cleanupResize = () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };

    // Dynamic import of FitAddon to avoid SSR issues
    import('@xterm/addon-fit').then(({ FitAddon }) => {
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      term.open(terminalRef.current!);
      
      // Initial fit after a short delay to ensure proper rendering
      const requestFit = (delay = 16) => {
        if (pendingFitRef.current) cancelAnimationFrame(pendingFitRef.current);
        pendingFitRef.current = requestAnimationFrame(() => {
          try {
            fitAddon.fit();
            // If width is still 0 or tiny, retry a few times
            if (terminalRef.current && terminalRef.current.clientWidth < 15 && initialFitAttemptsRef.current < maxInitialFitAttempts) {
              initialFitAttemptsRef.current++;
              setTimeout(() => requestFit(), 80);
            }
          } catch {}
        });
      };
      setTimeout(() => requestFit(), 60);

      resizeHandler = () => requestFit();
      window.addEventListener('resize', resizeHandler);

      // Observe size changes of container (panel resizes)
      if (terminalRef.current && 'ResizeObserver' in window) {
        resizeObserverRef.current = new ResizeObserver(() => requestFit());
        resizeObserverRef.current.observe(terminalRef.current);
      }
      // Refocus / refit when page becomes visible again
      const visHandler = () => {
        if (document.visibilityState === 'visible') {
          requestFit();
        }
      };
      document.addEventListener('visibilitychange', visHandler);
      // Cleanup additions
      const originalCleanupResize = cleanupResize;
      cleanupResize = () => {
        originalCleanupResize();
        document.removeEventListener('visibilitychange', visHandler);
        if (resizeObserverRef.current) {
          try { resizeObserverRef.current.disconnect(); } catch {}
          resizeObserverRef.current = null;
        }
        if (pendingFitRef.current) {
          cancelAnimationFrame(pendingFitRef.current);
          pendingFitRef.current = null;
        }
      };

      // Set loading to false after terminal is opened
      // NOTE: Loading will be cleared when WebSocket connects, not here
      // setIsLoading(false);
      setIsTerminalReady(true);
    });
    
    terminalInstanceRef.current = term;
    
    // (initial cleanup replaced above)
    const labId = params?.labId;
    console.log('Terminal: Checking labId:', labId);
    if (!labId || labId === '') {
      console.log('Terminal: No labId provided, showing error message');
      term.writeln('\x1b[31mNo lab ID provided. Terminal unavailable.\x1b[0m');
      return;
    }

  let currentSocket: WebSocket | null = null;
    let isReconnecting = false;
    let reconnectionAttempts = 0;
    const maxReconnectionAttempts = 5;
    const reconnectionDelay = 2000;
    let messageTimeout: NodeJS.Timeout | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let currentCommand = ''; // Store the current command being typed


    
    const onData = (data: string) => {
      dlog("DATA ENTERED", data)
      if (data == "\r" || data == "\n") {
        
        if (currentCommand.trim() === 'clear') {
          term.reset();

          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ type: 'input', data: data })); 
          }
          currentCommand = ''; 
          return;
        }

        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
          currentSocket.send(JSON.stringify({ type: 'input', data: data }));
        }
        currentCommand = '';
        return;
      }

      if (data === '\x7f' || data === '\b') {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
        }
        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
          currentSocket.send(JSON.stringify({ type: 'input', data: data }));
        }
        return;
      }

      if (data >= ' ' && data <= '~') {
        currentCommand += data;
      }

      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(JSON.stringify({ type: 'input', data: data }));
      }
    };
    term.onData(onData);

    const requestCleanup = () => {
      if (cleanupSentRef.current) return;
      cleanupSentRef.current = true;
      sendPtyKillUserProcesses(currentSocket);
    };
    
    const createSocket = () => {
      try {
        // Clear any existing timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Set a connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          if (!isConnected) {
            console.log('Terminal: Connection timeout reached');
            setConnectionError('Connection timeout - server may be unavailable');
            setIsLoading(false);
          }
        }, 10000); // 10 second timeout

        const ptyUrl = buildPtyUrl(labId);
        console.log('Terminal: Creating WebSocket connection to:', ptyUrl);
        currentSocket = new WebSocket(ptyUrl);
        socketRef.current = currentSocket;
        setupSocketHandlers();
      } catch (e) {
        console.error('Terminal: Socket creation error', e);
        setConnectionError('Failed to create WebSocket connection');
        setIsLoading(false);
      }
    };

    // Assign to ref for external access
    createSocketRef.current = createSocket;

    const setupSocketHandlers = () => {
      if (!currentSocket) return;

      currentSocket.onopen = () => {
        console.log('Terminal: WebSocket connection opened');
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(true);
        setConnectionError(null);
        setIsLoading(false); // Only clear loading when WebSocket is connected

        try {
          // Ensure terminal is ready to receive keyboard input
          (terminalInstanceRef.current as any)?.focus?.();
        } catch {}
        
        if (isReconnecting) {
          term.writeln('\x1b[32m✓ Reconnected to terminal.\x1b[0m');
          setIsReconnecting(false);
          reconnectionAttempts = 0;
          if (messageTimeout) {
            clearTimeout(messageTimeout);
            messageTimeout = null;
          }
        } else {
          term.writeln('\x1b[36m┌─────────────────────────────────────────┐\x1b[0m');
          term.writeln('\x1b[36m│\x1b[0m \x1b[1;33m🚀  Welcome to DevsArena Terminal!  \x1b[0m     \x1b[36m│\x1b[0m');
          term.writeln('\x1b[36m│\x1b[0m \x1b[32mYour secure coding environment is ready\x1b[0m \x1b[36m│\x1b[0m');
          term.writeln('\x1b[36m└─────────────────────────────────────────┘\x1b[0m');
          term.writeln('');
        }

        heartbeatInterval = setInterval(() => {
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };

      currentSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output') {
            // Skip displaying clear command output since we handle it locally
            if (message.data && !message.data.includes('clear')) {
              term.write(message.data);
            }
          } else if (message.type === 'heartbeat') {
            // Respond to heartbeat from server
            if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
              currentSocket.send(JSON.stringify({ type: 'heartbeat_response' }));
            }
          } else if (message.type === 'heartbeat_response') {
            // Handle heartbeat response silently
          }
        } catch {
          // Fallback for plain text messages
          const data = event.data;
          // Skip displaying clear command output
          if (data && !data.includes('clear')) {
            term.write(data);
          }
        }
      };

      currentSocket.onclose = (event) => {
        console.log('Terminal: WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Clear connection timeout if it exists
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        if (event.code !== 1000) {
          // Don't reconnect if the terminal is hidden
          if (!isVisibleRef.current) return;

          setIsReconnecting(true);
          reconnectionAttempts++;

          if (reconnectionAttempts <= maxReconnectionAttempts) {
            messageTimeout = setTimeout(() => {
              if (isReconnecting) {
                term.writeln('');
                term.writeln('\x1b[33m⚠ Connection lost. Attempting to reconnect...\x1b[0m');
              }
            }, 1000);

            setTimeout(() => {
              if (isReconnecting) {
                createSocket();
              }
            }, reconnectionDelay);
          } else {
            term.writeln('');
            term.writeln('\x1b[31m✗ Failed to reconnect after multiple attempts.\x1b[0m');
            term.writeln('\x1b[33mPlease refresh the page to restore connection.\x1b[0m');
            setIsReconnecting(false);
            setConnectionError('Failed to reconnect after multiple attempts');
          }
        }
      };

      currentSocket.onerror = (error) => {
        console.error('Terminal: WebSocket error occurred', error);
        // Treat errors as transient; onclose handler manages retries and final failure state.
      };
    };

    createSocket();
    console.log('Terminal: Socket creation initiated');

    const onBeforeUnload = () => requestCleanup();
    const onPageHide = () => requestCleanup();
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      try {
        requestCleanup();
      } catch {}

      try {
        window.removeEventListener('beforeunload', onBeforeUnload);
        window.removeEventListener('pagehide', onPageHide);
      } catch {}

      cleanupResize();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (messageTimeout) {
        clearTimeout(messageTimeout);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      try {
        if (currentSocket) {
          try { currentSocket.close(); } catch {}
        }
        socketRef.current = null;
      } catch {}
      try {
        term.dispose();
      } catch {}
    };
  }, [params?.labId]);

  // Memoize retry function to prevent unnecessary re-renders
  const handleRetry = useCallback(() => {
    setConnectionError(null);
    setIsLoading(true);
    createSocketRef.current?.();
  }, []);

  // Expose terminal commands through ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      try {
        // xterm focuses the textarea via focus method
        (terminalInstanceRef.current as any)?.focus?.();
      } catch {}
    },
    forceFit: () => {
      try {
        fitAddonRef.current?.fit?.();
      } catch {}
    }
  }), []);

  return (
    <div className="w-full h-full flex flex-col bg-black relative">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Lab: {params?.labId} {instanceId !== 'default' && `• ${instanceId}`}
        </div>
      </div>
      
      {/* Terminal Container - Always rendered */}
      <div 
        ref={terminalRef} 
        className="flex-1 w-full h-full overflow-hidden"
        style={{ 
          minHeight: 0,
          minWidth: 0,
        }}
      />
      
      {/* Loading Overlay */}
      {(!isTerminalReady || (isLoading && !isConnected)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-90 z-10 pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm mb-2">
              {!isTerminalReady ? 'Initializing Terminal...' : 
               connectionError ? 'Connection Error' : 'Connecting to Terminal...'}
            </p>
            {connectionError && (
              <div className="text-red-400 text-xs mb-4 max-w-xs">
                {connectionError}
              </div>
            )}
            {connectionError && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
              >
                Retry Connection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
TerminalComponent.displayName = 'TerminalComponent';

export default TerminalComponent;