
export type PtyMessageCategory = 
  | 'user_command'      // User typed in terminal
  | 'system_command'    // System-initiated (run button, kill, etc.)
  | 'test_runner'       // Test execution and results
  | 'progress'          // Progress updates (install, build, server start)
  | 'terminal_output'   // Raw terminal output
  | 'control';          // Heartbeat, connection status

export interface PtyInputMessage {
  type: 'input';
  category: 'user_command';
  data: string; // Raw terminal input (keystrokes)
}

export interface PtyRunMessage {
  type: 'run';
  category: 'system_command';
  data: {
    initCommands?: string[];
    runCommand: string;
  };
}

export interface PtyKillMessage {
  type: 'kill_user_processes';
  category: 'system_command';
}

export interface PtyTestMessage {
  type: 'test';
  category: 'test_runner';
  data: {
    type: 'checkpoint';
    checkpointId: string;
    language: string;
  };
}

export interface PtyHeartbeatMessage {
  type: 'heartbeat' | 'heartbeat_response';
  category: 'control';
}

export type PtyInboundMessage =
  | PtyInputMessage
  | PtyRunMessage
  | PtyKillMessage
  | PtyTestMessage
  | PtyHeartbeatMessage;


export interface PtyOutputMessage {
  type: 'output';
  category: 'terminal_output';
  data: string;
}

// Progress Updates
export type ProgressStage =
  | 'installing_dependencies'
  | 'building'
  | 'starting_server'
  | 'server_ready'
  | 'command_executing'
  | 'command_completed';

export interface PtyProgressMessage {
  type: 'progress';
  category: 'progress';
  data: {
    stage: ProgressStage;
    message: string;
    command?: string;
    port?: number; // For server_ready stage
    url?: string;  // Preview URL
  };
}

// Test Runner
export interface PtyTestStartedMessage {
  type: 'test_started';
  category: 'test_runner';
  data: {
    checkpointId: string;
  };
}

export interface PtyTestCompletedMessage {
  type: 'test_completed';
  category: 'test_runner';
  data: {
    checkpoint: number;
    status: 'pass' | 'fail';
    durationMs?: number;
    error?: {
      scenario?: string;
      expected?: string;
      received?: string;
      hint?: string;
      message?: string;
    };
  };
}

export interface PtyTestErrorMessage {
  type: 'test_error';
  category: 'test_runner';
  data: {
    checkpointId?: string;
    message: string;
  };
}

// System Commands
export interface PtyRunStartedMessage {
  type: 'run_started';
  category: 'system_command';
  data: {
    message: string;
  };
}

export interface PtyRunExecutingMessage {
  type: 'run_executing';
  category: 'system_command';
  data: {
    command: string;
  };
}

export interface PtyRunErrorMessage {
  type: 'run_error';
  category: 'system_command';
  data: {
    message: string;
  };
}

// Control
export interface PtyHeartbeatResponseMessage {
  type: 'heartbeat' | 'heartbeat_response';
  category: 'control';
}

export interface PtyErrorMessage {
  type: 'error';
  category: 'control';
  data: string | { message: string };
}

export type PtyOutboundMessage =
  | PtyOutputMessage
  | PtyProgressMessage
  | PtyTestStartedMessage
  | PtyTestCompletedMessage
  | PtyTestErrorMessage
  | PtyRunStartedMessage
  | PtyRunExecutingMessage
  | PtyRunErrorMessage
  | PtyHeartbeatResponseMessage
  | PtyErrorMessage;

// ============================================================================
// Helper Types
// ============================================================================

export interface PtyConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

export interface PtyExecutionState {
  isRunning: boolean;
  isTesting: boolean;
  canRunTests: boolean; // True if no blocking operations
  currentCommand: string | null;
  currentStage: ProgressStage | null;
}

// Normalized test result for UI
export interface NormalizedTestResult {
  checkpoint: string;
  passed: boolean;
  status: string;
  durationMs?: number;
  error?: {
    scenario?: string;
    expected?: string;
    received?: string;
    hint?: string;
    message?: string;
  } | null;
  output?: string;
}
