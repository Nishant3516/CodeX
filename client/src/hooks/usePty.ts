// hooks/usePty.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
import { buildPtyUrl } from '@/lib/pty';
import { dlog } from '@/utils/debug';

// --- Types ---

export interface RunStatus {
  isInstalling: boolean;
  isRunning: boolean;
  step: string | null;
  serverUrl: string | null;
  error: string | null;
}

export interface TestResult {
  checkpoint: string;
  passed: boolean;
  status: string;
  durationMs?: number;
  error?: {
    scenario?: string;
    message?: string;
    hint?: string;
    expected?: string;
    received?: string;
  } | null;
  output?: string;
}

export interface TestState {
  isRunning: boolean;
  currentCheckpoint: string | null;
  results: TestResult[];
  error: string | null;
}

export interface UsePtyProps {
  labId: string;
  language: string;
  /** * Callback to pipe raw terminal data directly to the xterm instance.
   * This handles the "Zero Latency" path.
   */
  onTerminalData: (data: string) => void;
  /**
   * Optional callback when the server is ready (e.g., to auto-open preview).
   */
  onServerReady?: (url: string) => void;
}

export function usePty({ 
  labId, 
  language, 
  onTerminalData, 
  onServerReady 
}: UsePtyProps) {
  
  // --- Refs & State ---
  
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  // Run State (Install/Dev)
  const [runStatus, setRunStatus] = useState<RunStatus>({
    isInstalling: false,
    isRunning: false,
    step: null,
    serverUrl: null,
    error: null
  });

  // Test State
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    currentCheckpoint: null,
    results: [],
    error: null
  });

  // Keep callbacks fresh in refs to avoid stale closures inside WebSocket listeners
  const onDataRef = useRef(onTerminalData);
  const onReadyRef = useRef(onServerReady);
  
  useEffect(() => {
    onDataRef.current = onTerminalData;
    onReadyRef.current = onServerReady;
  }, [onTerminalData, onServerReady]);

  // --- Connection Logic ---

  const connect = useCallback(() => {
    if (!labId) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');
    const url = buildPtyUrl(labId);
    dlog('usePty: Connecting to', url);

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      dlog('usePty: WebSocket connected');
      setConnectionState('connected');
      // Send initial heartbeat to establish session liveness
      ws.send(JSON.stringify({ type: 'heartbeat' }));
    };

    ws.onclose = (event) => {
      dlog('usePty: WebSocket closed', event.code);
      setConnectionState('disconnected');
      socketRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('usePty: WebSocket error', error);
      // We rely on onclose to handle the state update
    };

    // The "Split Brain" Message Handler
    ws.onmessage = (event) => {
      const raw = event.data;

      // 1. Try parsing as JSON Control Signal (The "Smart" Path)
      try {
        // Optimization: Simple check to see if it looks like JSON before parsing
        // This avoids try/catch overhead on every single keystroke
        if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
            const msg = JSON.parse(raw);
    
            // If it has a 'type' field, we treat it as a protocol message
            if (msg.type) {
              handleProtocolMessage(msg, ws);
              return;
            }
        }
      } catch (e) {
        // Not valid JSON, fall through to raw data
      }

      // 2. Fallback: Treat as Raw Terminal Data (The "Fast" Path)
      // This pipes directly to xterm for display
      onDataRef.current?.(raw);
    };

  }, [labId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      dlog('usePty: Disconnecting');
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  // --- Protocol Message Handler ---

  const handleProtocolMessage = (msg: any, ws: WebSocket) => {
    switch (msg.type) {
      // --- Run Cycle Events ---
      case 'run_executing':
        const step = msg.data?.step || 'unknown';
        dlog('usePty: Run executing step:', step);
        setRunStatus(prev => ({
          ...prev,
          isRunning: true,
          // Heuristic: if step name contains "install" or "init", we are installing
          isInstalling: step.includes('install') || step.includes('init'),
          step: step,
          error: null
        }));
        break;

      case 'run_completed':
        const { status, code } = msg.data || {};
        dlog('usePty: Run step completed:', msg.data);
        
        setRunStatus(prev => ({
          ...prev,
          isInstalling: false,
          // If success, we stay "Running" (server is up). If error, we stop.
          isRunning: status === 'success',
          error: status === 'error' ? `Command failed with code ${code}` : null
        }));
        break;

      case 'server_ready':
        const url = msg.data;
        dlog('usePty: Server ready at', url);
        setRunStatus(prev => ({ ...prev, serverUrl: url }));
        onReadyRef.current?.(url);
        break;

      case 'run_error':
        setRunStatus(prev => ({ ...prev, isRunning: false, error: msg.data?.message }));
        break;

      // --- Test Cycle Events ---
      case 'test_started':
        setTestState(prev => ({
          ...prev,
          isRunning: true,
          currentCheckpoint: msg.data?.checkpointId,
          error: null
        }));
        break;

      case 'test_completed':
        // The backend returns a full result object. 
        // We assume msg.data matches the structure we need or contains a 'results' array.
        const resultData = msg.data;
        
        // Normalize the result to append to our history
        let newResults: TestResult[] = [];
        
        if (resultData && resultData.results && Array.isArray(resultData.results)) {
            // New backend format: returns array of results
            newResults = resultData.results.map((r: any) => normalizeTestResult(r));
        } else if (resultData) {
            // Single result fallback
            newResults = [normalizeTestResult(resultData)];
        }

        setTestState(prev => ({
          ...prev,
          isRunning: false,
          currentCheckpoint: null,
          results: [...prev.results, ...newResults]
        }));
        break;
        
      case 'test_error':
        setTestState(prev => ({
          ...prev,
          isRunning: false,
          error: msg.data?.message || 'Unknown test error'
        }));
        break;
        
      // --- System Events ---
      case 'heartbeat':
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat_response' }));
        }
        break;

      case 'output':
         // Legacy explicit output type
         onDataRef.current?.(msg.data);
         break;
    }
  };

  // Helper to normalize test results from backend variations
  const normalizeTestResult = (raw: any): TestResult => {
    // Backend keys might be capitalized (Go) or camelCase (JS)
    const rawStatus = raw.status || raw.Status || '';
    const normalizedStatus = rawStatus.toString().toLowerCase();
    const passed = raw.passed ?? (normalizedStatus === 'passed' || normalizedStatus === 'success');
    
    const errorPayload = raw.error || raw.Error || null;

    return {
        checkpoint: `${raw.checkpoint || raw.Checkpoint}`,
        passed,
        status: rawStatus,
        durationMs: raw.durationMs || raw.DurationMs,
        error: errorPayload ? {
            scenario: errorPayload.scenario || errorPayload.Scenario,
            message: errorPayload.message || errorPayload.Message,
            hint: errorPayload.hint || errorPayload.Hint,
            expected: errorPayload.expected || errorPayload.Expected,
            received: errorPayload.received || errorPayload.Received,
        } : null,
        output: raw.output
    };
  };

  // --- Outbound Actions ---

  /** Writes raw input (keystrokes) to the PTY */
  const write = useCallback((data: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'input', data }));
    }
  }, []);

  /** Resizes the PTY dimensions */
  const resize = useCallback((cols: number, rows: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  /** Kills all user processes except the shell itself */
  const killProcesses = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'kill_user_processes' }));
    }
  }, []);

  /** Runs the project (Init + Start commands) */
  const runProject = useCallback((initCommands: string[], runCommand: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      // Reset status immediately for UI feedback
      setRunStatus({
        isInstalling: true, // Assume installing first
        isRunning: true,
        step: 'initializing',
        serverUrl: null,
        error: null
      });

      const payload = JSON.stringify({ initCommands, runCommand });
      socketRef.current.send(JSON.stringify({ type: 'run', data: payload }));
    } else {
        console.warn('usePty: Cannot run project, socket not open');
    }
  }, []);

  /** Runs tests for a specific checkpoint */
  const runTests = useCallback((checkpointId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      setTestState(prev => ({ ...prev, isRunning: true, error: null }));
      
      const payload = JSON.stringify({
        type: 'checkpoint',
        checkpointId,
        language
      });
      socketRef.current.send(JSON.stringify({ type: 'test', data: payload }));
    } else {
        console.warn('usePty: Cannot run tests, socket not open');
    }
  }, [language]);

  return {
    // Lifecycle
    connect,
    disconnect,
    connectionState,
    
    // Actions
    write,
    resize,
    killProcesses,
    runProject,
    runTests,
    
    // State
    runStatus,
    testState
  };
}