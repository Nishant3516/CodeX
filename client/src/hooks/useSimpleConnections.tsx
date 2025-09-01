import { useState, useEffect, useCallback, useRef } from 'react';
import { fsSocket } from "../helpers/fileSystemSocket";
import { buildFsUrl } from "@/lib/fs";
import { buildPtyUrl } from "@/lib/pty";

interface UseSimpleConnectionsOptions {
  labId: string;
  language: string;
  fsActive: boolean;
  ptyActive: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useSimpleConnections({
  labId,
  language,
  fsActive,
  ptyActive,
  maxRetries = 8, // Reduced from 10 to 8
  retryDelay = 1500, // Reduced from 2000 to 1500ms for faster retries
}: UseSimpleConnectionsOptions) {
  const [fsConnected, setFsConnected] = useState(false);
  const [ptyConnected, setPtyConnected] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);
  const [ptyError, setPtyError] = useState<string | null>(null);
  
  const fsRetries = useRef(0);
  const ptyRetries = useRef(0);
  const mounted = useRef(true);
  const connectionAttempted = useRef(false);
  const ptySocket = useRef<WebSocket | null>(null);

  const connectToFS = useCallback(async (): Promise<boolean> => {
    try {
      const fsUrl = buildFsUrl(labId);
      await fsSocket.connect(fsUrl);
      
      if (mounted.current) {
        setFsConnected(true);
        setFsError(null);
        console.log('FS connected successfully');
      }
      return true;
    } catch (error: any) {
      console.error('FS connection failed:', error);
      if (mounted.current) {
        setFsError(error.message || 'Connection failed');
      }
      return false;
    }
  }, [labId]);

  const connectToPTY = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const ptyUrl = buildPtyUrl(labId);
        if (!ptyUrl) {
          throw new Error('Invalid PTY URL');
        }

        const socket = new WebSocket(ptyUrl);
        ptySocket.current = socket;

        const connectTimeout = setTimeout(() => {
          socket.close();
          resolve(false);
        }, 5000);

        socket.onopen = () => {
          clearTimeout(connectTimeout);
          if (mounted.current) {
            setPtyConnected(true);
            setPtyError(null);
            console.log('PTY connected successfully');
          }
          resolve(true);
        };

        socket.onclose = socket.onerror = () => {
          clearTimeout(connectTimeout);
          resolve(false);
        };

      } catch (error: any) {
        console.error('PTY connection failed:', error);
        if (mounted.current) {
          setPtyError(error.message || 'Connection failed');
        }
        resolve(false);
      }
    });
  }, [labId]);

  // Stable reference for connection attempts
  const attemptConnectionsRef = useRef<(() => Promise<void>) | null>(null);

  const attemptConnections = useCallback(async () => {
    if (!mounted.current || !fsActive || !ptyActive) return;

    console.log('Attempting connections to FS and PTY...');

    // Reset retry counters
    fsRetries.current = 0;
    ptyRetries.current = 0;

    // Attempt FS connection with retries
    const retryFS = async (): Promise<boolean> => {
      if (!mounted.current || fsConnected || shouldStopRetrying) return fsConnected;
      
      for (let i = 0; i < maxRetries; i++) {
        if (!mounted.current || shouldStopRetrying) return fsConnected;
        
        fsRetries.current = i + 1;
        const success = await connectToFS();
        
        if (success) return true;
        
        if (i < maxRetries - 1) {
          console.log(`FS connection attempt ${i + 1}/${maxRetries} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      if (mounted.current) {
        setFsError(`Failed to connect after ${maxRetries} attempts`);
      }
      return false;
    };

    // Attempt PTY connection with retries
    const retryPTY = async (): Promise<boolean> => {
      if (!mounted.current || ptyConnected || shouldStopRetrying) return ptyConnected;
      
      for (let i = 0; i < maxRetries; i++) {
        if (!mounted.current || shouldStopRetrying) return ptyConnected;
        
        ptyRetries.current = i + 1;
        const success = await connectToPTY();
        
        if (success) return true;
        
        if (i < maxRetries - 1) {
          console.log(`PTY connection attempt ${i + 1}/${maxRetries} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      if (mounted.current) {
        setPtyError(`Failed to connect after ${maxRetries} attempts`);
      }
      return false;
    };

    // Run both connection attempts in parallel
    const [fsSuccess, ptySuccess] = await Promise.all([retryFS(), retryPTY()]);

    if (mounted.current && fsSuccess && ptySuccess) {
      console.log('All connections established successfully');
    }
  }, [connectToFS, connectToPTY, maxRetries, retryDelay, fsActive, ptyActive]); // Removed fsConnected and ptyConnected from dependencies

  // Update the ref when callback changes
  attemptConnectionsRef.current = attemptConnections;

  // Attempt connections when both services become active
  useEffect(() => {
    if (fsActive && ptyActive && !connectionAttempted.current) {
      connectionAttempted.current = true;
      // Immediate connection attempt - no artificial delay
      attemptConnectionsRef.current?.();
    }
  }, [fsActive, ptyActive]); // Removed attemptConnections from dependencies to prevent re-running

  useEffect(() => {
    mounted.current = true;
    
    return () => {
      mounted.current = false;
      // Cleanup connections
      fsSocket.disconnect();
      if (ptySocket.current) {
        ptySocket.current.close();
        ptySocket.current = null;
      }
    };
  }, []);

  // Check if both services are ready
  // If connections are successful, consider it ready regardless of progress log status
  const isReady = fsConnected && ptyConnected;
  
  // Stop retrying once connections are established
  const shouldStopRetrying = fsConnected && ptyConnected;
  
  // Debug logging
  console.log('useSimpleConnections FINAL STATE:', {
    fsConnected,
    ptyConnected,
    isReady,
    fsActive,
    ptyActive,
    shouldStopRetrying
  });

  return {
    // Connection states
    fsConnected,
    ptyConnected,
    fsError,
    ptyError,
    isReady,
    
    // Service states
    fsActive,
    ptyActive,
    bothServicesActive: fsActive && ptyActive,
    
    // Retry info
    fsRetries: fsRetries.current,
    ptyRetries: ptyRetries.current,
    maxRetries,
    
    // Manual retry function
    retryConnections: attemptConnections,
  };
}
