import React, { FC } from 'react';

export interface TestResult {
  testId: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export interface TestResultsData {
  checkpointId: string;
  status: 'running' | 'passed' | 'failed' | 'error';
  tests: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    errorTests: number;
  };
  startTime?: string;
  endTime?: string;
  duration?: number;
}

type TestResultsPanelProps = {
  testResults: TestResultsData | null;
  isLoading: boolean;
  error: string | null;
};

const TestResultsPanel: FC<TestResultsPanelProps> = ({ testResults, isLoading, error }) => {
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <span className="text-lg">❌</span>
          <span className="font-medium">Test Error</span>
        </div>
        <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
          <span className="text-lg animate-spin">⏳</span>
          <span className="font-medium">Running Tests...</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <span className="text-sm text-blue-600 dark:text-blue-400">60%</span>
        </div>
      </div>
    );
  }

  if (!testResults) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-400">
          <span className="text-lg">🧪</span>
          <span className="font-medium">Test Results</span>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Click the "Test" button to run tests for the current checkpoint.
        </p>
      </div>
    );
  }

  const { status, tests, summary, duration } = testResults;
  const statusIcon = {
    running: '⏳',
    passed: '✅',
    failed: '❌',
    error: '⚠️'
  }[status];

  const statusColor = {
    running: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    passed: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    failed: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    error: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
  }[status];

  return (
    <div className={`p-4 border rounded-lg ${statusColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusIcon}</span>
          <span className="font-medium">Test Results</span>
        </div>
        {duration && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {duration}ms
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-4 text-center">
        <div className="bg-white dark:bg-gray-800 p-2 rounded border">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalTests}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.passedTests}</div>
          <div className="text-sm text-green-600 dark:text-green-300">Passed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.failedTests}</div>
          <div className="text-sm text-red-600 dark:text-red-300">Failed</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.errorTests}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-300">Errors</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tests.map((test, index) => (
          <div
            key={test.testId || index}
            className={`p-3 rounded border ${
              test.passed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{test.passed ? '✅' : '❌'}</span>
                <span className="font-medium">{test.testId || `Test ${index + 1}`}</span>
              </div>
              {test.duration && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {test.duration}ms
                </span>
              )}
            </div>
            <p className={`mt-1 text-sm ${
              test.passed
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {test.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestResultsPanel;