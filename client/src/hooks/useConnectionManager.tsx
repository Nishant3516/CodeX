import { useState, useCallback } from 'react';

interface ProjectStartParams {
  labId: string;
  language?: string;
  service?: string;
}

interface ConnectionCheckResult {
  available: boolean;
  error?: string;
  sslError?: boolean;
}

interface UseConnectionManagerOptions {
  labId: string;
  language?: string;
  onServiceAvailable?: () => void;
  onServiceUnavailable?: () => void;
}

export function useConnectionManager({
  labId,
  language,
  onServiceAvailable,
  onServiceUnavailable
}: UseConnectionManagerOptions) {
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [startAttempted, setStartAttempted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);

  const startProject = useCallback(async (): Promise<boolean> => {
    if (startAttempted) {
      return false; // Already attempted
    }

    setStartAttempted(true);
    setIsStartingProject(true);
    setError(null);
    setLoadingMessage('Starting your development environment...');

    try {
      const requestBody: any = { labId };
      if (language) {
        requestBody.language = language;
      }

      const response = await fetch('/api/project/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setLoadingMessage('Development environment ready! Refreshing page...');

        // Auto-refresh the page after successful project start
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 8000);

        return true;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Failed to start project: ${errorMessage}`);
      }
    } catch (apiError: any) {
      console.error('Error starting project:', apiError);

      // Provide user-friendly error messages
      let userFriendlyMessage = 'Unable to start development environment. ';

      if (apiError.message?.includes('language is required')) {
        userFriendlyMessage += 'Please ensure the project language is properly configured.';
      } else if (apiError.message?.includes('network') || apiError.message?.includes('fetch')) {
        userFriendlyMessage += 'Please check your internet connection and try again.';
      } else if (apiError.message?.includes('400')) {
        userFriendlyMessage += 'Invalid project configuration. Please contact support if this persists.';
      } else if (apiError.message?.includes('500')) {
        userFriendlyMessage += 'Server error occurred. Please try again in a few moments.';
      } else {
        userFriendlyMessage += 'Please try refreshing the page or contact support if this persists.';
      }

      setError(userFriendlyMessage);
      setIsStartingProject(false);
      setStartAttempted(false); // Allow retry on error
      return false;
    }
  }, [labId, language, startAttempted]);

  const checkServiceAvailability = useCallback(async (
    serviceUrl: string,
    serviceName: string
  ): Promise<ConnectionCheckResult> => {
    setConnectionStartTime(Date.now());
    setShowTips(false);

    // Show tips after 15 seconds
    const tipsTimeout = setTimeout(() => {
      setShowTips(true);
    }, 15000);

    try {
      setLoadingMessage(`Connecting to ${serviceName}...`);

      // Direct WebSocket availability check
      const result = await new Promise<ConnectionCheckResult>((resolve) => {
        const testSocket = new WebSocket(serviceUrl);
        const timeout = setTimeout(() => {
          testSocket.close();
          resolve({ available: false, error: 'Connection timeout' });
        }, 3000);

        testSocket.onopen = () => {
          clearTimeout(timeout);
          testSocket.close();
          resolve({ available: true });
        };

        testSocket.onerror = (error) => {
          clearTimeout(timeout);
          const wsError = error as any;
          if (wsError.target && wsError.target.url) {
            const errorUrl = wsError.target.url;
            if (errorUrl.startsWith('wss:') && (testSocket.readyState === WebSocket.CLOSED || testSocket.readyState === WebSocket.CLOSING)) {
              resolve({ available: false, sslError: true, error: 'SSL certificate error' });
            }
          }
          resolve({ available: false, error: 'Connection failed' });
        };

        testSocket.onclose = (event) => {
          clearTimeout(timeout);
          if (event.code === 1000) {
            resolve({ available: true });
          } else {
            resolve({ available: false, error: `Connection closed with code ${event.code}` });
          }
        };
      });

      clearTimeout(tipsTimeout);
      setShowTips(false);
      setConnectionStartTime(null);

      if (result.available) {
        setLoadingMessage('');
        onServiceAvailable?.();
        return result;
      } else if (result.sslError) {
        setError('SSL certificate verification failed. Please check your SSL configuration.');
        return result;
      } else {
        // Service not available - try to start it
        const started = await startProject();
        if (started) {
          // Wait a bit for the service to start up
          setLoadingMessage('Waiting for services to start...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          onServiceUnavailable?.();
          return { available: false, error: 'Service starting up' };
        } else {
          return result;
        }
      }
    } catch (error: any) {
      clearTimeout(tipsTimeout);
      setShowTips(false);
      setConnectionStartTime(null);

      if (error.message === 'SSL_CERTIFICATE_ERROR') {
        setError('SSL certificate verification failed. Please check your SSL configuration.');
        return { available: false, sslError: true, error: error.message };
      }
      return { available: false, error: error.message };
    }
  }, [startProject, onServiceAvailable, onServiceUnavailable]);

  const getLoadingTips = useCallback(() => {
    const tips = [
      '⚡ During peak hours, loading times may be longer due to high demand',
      '⏱️ The development environment is being prepared just for you',
      '🔧 Setting up your personalized workspace...',
      '📦 Installing necessary tools and dependencies...'
    ];

    // Return different tips based on how long it's been
    const elapsed = connectionStartTime ? Date.now() - connectionStartTime : 0;
    if (elapsed > 30000) {
      return tips.slice(0, 2); // Show first 2 tips after 30 seconds
    } else if (elapsed > 45000) {
      return tips.slice(0, 3); // Show first 3 tips after 45 seconds
    } else if (elapsed > 60000) {
      return tips; // Show all tips after 60 seconds
    }

    return [tips[0]]; // Show first tip initially
  }, [connectionStartTime]);

  return {
    checkServiceAvailability,
    isStartingProject,
    startAttempted,
    loadingMessage,
    error,
    showTips,
    getLoadingTips,
    setLoadingMessage,
    setError
  };
}
