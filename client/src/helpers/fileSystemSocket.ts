
import { WSResponse, FSMessageType, EventMessage } from '../constants/FS_MessageTypes';

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
  private maxReconnectAttempts = 10;
  private reconnectDelay = 300;
  // Toggle detailed debug logging for handshake/correlation issues
  private debug = false;

async sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async  checkIfAvailable(url: string): Promise<boolean> {
  url = url.replace('ws://', 'http://').replace('ws://', 'https://');
  const maxRetries = 4;
  const delays = [1000, 2000, 3000]; // Delay after 1st failure, and after 2nd failure

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt #${attempt}: Checking URL: ${url}`);
      const response = await fetch(url, { method: 'HEAD' });

      // Case 1: Pod is initializing (503). This is a "good" sign.
      if (response.status === 503 || response.status === 502) {
        console.log(`Attempt #${attempt}: Received 503 Service Unavailable. Pod is loading. Returning true.`);
        return true;
      }
         if (response.status === 400) {
        console.log(`Attempt #${attempt}: Received 400 Bad Request. Returning true as per custom logic.`);
        return true;
      }

      // Case 2: Pod is ready and service is available (200-299).
      if (response.ok) {
        console.log(`Attempt #${attempt}: Success! Status is ${response.status}. Returning true.`);
        return true;
      }

      // Case 3: NGINX returns 404 or another error. Treat as unavailable and retry.
      console.log(`Attempt #${attempt}: Failed with status ${response.status}.`);

    } catch (error) {
      // Case 4: Network error (e.g., DNS resolution failed). Treat as unavailable and retry.
      console.error(`Attempt #${attempt}: Network error during fetch.`, error);
    }

    // If this wasn't the last attempt, wait before trying again.
    if (attempt < maxRetries) {
      const delay = delays[attempt - 1];
      console.log(`Waiting for ${delay / 1000}s before next attempt...`);
      await this.sleep(delay);
    }
  }

  // If the loop completes, all attempts have failed.
  console.log('All attempts failed. The service is not available. Returning false.');
  return false;
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
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          if (this.ws) this.ws.close();
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log("FS WebSocket connected");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error("FS WebSocket error:", error);
          this.isConnecting = false;
          this.connectionPromise = null;
          reject(error);
        };

        this.ws.onmessage = this.handleMessage.bind(this);

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          console.log("FS WebSocket disconnected", event.code, event.reason);
          this.isConnecting = false;
          this.connectionPromise = null;
          
          // Auto-reconnect if not a normal closure and we haven't exceeded max attempts
          if (event.code !== 1000 && event.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
            
            setTimeout(() => {
              this.connect(url).catch((err) => {
                console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, err);
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                  console.error("Max reconnection attempts exceeded. Connection failed permanently.");
                }
              });
            }, delay);
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnection attempts exceeded. Connection failed permanently.");
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
  if (this.debug) console.log("FS Message received:", response.type, response.status, "payload keys:", response.data ? Object.keys((response as any).data || {}) : []);
      
      const { request_id, type, data, status, message } = response;

      // Handle info messages from server (don't treat as errors)
      if (type === 'info') {
        console.log("Server info:", message || data);
        return;
      }

      // Debug: show pending maps before attempting to match
      if (this.debug) {
        console.log('DBG pendingByType:', JSON.stringify(Array.from(this.pendingByType.entries())));
        console.log('DBG requestCallbacks keys:', Array.from(this.requestCallbacks.keys()));
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
      if (this.debug) console.log('DBG matched by type', type, '->', oldestRequestId, 'cbExists=', !!cb);
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
        console.log("Unhandled message type:", type);
      }
    } catch (err) {
      console.error("Error parsing WS message:", err);
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
        console.log("Sent message:", type, request_id);
      } catch (error) {
        // cleanup on immediate send failure
        this.requestCallbacks.delete(request_id);
        this.requestIdToType.delete(request_id);
        const updated = (this.pendingByType.get(responseType) || []).filter(id => id !== request_id);
        this.pendingByType.set(responseType, updated);
        reject(error);
        return;
      }

      // Set timeout for request
      const timeout = setTimeout(() => {
        if (this.requestCallbacks.has(request_id)) {
          this.requestCallbacks.delete(request_id);
          this.requestIdToType.delete(request_id);
          const updated = (this.pendingByType.get(responseType) || []).filter(id => id !== request_id);
          this.pendingByType.set(responseType, updated);
          reject(new Error("Request timeout"));
        }
      }, 15000); // Increased timeout

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
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.requestCallbacks.clear();
    this.messageHandlers.clear();
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const fsSocket = new FileSystemSocket();