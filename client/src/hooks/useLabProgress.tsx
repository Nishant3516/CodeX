import { useState, useEffect, useCallback, useRef } from 'react';

interface LabProgressEntry {
  Timestamp: number;
  Status: string;
  Message: string;
  ServiceName: string;
}

interface LabProgressData {
  exists: boolean;
  labId: string;
  status: string;
  lastUpdated: number;
  createdAt: number;
  progressLogs: LabProgressEntry[];
  language: string;
}

interface UseLabProgressOptions {
  labId: string;
  language: string;
  onActive?: () => void;
  pollingInterval?: number;
  maxRetries?: number;
  stopWhenReady?: boolean; // New option to stop polling when connections are ready
}

export function useLabProgress({
  labId,
  language,
  onActive,
  pollingInterval = 2000, // Reduced from 3 seconds to 2 seconds for faster response
  maxRetries = 8, // Reduced from 10 to 8
  stopWhenReady = false
}: UseLabProgressOptions) {
  const [data, setData] = useState<LabProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const retryCount = useRef(0);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);
  const isStartingProject = useRef(false);
  const apiCallCount = useRef(0); // Track API calls

  const startProject = useCallback(async (): Promise<boolean> => {
    if (isStartingProject.current) return false;
    
    try {
      isStartingProject.current = true;
      apiCallCount.current++;
      console.log(`API Call ${apiCallCount.current}: Starting project for labId: ${labId}`);
      
      const response = await fetch('/api/project/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, language }),
      });

      if (response.ok || response.status === 409) {
        // 409 means already exists, which is fine
        return true;
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    } catch (err: any) {
      console.error('Failed to start project:', err);
      setError(`Failed to start project: ${err.message}`);
      return false;
    } finally {
      isStartingProject.current = false;
    }
  }, [labId, language]);

  const fetchProgress = useCallback(async (): Promise<LabProgressData | null> => {
    try {
      apiCallCount.current++;
      console.log(`API Call ${apiCallCount.current}: Fetching progress for labId: ${labId}`);
      
      const response = await fetch(`/api/project/progress/${labId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Lab doesn't exist
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (err: any) {
      console.error('Failed to fetch progress:', err);
      throw err;
    }
  }, [labId]);

  // Stable stopPolling function that doesn't change
  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(async () => {
    if (isPolling || !mounted.current) return;
    
    setIsPolling(true);
    setError(null);
    retryCount.current = 0;

    const poll = async () => {
      if (!mounted.current) {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
        setIsPolling(false);
        return;
      }

      try {
        const progressData = await fetchProgress();
        
        if (!progressData) {
          // Lab doesn't exist, try to start it
          if (retryCount.current === 0) {
            setLoading(true);
            setError(null);
            const started = await startProject();
            if (!started) {
              if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
              }
              setIsPolling(false);
              return;
            }
          }
          
          retryCount.current++;
          if (retryCount.current >= maxRetries) {
            setError('Timeout: Lab failed to start within expected time');
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
            setIsPolling(false);
            return;
          }
          return; // Continue polling
        }

        // Lab exists, update data
        setData(progressData);
        setLoading(false);
        setError(null);

        // Check if lab is active
        if (progressData.status === 'active') {
          // Check if both FS and PTY services are active
          const fsActive = progressData.progressLogs.some(
            log => log.ServiceName === 'file_system' && log.Status === 'active'
          );
          const ptyActive = progressData.progressLogs.some(
            log => log.ServiceName === 'pty' && log.Status === 'active'
          );

          console.log('useLabProgress debug:', {
            status: progressData.status,
            progressLogs: progressData.progressLogs,
            fsActive,
            ptyActive
          });

          if (fsActive && ptyActive) {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
            setIsPolling(false);
            onActive?.();
            return;
          }
        }

        // Continue polling if not active
        retryCount.current++;
        if (retryCount.current >= maxRetries) {
          setError('Timeout: Services did not become active within expected time');
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
          }
          setIsPolling(false);
        }

      } catch (err: any) {
        console.error('Polling error:', err);
        retryCount.current++;
        
        if (retryCount.current >= maxRetries) {
          setError(`Failed to get lab status: ${err.message}`);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
          }
          setIsPolling(false);
        }
      }
    };

    // Initial poll
    await poll();

    // Set up interval polling only if still mounted and polling
    if (mounted.current && pollInterval.current === null && retryCount.current < maxRetries) {
      pollInterval.current = setInterval(poll, pollingInterval);
    }
  }, [fetchProgress, startProject, maxRetries, pollingInterval, onActive]); // Removed stopPolling from dependencies

  // Start polling when component mounts
  useEffect(() => {
    mounted.current = true;
    
    // Only start polling once
    if (!isPolling) {
      startPolling();
    }

    return () => {
      mounted.current = false;
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      setIsPolling(false);
    };
  }, [labId, language]); // Only depend on labId and language to avoid re-running

  return {
    data,
    loading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    progressLogs: data?.progressLogs || [],
    status: data?.status || 'unknown',
    fsActive: data?.progressLogs.some(log => log.ServiceName === 'file_system' && log.Status === 'active') || false,
    ptyActive: data?.progressLogs.some(log => log.ServiceName === 'pty' && log.Status === 'active') || false,
    apiCallCount: apiCallCount.current, // Debug info
  };
}
