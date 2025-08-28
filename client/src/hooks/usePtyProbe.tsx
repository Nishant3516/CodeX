"use client";
import { useEffect, useState, useRef } from 'react';
import { buildPtyUrl } from '@/lib/pty';
import { useConnectionManager } from './useConnectionManager';

export function usePtyConnection(labId?: string, language?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [provisionNeeded, setProvisionNeeded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  // Initialize connection manager outside useEffect
  const connectionManager = labId ? useConnectionManager({
    labId: labId,
    language,
    onServiceAvailable: () => {
      console.log('Terminal service is now available');
    },
    onServiceUnavailable: () => {
      console.log('Terminal service is starting up...');
    }
  }) : null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!labId || !connectionManager) {
      setIsConnected(false);
      setError(undefined);
      setIsConnecting(false);
      return;
    }

    const url = buildPtyUrl(labId);
    if (!url) {
      setError('Invalid lab ID');
      setIsConnecting(false);
      return;
    }

    const initializeConnection = async () => {
      console.log("Connecting to terminal...");

      // Check service availability using centralized connection manager
      const result = await connectionManager.checkServiceAvailability(url, 'terminal');

      if (!result.available) {
        if (connectionManager.startAttempted) {
          // Service is starting up, wait a bit more
          setError('Terminal is starting up...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Increased from 3 to 5 seconds
          return;
        }

        setError('Terminal service unavailable - please try refreshing the page');
        setIsConnected(false);
        setIsConnecting(false);
        return;
      }

      // Service is available, now connect WebSocket
      connectWebSocket(url);
    };

    const connectWebSocket = (url: string) => {
      if (!mountedRef.current) return;

      setIsConnecting(true);
      setError(undefined);

      try {
        const socket = new WebSocket(url);
        socketRef.current = socket;

        const connectTimeout = setTimeout(() => {
          socket.close();
          handleRetry('Connection timeout');
        }, 10000);

        socket.onopen = () => {
          if (!mountedRef.current) return;
          clearTimeout(connectTimeout);
          setIsConnected(true);
          setError(undefined);
          setIsConnecting(false);
        };

        socket.onclose = (event) => {
          if (!mountedRef.current) return;
          clearTimeout(connectTimeout);
          if (isConnected) {
            setIsConnected(false);
            handleRetry('Connection lost');
          } else {
            handleRetry('Failed to connect');
          }
        };

        socket.onerror = (event) => {
          if (!mountedRef.current) return;
          clearTimeout(connectTimeout);
          handleRetry('Connection error');
        };

      } catch (err) {
        handleRetry(`Connection failed: ${err}`);
      }
    };

    const handleRetry = (errorMsg: string) => {
      if (!mountedRef.current) return;

      setIsConnected(false);
      setIsConnecting(false);

      // If 404-like error, mark provisioning needed and stop retrying
      if (/\b404\b|not\s*found/i.test(errorMsg)) {
        console.warn('PTY indicates missing project (404). Marking for provisioning.');
        setProvisionNeeded(true);
        setError('Workspace missing - provisioning required');
        // close socket and stop further retries
        try { if (socketRef.current) socketRef.current.close(); } catch (_) {}
        return;
      }

      // Improved retry logic for other errors
      const maxRetries = 8; // Increased from 5 to 8
      let retryCount = 0;

      const retry = () => {
        if (!mountedRef.current || retryCount >= maxRetries) {
          setError(`Max retries exceeded. ${errorMsg}`);
          return;
        }

        retryCount++;
        const baseDelay = 4000; // Increased from 3 to 4 seconds
        const delay = baseDelay + (retryCount * 1000); // Progressive delay
        setError(`${errorMsg}. Retrying in ${Math.ceil(delay / 1000)}s... (${retryCount}/${maxRetries})`);

        retryTimeoutRef.current = window.setTimeout(() => {
          const url = buildPtyUrl(labId!);
          if (url) connectWebSocket(url);
        }, delay);
      };

      retry();
    };

    initializeConnection();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [labId]);

  return {
    isConnected,
    error,
    isConnecting,
    provisionNeeded,
    showTips: connectionManager?.showTips || false,
    getLoadingTips: connectionManager?.getLoadingTips || (() => [])
  };
}

