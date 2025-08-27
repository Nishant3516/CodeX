"use client";
import { useEffect, useState, useRef } from 'react';
import { buildPtyUrl } from '@/lib/pty';

export function usePtyConnection(labId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [provisionNeeded, setProvisionNeeded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

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
    if (!labId) {
      setIsConnected(false);
      setError(undefined);
      setIsConnecting(false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 30;
    const baseDelay = 2000;

    const connect = () => {
      if (!mountedRef.current) return;
      
      setIsConnecting(true);
      setError(undefined);

      const url = buildPtyUrl(labId);
      if (!url) {
        setError('Invalid lab ID');
        setIsConnecting(false);
        return;
      }

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
          retryCount = 0;
        };

        socket.onclose = () => {
          if (!mountedRef.current) return;
          clearTimeout(connectTimeout);
          if (isConnected) {
            setIsConnected(false);
            handleRetry('Connection lost');
          } else {
            handleRetry('Failed to connect');
          }
        };

        socket.onerror = () => {
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

      if (retryCount >= maxRetries) {
        setError(`Max retries exceeded. ${errorMsg}`);
        return;
      }

      retryCount++;
      const delay = Math.min(baseDelay * Math.pow(1.5, retryCount - 1), 30000);
      setError(`${errorMsg}. Retrying in ${Math.ceil(delay / 1000)}s... (${retryCount}/${maxRetries})`);
      
      retryTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    connect();

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

  return { isConnected, error, isConnecting, provisionNeeded };
}

