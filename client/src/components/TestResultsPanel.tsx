import React, { FC } from 'react';
import { 
  BeakerIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border border-red-300 dark:border-red-800 rounded-xl shadow-sm"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100 text-lg">Test Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300">Something went wrong</p>
          </div>
        </div>
        <p className="text-red-800 dark:text-red-200 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg text-sm">
          {error}
        </p>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/20 border border-blue-300 dark:border-blue-800 rounded-xl shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <BeakerIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </motion.div>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">Running Tests</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">Please wait while we validate your code...</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300">
            <span>Progress</span>
            <span className="font-mono">Processing...</span>
          </div>
          <div className="relative w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-2 overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "70%", "30%", "90%", "50%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  if (!testResults) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <BeakerIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Ready to Test</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">No tests have been run yet</p>
          </div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-100/50 dark:bg-gray-800/50 p-3 rounded-lg">
          Click the <span className="font-semibold text-purple-600 dark:text-purple-400">Test</span> button above to validate your checkpoint implementation.
        </p>
      </div>
    );
  }

  const { status, tests, summary, duration } = testResults;
  
  const statusConfig = {
    running: {
      icon: BeakerIcon,
      title: 'Running Tests',
      color: 'blue',
      gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/20',
      border: 'border-blue-300 dark:border-blue-800',
    },
    passed: {
      icon: CheckCircleIcon,
      title: 'All Tests Passed',
      color: 'green',
      gradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/20',
      border: 'border-green-300 dark:border-green-800',
    },
    failed: {
      icon: XCircleIcon,
      title: 'Some Tests Failed',
      color: 'red',
      gradient: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/20',
      border: 'border-red-300 dark:border-red-800',
    },
    error: {
      icon: ExclamationTriangleIcon,
      title: 'Test Errors',
      color: 'yellow',
      gradient: 'from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-900/20',
      border: 'border-yellow-300 dark:border-yellow-800',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 bg-gradient-to-br ${statusConfig.gradient} border ${statusConfig.border} rounded-xl shadow-sm`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-${statusConfig.color}-500/10 rounded-lg`}>
            <StatusIcon className={`w-6 h-6 text-${statusConfig.color}-600 dark:text-${statusConfig.color}-400`} />
          </div>
          <div>
            <h3 className={`font-semibold text-${statusConfig.color}-900 dark:text-${statusConfig.color}-100 text-lg`}>
              {statusConfig.title}
            </h3>
            <p className={`text-sm text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
              Checkpoint {testResults.checkpointId}
            </p>
          </div>
        </div>
        {duration && (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm font-mono">{duration}ms</span>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <ChartBarIcon className="w-5 h-5 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalTests}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total</div>
        </div>
        <div className="bg-green-50/70 dark:bg-green-900/30 backdrop-blur-sm p-3 rounded-lg border border-green-200 dark:border-green-700 text-center">
          <CheckCircleIcon className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.passedTests}</div>
          <div className="text-xs text-green-600 dark:text-green-300 font-medium">Passed</div>
        </div>
        <div className="bg-red-50/70 dark:bg-red-900/30 backdrop-blur-sm p-3 rounded-lg border border-red-200 dark:border-red-700 text-center">
          <XCircleIcon className="w-5 h-5 mx-auto mb-1 text-red-600 dark:text-red-400" />
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.failedTests}</div>
          <div className="text-xs text-red-600 dark:text-red-300 font-medium">Failed</div>
        </div>
        <div className="bg-yellow-50/70 dark:bg-yellow-900/30 backdrop-blur-sm p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 text-center">
          <ExclamationTriangleIcon className="w-5 h-5 mx-auto mb-1 text-yellow-600 dark:text-yellow-400" />
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.errorTests}</div>
          <div className="text-xs text-yellow-600 dark:text-yellow-300 font-medium">Errors</div>
        </div>
      </div>

      {/* Individual Test Results */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700"></div>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Test Details</span>
          <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700"></div>
        </div>
        <AnimatePresence>
          {tests.map((test, index) => (
            <motion.div
              key={test.testId || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border backdrop-blur-sm ${
                test.passed
                  ? 'bg-green-50/70 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                  : 'bg-red-50/70 dark:bg-red-900/30 border-red-200 dark:border-red-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  {test.passed ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${
                      test.passed
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {test.testId || `Test ${index + 1}`}
                    </p>
                    <p className={`text-sm mt-1 ${
                      test.passed
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {test.message}
                    </p>
                  </div>
                </div>
                {test.duration && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono">{test.duration}ms</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TestResultsPanel;