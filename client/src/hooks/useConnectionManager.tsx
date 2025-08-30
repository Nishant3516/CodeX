import { useState, useCallback } from 'react';

interface ProjectStartParams {
  labId: string;
  language?: string;
  service?: string;
}

interface ConnectionCheckResult {
  available: boolean;
  error?: string;
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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3; // Increased from implicit 1 to 3 retries

  const startProject = useCallback(async (): Promise<boolean> => {
    if (startAttempted && retryCount >= maxRetries) {
      return false; // Already attempted max retries
    }

    setStartAttempted(true);
    setIsStartingProject(true);
    setError(null);

    const attemptNumber = retryCount + 1;
    const messages = [
      '🚀 Initializing your development environment...',
      '🔧 Setting up your personalized workspace...',
      '⚡ Preparing your coding environment...',
      '📦 Installing necessary tools and dependencies...'
    ];

    setLoadingMessage(messages[Math.min(attemptNumber - 1, messages.length - 1)]);

    try {
      const requestBody: any = { labId };
      if (language) {
        requestBody.language = language;
      }

      // Increase timeout for initial requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds instead of default

      const response = await fetch('/api/project/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setLoadingMessage('🎉 Development environment ready! Refreshing page...');
        setRetryCount(0); // Reset retry count on success

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

        // Check if project already exists (don't retry in that case)
        if (response.status === 409 || errorMessage.includes('already exists')) {
          setError('Project already exists and is ready to use!');
          setLoadingMessage('');
          setRetryCount(0);
          return true; // Consider this a success
        }

        throw new Error(`Failed to start project: ${errorMessage}`);
      }
    } catch (apiError: any) {
      console.error('Error starting project:', apiError);

      setRetryCount(prev => prev + 1);

      // Provide user-friendly error messages
      let userFriendlyMessage = 'Unable to start development environment. ';

      if (apiError.name === 'AbortError') {
        userFriendlyMessage = `Request timed out. ${retryCount < maxRetries - 1 ? 'Retrying...' : 'Please try again later.'}`;
      } else if (apiError.message?.includes('language is required')) {
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

      // If we haven't exceeded max retries, show retry message
      if (retryCount < maxRetries - 1) {
        userFriendlyMessage += ` (Attempt ${attemptNumber}/${maxRetries})`;
        setLoadingMessage(`Retrying in a few seconds... (${retryCount}/${maxRetries})`);
        
        // Auto-retry after a delay
        setTimeout(() => {
          setStartAttempted(false);
          setIsStartingProject(false);
        }, 5000);
      } else {
        setError(userFriendlyMessage);
        setIsStartingProject(false);
      }

      return false;
    }
  }, [labId, language, startAttempted, retryCount, maxRetries]);

  const checkServiceAvailability = useCallback(async (
    serviceUrl: string,
    serviceName: string
  ): Promise<ConnectionCheckResult> => {
    setConnectionStartTime(Date.now());
    setShowTips(false);

    // Show tips after 20 seconds (increased from 15)
    const tipsTimeout = setTimeout(() => {
      setShowTips(true);
    }, 20000);

    try {
      // First check if lab exists in Redis and get progress
      const progressResponse = await fetch(`/api/project/progress/${labId}`);
      const progressData = await progressResponse.json();

      if (progressData.exists) {
        // Lab exists, show progress instead of polling WebSocket
        const currentStatus = progressData.status;
        const progressLogs = progressData.progressLogs || [];

        // Show latest progress message
        const latestLog = progressLogs[progressLogs.length - 1];
        if (latestLog) {
          setLoadingMessage(`${latestLog.ServiceName}: ${latestLog.Message}`);
        } else {
          setLoadingMessage(`Lab status: ${currentStatus}`);
        }

        // If lab is active, consider it available
        if (currentStatus === 'active') {
          clearTimeout(tipsTimeout);
          setShowTips(false);
          setConnectionStartTime(null);
          setLoadingMessage(`✅ ${serviceName} is ready!`);
          onServiceAvailable?.();
          return { available: true };
        }

        // If lab is still booting, wait and check again
        if (currentStatus === 'booting') {
          setLoadingMessage('⏳ Services are starting up...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return { available: false, error: 'Services are starting up...' };
        }

        // For other statuses, try to start if not already attempted
        if (!startAttempted) {
          const started = await startProject();
          if (started) {
            setLoadingMessage('⏱️ Services are starting up...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            onServiceUnavailable?.();
            return { available: false, error: 'Services are starting up...' };
          }
        }

        return { available: false, error: `Lab status: ${currentStatus}` };
      } else {
        // Lab doesn't exist, try to start it
        const started = await startProject();
        if (started) {
          setLoadingMessage('⏱️ Services are starting up...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          onServiceUnavailable?.();
          return { available: false, error: 'Services are starting up...' };
        } else {
          return { available: false, error: 'Failed to start lab' };
        }
      }
    } catch (error: any) {
      clearTimeout(tipsTimeout);
      setShowTips(false);
      setConnectionStartTime(null);

      return { available: false, error: error.message };
    }
  }, [startProject, onServiceAvailable, onServiceUnavailable, labId, startAttempted]);

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
