
import { WSResponse, FSMessageType, EventMessage } from '../constants/FS_MessageTypes';
import { isDebug } from '@/utils/debug';

class FileSystemSocket {
  private ws: WebSocket | null = null;
  private requestCallbacks = new Map<string, { resolve: (data: any) => void; reject: (error: any) => void }>();
  // Map of message type -> list of pending request_ids sent for that type (FIFO)
  private pendingByType = new Map<string, string[]>();
  // Map to look up the message type for a given request_id
  private requestIdToType = new Map<string, string>();
  private messageHandlers = new Map<string, (data: any) => void>();
  // Map of outgoing request type -> expected incoming response type
  // This covers the server convention where request is e.g. 'fs_fetch_quest_meta' and response is 'quest_meta'
  private responseTypeMap: Record<string, string> = {
    fs_fetch_quest_meta: 'quest_meta',
    fs_load_dir: 'dir_content',
    fs_fetch_file_content: 'file_content',
    fs_file_content_update: 'file_updated',
    fs_new_file: 'file_created',
    fs_delete_file: 'file_deleted',
    fs_edit_file_meta: 'file_renamed'
  };
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 30;
  private reconnectDelay = 300;
  private shouldReconnect = true;
  // Toggle detailed debug logging for handshake/correlation issues
  private debug = false;
  private openHandlers: Array<() => void> = [];
  private closeHandlers: Array<(ev: CloseEvent) => void> = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

async sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async  checkIfAvailable(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
  if (isDebug()) console.log(`Checking WebSocket availability: ${url}`);

    const testSocket = new WebSocket(url);
    const timeout = setTimeout(() => {
      testSocket.close();
  if (isDebug()) console.log('WebSocket availability check timed out');
      resolve(false); // Timeout means service might be starting up
    }, 3000);

    testSocket.onopen = () => {
      clearTimeout(timeout);
  if (isDebug()) console.log('WebSocket service is available');
      testSocket.close();
      resolve(true);
    };

    testSocket.onerror = (error) => {
      clearTimeout(timeout);
  if (isDebug()) console.error('WebSocket availability check failed:', error);

      // For other errors, assume service is not available (404-like scenario)
  if (isDebug()) console.log('WebSocket service not available (404-like error)');
      resolve(false);
    };

    testSocket.onclose = (event) => {
      clearTimeout(timeout);
      if (event.code === 1000) {
        // Normal closure means service is available
  if (isDebug()) console.log('WebSocket service available (normal closure)');
        resolve(true);
      } else {
        // Abnormal closure - service might not be available
  if (isDebug()) console.log(`WebSocket service not available (closed with code ${event.code})`);
        resolve(false);
      }
    };
  });
}

  async connect(url: string): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (this.ws) this.ws.close();
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          if (isDebug()) console.log("FS WebSocket connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.shouldReconnect = true;
          this.connectionPromise = null;
          // Start heartbeat to keep connection alive
          this.startHeartbeat();
          // fire open handlers
          this.openHandlers.forEach(h => {
            try { h(); } catch { /* swallow */ }
          });
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          if (isDebug()) console.error("FS WebSocket error:", error);

          this.isConnecting = false;
          this.connectionPromise = null;
          reject(error);
        };

        this.ws.onmessage = this.handleMessage.bind(this);

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          if (isDebug()) console.log("FS WebSocket disconnected", event.code, event.reason);
          this.isConnecting = false;
          this.connectionPromise = null;
          this.stopHeartbeat();
          this.closeHandlers.forEach(h => {
            try { h(event); } catch { /* swallow */ }
          });
          
          // Auto-reconnect if not a normal closure, we should reconnect, and we haven't exceeded max attempts
          if (event.code !== 1000 && event.code !== 1001 && this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            if (isDebug()) console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
            
            setTimeout(() => {
              this.connect(url).catch((err) => {
                if (isDebug()) console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, err);
                if (this.reconnectAttempts >= this.maxReconnectAttempts && this.maxReconnectAttempts !== Infinity) {
                  if (isDebug()) console.error("Max reconnection attempts exceeded. Connection failed permanently.");
                }
              });
            }, delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts && this.maxReconnectAttempts !== Infinity) {
            if (isDebug()) console.error("Max reconnection attempts exceeded. Connection failed permanently.");
          }
        };

      } catch (error) {
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private handleMessage(event: MessageEvent) {
    try {
  const response: WSResponse = JSON.parse(event.data);
  if (isDebug() && this.debug) console.log("FS Message received:", response.type, response.status, "payload keys:", response.data ? Object.keys((response as any).data || {}) : []);
      
      const { request_id, type, data, status, message } = response;

      // Handle info messages from server (don't treat as errors)
      if (type === 'info') {
        if (isDebug()) console.log("Server info:", message || data);
        return;
      }

      // Debug: show pending maps before attempting to match
      if (this.debug) {
        if (isDebug()) {
          console.log('DBG pendingByType:', JSON.stringify(Array.from(this.pendingByType.entries())));
          console.log('DBG requestCallbacks keys:', Array.from(this.requestCallbacks.keys()));
        }
      }

  // If server provided request_id, use it
      if (request_id && this.requestCallbacks.has(request_id)) {
        const { resolve, reject } = this.requestCallbacks.get(request_id)!;
        this.requestCallbacks.delete(request_id);
        // cleanup mappings
  const mappedType = this.requestIdToType.get(request_id) || type;
        if (mappedType) {
          this.requestIdToType.delete(request_id);
          const arr = (this.pendingByType.get(mappedType) || []).filter(id => id !== request_id);
          this.pendingByType.set(mappedType, arr);
        }

        if (status === 'success') {
          resolve(data);
        } else {
          reject(new Error(message || 'Request failed'));
        }
        return;
      }

    // If there's no request_id, attempt to match by type (FIFO) to support servers that omit request_id
  if (!request_id && type && this.pendingByType.has(type)) {
        const list = this.pendingByType.get(type) || [];
        if (list.length > 0) {
          const oldestRequestId = list.shift()!; // remove from queue
          this.pendingByType.set(type, list);
          const cb = this.requestCallbacks.get(oldestRequestId);
  if (isDebug() && this.debug) console.log('DBG matched by type', type, '->', oldestRequestId, 'cbExists=', !!cb);
          if (cb) {
            this.requestCallbacks.delete(oldestRequestId);
            this.requestIdToType.delete(oldestRequestId);
            if (status === 'success') {
              cb.resolve(data);
            } else {
              cb.reject(new Error(message || 'Request failed'));
            }
            return;
          }
        }
      }

      // fall back to message handlers for unsolicited messages
    if (type && this.messageHandlers.has(type)) {
        this.messageHandlers.get(type)!(data);
      } else {
  if (isDebug()) console.log("Unhandled message type:", type, 'status=', status, 'hasRequestId=', !!request_id);
      }
    } catch (err) {
  if (isDebug()) console.error("Error parsing WS message:", err);
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  async ensureConnected(url: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    return this.connect(url);
  }

  async sendMessage<T>(type: FSMessageType | string, payload: unknown, url?: string): Promise<T> {
    // Ensure connection is established
    if (url && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      await this.ensureConnected(url);
    }

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket not connected"));
      }

      const request_id = Math.random().toString(36).substring(2, 15);
      // Attach request_id both at top-level and inside payload for servers that expect either
      const message: EventMessage = {
        type,
        request_id,
        payload: { ...(payload as any), request_id }
      } as any;

      // Track callbacks and type mapping
      this.requestCallbacks.set(request_id, { resolve, reject });
  const responseType = this.responseTypeMap[type as string] || (type as string);
  const list = this.pendingByType.get(responseType) || [];
      list.push(request_id);
  this.pendingByType.set(responseType, list);
  this.requestIdToType.set(request_id, responseType);

      try {
        this.ws.send(JSON.stringify(message));
  if (isDebug()) console.log("Sent message:", type, request_id);
      } catch (error) {
        // cleanup on immediate send failure
        this.requestCallbacks.delete(request_id);
        this.requestIdToType.delete(request_id);
        const updated = (this.pendingByType.get(responseType) || []).filter(id => id !== request_id);
        this.pendingByType.set(responseType, updated);
        reject(error);
        return;
      }

      // Set timeout for request - reduced from 15s to 8s for faster failures
      const timeout = setTimeout(() => {
        if (this.requestCallbacks.has(request_id)) {
          this.requestCallbacks.delete(request_id);
          this.requestIdToType.delete(request_id);
          const updated = (this.pendingByType.get(responseType) || []).filter(id => id !== request_id);
          this.pendingByType.set(responseType, updated);
          reject(new Error("Request timeout"));
        }
      }, 8000); // Reduced timeout for faster failures

      // replace stored resolve/reject with timeout attached so close handlers can clear it
      this.requestCallbacks.set(request_id, { resolve: (data) => { clearTimeout(timeout); resolve(data); }, reject: (err) => { clearTimeout(timeout); reject(err); } });
    });
  }

  /**
   * Send a message without awaiting or tracking a response.
   * Useful for fire-and-forget operations like saves where the UI
   * should not be blocked by server timeouts.
   */
  async sendOneWay(type: FSMessageType | string, payload: unknown, url?: string): Promise<void> {
    if (url && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      await this.ensureConnected(url);
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: EventMessage = {
      type,
      // do not attach request_id since we're not awaiting a reply
      payload: payload as any
    } as any;

    try {
      this.ws.send(JSON.stringify(message));
      if (this.debug) console.log('Sent one-way message:', type);
    } catch (err) {
      console.error('Failed to send one-way message:', err);
      throw err;
    }
  }

  disconnect() {
    if (this.ws) {
      // Set a flag to prevent reconnection instead of setting reconnectAttempts to Infinity
      this.shouldReconnect = false;
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.stopHeartbeat();
    this.requestCallbacks.clear();
    this.messageHandlers.clear();
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  onOpen(cb: () => void) { this.openHandlers.push(cb); }
  onClose(cb: (ev: CloseEvent) => void) { this.closeHandlers.push(cb); }
  offOpen(cb: () => void) { this.openHandlers = this.openHandlers.filter(h => h !== cb); }
  offClose(cb: (ev: CloseEvent) => void) { this.closeHandlers = this.closeHandlers.filter(h => h !== cb); }

  private startHeartbeat() {
    this.stopHeartbeat(); // ensure no duplicate
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' })); // simple ping
        if (isDebug()) console.log('Sent heartbeat ping');
      }
    }, 20000); // every 20 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Test execution helper methods
  async runCheckpointTest(checkpointId: string, language: string): Promise<void> {
    return this.sendOneWay('test_run_checkpoint', { 
      checkpointId, 
      language 
    });
  }

  async runAllTests(language: string): Promise<void> {
    return this.sendOneWay('test_run_all', { language });
  }

  async getTestResults(testRunId?: string): Promise<any> {
    return this.sendMessage('test_get_results', { testRunId });
  }

  // Subscribe to test result messages
  onTestMessage(handler: (data: any) => void): void {
    this.messageHandlers.set('test_started', handler);
    this.messageHandlers.set('test_completed', handler);
    this.messageHandlers.set('test_progress', handler);
    this.messageHandlers.set('test_results', handler);
  }

  // Unsubscribe from test result messages
  offTestMessage(): void {
    this.messageHandlers.delete('test_started');
    this.messageHandlers.delete('test_completed');
    this.messageHandlers.delete('test_progress');
    this.messageHandlers.delete('test_results');
  }

  // Expose current reconnect attempts (for diagnostics)
  getReconnectAttempts(): number { return this.reconnectAttempts; }
  // Allow external toggling of verbose debug inside socket (still gated by isDebug())
  setVerboseDebug(v: boolean) { this.debug = v; }
}

export const fsSocket = new FileSystemSocket();