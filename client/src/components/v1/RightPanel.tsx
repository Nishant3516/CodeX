'use client';

import React from 'react';
import { 
  EyeIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import { PreviewPanel } from '@/components/editor/PreviewPanel';
import TerminalComponent from '@/components/editor/Terminal';

// Normalized error shape coming from test runner responses
type NormalizedTestError = {
  scenario?: string;
  expected?: string;
  received?: string;
  hint?: string;
  message?: string;
};

// Legacy error shape (server may still send capitalized keys)
type LegacyTestError = {
  Scenario?: string;
  Expected?: string;
  Received?: string;
  Hint?: string;
  Message?: string;
};

// Test result shape used throughout the RightPanel
export type CheckpointTestResult = {
  checkpoint?: string;
  passed?: boolean;
  status?: string;
  durationMs?: number;
  DurationMs?: number; // backward compatibility
  output?: string;
  error?: NormalizedTestError | LegacyTestError | null;
  Error?: LegacyTestError | null; // legacy field
};

// Type guards for error payloads
function isNormalizedError(e: NormalizedTestError | LegacyTestError | undefined | null): e is NormalizedTestError {
  return !!e && (
    'scenario' in e || 'expected' in e || 'received' in e || 'hint' in e || 'message' in e
  );
}

function isLegacyError(e: NormalizedTestError | LegacyTestError | undefined | null): e is LegacyTestError {
  return !!e && (
    'Scenario' in e || 'Expected' in e || 'Received' in e || 'Hint' in e || 'Message' in e
  );
}

interface RightPanelProps {
  activeTab: 'preview' | 'instructions' | 'test-results';
  onTabChange: (tab: 'preview' | 'instructions' | 'test-results') => void;
  // Props for preview
  htmlContent?: string;
  cssContent?: string;
  jsContent?: string;
  language?: string;
  labId?: string;
  startCommands?: string[];
  previewReloadNonce?: number;
  // Quest metadata
  questMetadata?: {
    success: boolean;
    quest: {
      id: string;
      name: string;
      description: string;
      difficulty: string;
      category: string;
      tech_stack: string[];
      topics: string[];
      checkpoints: number;
      requirements: string[];
    };
    projectSlug: string;
    metadata: {
      name: string;
      description: string;
      difficulty: string;
      category: string;
      techStack: string[];
      topics: string[];
      checkpoints: number;
      requirements: string[];
    };
  } | null;
  loadingQuestData?: boolean;
  // Dynamic checkpoint and test data
  checkpoints?: any[];
  testResults?: CheckpointTestResult[];
  loadingTestResults?: boolean;
  isRunningTests?: boolean;
  currentTestingCheckpoint?: string | null;
  activeCheckpoint?: number | null;
  // Props for terminal
  params?: {
    language: string;
    labId: string;
  };
  onTerminalReady?: (terminal: any) => void;
  isConnected?: boolean;
  connectionError?: string | null;
  onRetry?: () => void;
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

// Separate component for checkpoint to avoid hooks order issues
interface CheckpointComponentProps {
  checkpoint: any;
  index: number;
  testResults?: any;
  isRunningTests?: boolean;
  // When rendering in instructions view (no test result objects yet)
  hideTestDetails?: boolean;
  isFirstIncomplete?: boolean; // helps decide default expansion when no test results
}

const CheckpointComponent: React.FC<CheckpointComponentProps> = ({ 
  checkpoint, 
  index, 
  testResults, 
  isRunningTests,
  hideTestDetails = false,
  isFirstIncomplete = false
}) => {
  // Derive status differently depending on whether we have test results
  const rawTestResult = testResults?.[checkpoint.id] || testResults?.[`${index + 1}`];
  const derivedStatusFromTests = rawTestResult?.status || (rawTestResult?.passed ? 'passed' : rawTestResult ? 'failed' : 'pending');
  const status = hideTestDetails ? (checkpoint.status || 'pending') : derivedStatusFromTests;
  const isCurrentlyTesting = !hideTestDetails && isRunningTests && !rawTestResult;

  // Expansion logic
  const shouldExpandByDefault = hideTestDetails
    ? (checkpoint.status === 'in-progress') || (isFirstIncomplete && checkpoint.status !== 'completed')
    : (isCurrentlyTesting || status === 'failed' || (status === 'pending' && index === 0));

  const [isExpanded, setIsExpanded] = React.useState(shouldExpandByDefault);

  React.useEffect(() => {
    if (shouldExpandByDefault) setIsExpanded(true);
  }, [shouldExpandByDefault]);

  // Dynamic height for smooth expand/collapse without clipping long requirement lists
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = React.useState<number>(0);
  React.useLayoutEffect(() => {
    if (isExpanded && contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    } else if (!isExpanded) {
      setMeasuredHeight(0);
    }
  }, [isExpanded, checkpoint.requirements, rawTestResult, hideTestDetails]);

  return (
    <div key={checkpoint.id || index} className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 border-2 ${
      isCurrentlyTesting ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 scale-105' : 
      (status === 'passed' || status === "completed") ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' :
      status === 'failed' ? 'border-red-300 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20' :
      'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      
      {/* Checkpoint Header - Always Visible */}
      <div 
        className="p-6 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
            isCurrentlyTesting ? 'bg-gradient-to-br from-blue-500 to-indigo-500 animate-pulse' :
            (status === 'passed' || status === "completed") ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
            status === 'failed' ? 'bg-gradient-to-br from-red-500 to-rose-500' :
            'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}>
            {isCurrentlyTesting ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (status === 'passed' || status === "completed") ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : status === 'failed' ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="text-white text-xl font-bold">{index + 1}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {checkpoint.title || `Checkpoint ${index + 1}`}
              </h4>
              <div className="flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all ${
                  isCurrentlyTesting ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse' :
                  (status === 'passed' || status === "completed") ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {isCurrentlyTesting ? 'Testing...' : status}
                </span>
                <svg className={`w-6 h-6 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
              {checkpoint.description || 'Test checkpoint validation'}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      <div 
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
        style={{ maxHeight: isExpanded ? measuredHeight : 0 }}
      >
        <div ref={contentRef} className="p-6 space-y-6">
          {/* Requirements */}
          {checkpoint.requirements && checkpoint.requirements.length > 0 && (
            <div>
              <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Requirements
              </h5>
              <div className="space-y-3">
                {checkpoint.requirements.map((req: string, reqIndex: number) => (
                  <div key={reqIndex} className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">{reqIndex + 1}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{req}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!hideTestDetails && rawTestResult && (
            <div className="space-y-4">
              <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Test Results
              </h5>
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border-l-4 ${
                status === 'passed' ? 'bg-green-50 dark:bg-green-900/20 border-green-400' :
                status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-400' :
                'bg-gray-50 dark:bg-gray-800/50 border-gray-400'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {status === 'passed' ? '✓ All Tests Passed' : '✗ Tests Failed'}
                  </span>
                  {rawTestResult.DurationMs && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {rawTestResult.DurationMs}ms
                    </span>
                  )}
                </div>
                
                {/* Success output */}
                {rawTestResult.passed && rawTestResult.output && (
                  <p className="text-gray-700 dark:text-gray-300">{rawTestResult.output}</p>
                )}
                
                {/* Error Details */}
                {!rawTestResult.passed && rawTestResult.Error && (
                  <div className="space-y-3 mt-3">
                    {rawTestResult.Error.Scenario && (
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Test Scenario</span>
                        <p className="text-gray-900 dark:text-gray-100 font-medium mt-1">{rawTestResult.Error.Scenario}</p>
                      </div>
                    )}
                    
                    {rawTestResult.Error.Message && (
                      <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">
                        <span className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">Error</span>
                        <p className="text-red-700 dark:text-red-200 mt-1">{rawTestResult.Error.Message}</p>
                      </div>
                    )}
                    
                    {rawTestResult.Error.Expected && rawTestResult.Error.Received && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <span className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide">Expected</span>
                          <pre className="text-sm text-green-700 dark:text-green-200 mt-1 whitespace-pre-wrap break-words">{rawTestResult.Error.Expected}</pre>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                          <span className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">Received</span>
                          <pre className="text-sm text-red-700 dark:text-red-200 mt-1 whitespace-pre-wrap break-words">{rawTestResult.Error.Received}</pre>
                        </div>
                      </div>
                    )}
                    
                    {rawTestResult.Error.Hint && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                          </svg>
                          Hint
                        </span>
                        <p className="text-blue-700 dark:text-blue-200 mt-1">{rawTestResult.Error.Hint}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Fallback error display for old format */}
                {!rawTestResult.passed && !rawTestResult.Error && rawTestResult.error && (
                  <pre className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded overflow-x-auto mt-3">
                    {rawTestResult.error}
                  </pre>
                )}
              </div>
            </div>
          )}
          {!hideTestDetails && isCurrentlyTesting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-600 dark:text-blue-400 font-medium">Running Tests...</span>
                <span className="text-gray-500 dark:text-gray-400">Please wait</span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-800/50 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse transition-all duration-1000" style={{ width: '65%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabContent = {
  preview: {
    title: 'Preview & Terminal',
    render: (props: RightPanelProps) => (
      <div className="h-full flex flex-col">
        {/* Preview Section */}
        <div className="flex-1 min-h-0">
          <PreviewPanel
            htmlContent={props.htmlContent || ''}
            cssContent={props.cssContent || ''}
            jsContent={props.jsContent || ''}
            params={props.params || { language: props.language || 'html', labId: props.labId || 'test' }}
            startCommands={props.startCommands}
          />
        </div>
        
        {/* Resizable Divider */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700 cursor-row-resize hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"></div>
        
        {/* Terminal Section */}
        <div className="h-80 min-h-[200px] bg-black">
          {props.params && (
            <TerminalComponent
              terminalId="main"
              labId={props.params.labId}
              isConnected={!!props.isConnected}
              connectionError={props.connectionError || null}
              onRetry={props.onRetry}
              onInput={props.onInput || (() => {})}
              onResize={props.onResize || (() => {})}
            />
          )}
        </div>
      </div>
    )
  },
  instructions: {
    title: 'Instructions',
    render: (props: RightPanelProps) => {

      const reversedTestResults = props.testResults?.toReversed()
      return (
      <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
        {props.loadingQuestData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading quest instructions...</p>
            </div>
          </div>
        ) : props.questMetadata ? (
          <div className="p-6 space-y-8">
            {/* Enhanced Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-2xl">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-200">Interactive Quest</span>
                    </div>
                    <h1 className="text-3xl font-bold mb-3 leading-tight">
                      {props.questMetadata.metadata?.name || 'Quest Instructions'}
                    </h1>
                    <p className="text-blue-100 text-lg leading-relaxed max-w-2xl">
                      {props.questMetadata.metadata?.description || 'Complete this step-by-step quest to master new skills'}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center min-w-[120px]">
                    <div className="text-2xl font-bold">{props.checkpoints?.length || 0}</div>
                    <div className="text-sm text-blue-100">Checkpoints</div>
                  </div>
                </div>

                {/* Enhanced Quest Stats */}
                <div className="flex flex-wrap gap-3 mt-6">
                  <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 text-sm border border-white/20">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="font-semibold">
                        {typeof props.questMetadata.metadata?.difficulty === 'string' 
                          ? props.questMetadata.metadata.difficulty 
                          : 'Beginner'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 text-sm border border-white/20">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                      </svg>
                      <span className="font-semibold">
                        {typeof props.questMetadata.metadata?.category === 'string' 
                          ? props.questMetadata.metadata.category 
                          : 'General'}
                      </span>
                    </div>
                  </div>
                  {/* Tech Stack Pills */}
                  {props.questMetadata.metadata?.techStack && Array.isArray(props.questMetadata.metadata.techStack) && 
                    props.questMetadata.metadata.techStack.slice(0, 3).map((tech, index) => (
                      <div key={index} className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 text-sm border border-white/20">
                        <span className="font-semibold">{typeof tech === 'string' ? tech : (tech as any)?.name || String(tech)}</span>
                      </div>
                    ))
                  }
                  {props.questMetadata.metadata?.techStack?.length > 3 && (
                    <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 text-sm border border-white/20">
                      <span className="font-semibold">+{props.questMetadata.metadata.techStack.length - 3} more</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            </div>

            {/* Progress Overview */}
            {props.checkpoints && props.checkpoints.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quest Progress</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Complete each checkpoint to advance</p>
                    </div>
                  </div>
                  
                  {/* Progress Stats - Compute based on test results */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {(() => {
                        return `${(props.activeCheckpoint ?? 1) - 1}/${props.checkpoints.length}`
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Overall Progress</span>
                    <span>{(() => {
                      return Math.round(((props.activeCheckpoint ?? 1) - 1) / props.checkpoints.length * 100);
                    })()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(() => {
                         return Math.round(((props.activeCheckpoint ?? 1) - 1) / props.checkpoints.length * 100)
                      })()}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Checkpoints (Collapsible) */}
            {props.checkpoints && props.checkpoints.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Step-by-Step Guide</h2>
                    <p className="text-gray-600 dark:text-gray-400">Follow these checkpoints to complete your quest</p>
                  </div>
                </div>
                {props.checkpoints.map((checkpoint, index) => {
                  // Find test result for this checkpoint by matching checkpoint number
                  const checkpointNum = index + 1;
                  const testResult = reversedTestResults?.find(c => Number(c.checkpoint) === checkpointNum)
                  let testStatus = "pending"
                  if(testResult){
                    testStatus = testResult.status ? testResult.status.toLowerCase(): "pending"
                  } 
                  return (
                    <CheckpointComponent 
                      key={checkpoint.id || index}
                      checkpoint={{
                        ...checkpoint,
                        // Derive status from test results if available
                        status: testStatus
                      }}
                      index={index}
                      hideTestDetails
                      isFirstIncomplete={index ===  (props.activeCheckpoint ?? 1) - 1}
                    />
                  );
                })}
              </div>
            )}

            {/* Enhanced Tips Section */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">💡 Pro Tips</h2>
                  <p className="text-gray-600 dark:text-gray-400">Follow these best practices for success</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">Use <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs border">Ctrl+S</kbd> to save frequently</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">Test after each checkpoint completion</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">Check <strong>Test Results</strong> for detailed feedback</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">Use <strong>Preview</strong> to see changes live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Quest Selected</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Load a quest to see detailed instructions, checkpoints, and requirements.
              </p>
            </div>
          </div>
        )}
      </div>
      );
    }
  },
  'test-results': {
    title: 'Test Results',
    render: (props: RightPanelProps) => {
      const resolveStatus = (r: CheckpointTestResult) => {
        const statusText = (r.status || '').toString().toLowerCase();
        if (r.passed || statusText === 'passed' || statusText === 'success') return 'passed' as const;
        if (statusText.includes('fail') || statusText.includes('error')) return 'failed' as const;
        if (statusText.includes('running')) return 'running' as const;
        if (r.passed === false) return 'failed' as const;
        return 'pending' as const;
      };

      const formatDuration = (ms?: number) => {
        if (!ms || ms <= 0) return null;
        if (ms < 1000) return `${ms}ms`;
        const s = ms / 1000;
        return `${s.toFixed(s < 10 ? 1 : 0)}s`;
      };

      const badgeClass = (s: ReturnType<typeof resolveStatus>) => {
        switch (s) {
          case 'passed':
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-900';
          case 'failed':
            return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-900';
          case 'running':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900';
          default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
      };

      const getErrorBits = (r?: CheckpointTestResult) => {
        const anyErr = (r?.error as NormalizedTestError | LegacyTestError | null | undefined) || (r?.Error as LegacyTestError | null | undefined);
        const norm = isNormalizedError(anyErr) ? (anyErr as NormalizedTestError) : undefined;
        const legacy = isLegacyError(anyErr) ? (anyErr as LegacyTestError) : undefined;
        return {
          scenario: norm?.scenario ?? legacy?.Scenario,
          expected: norm?.expected ?? legacy?.Expected,
          received: norm?.received ?? legacy?.Received,
          hint: norm?.hint ?? legacy?.Hint,
          message: norm?.message ?? legacy?.Message,
        };
      };

      const resultsArray: CheckpointTestResult[] = props.testResults || [];
      const history = [...resultsArray].reverse();
      const latest = history[0];
      const latestStatus = latest ? resolveStatus(latest) : 'pending';
      const latestErr = getErrorBits(latest);
      const latestDuration = latest ? (latest.durationMs ?? latest.DurationMs) : undefined;

      // Calculate stats
      const totalTests = history.length;
      const passedTests = history.filter(r => resolveStatus(r) === 'passed').length;
      const failedTests = history.filter(r => resolveStatus(r) === 'failed').length;
      const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
                
      return (
        <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
          {/* Hero Header with Gradient */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-6">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Test Results</h2>
                    <p className="text-blue-100 text-sm">Live feedback on your code</p>
                  </div>
                </div>

                {props.isRunningTests && (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-sm font-semibold text-white">Running</span>
                  </div>
                )}
              </div>

              {/* Quick Stats Cards */}
              {totalTests > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-xs text-blue-100">Passed</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{passedTests}</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-xs text-blue-100">Failed</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{failedTests}</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-xs text-blue-100">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{totalTests}</div>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span className="text-xs text-blue-100">Success</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{successRate}%</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Running State */}
            {props.isRunningTests && !latest && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Running tests...</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {props.currentTestingCheckpoint ? `Testing Checkpoint ${props.currentTestingCheckpoint}` : 'Validating your code against requirements'}
                    </div>
                    <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!latest && !props.isRunningTests && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Ready to Test</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Run your tests to see detailed feedback on your code. We'll show you exactly what's working and what needs improvement.
                </p>
                <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                  </svg>
                  <span className="font-medium">Click the "Run Tests" button to begin</span>
                </div>
              </div>
            )}

            {/* Latest Result Card */}
            {latest && !props.isRunningTests && (
              <div className={`rounded-2xl p-6 shadow-xl border-2 ${
                latestStatus === 'passed' 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-800' 
                  : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-300 dark:border-red-800'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      latestStatus === 'passed' 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-br from-red-500 to-rose-500'
                    }`}>
                      {latestStatus === 'passed' ? (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          Checkpoint {latest.checkpoint}
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass(latestStatus)}`}>
                          {latestStatus.toUpperCase()}
                        </div>
                      </div>
                      {latestErr?.scenario && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {latestErr.scenario}
                        </p>
                      )}
                    </div>
                  </div>
                  {formatDuration(latestDuration) && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatDuration(latestDuration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error Details */}
                {latestStatus === 'failed' && (
                  <div className="space-y-4 mt-6">
                    {latestErr?.hint && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">💡 Hint</div>
                            <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{latestErr.hint}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {latestErr?.message && (
                      <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <div className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300 mb-2">Error Message</div>
                        <p className="text-sm text-red-900 dark:text-red-100 font-mono leading-relaxed">{latestErr.message}</p>
                      </div>
                    )}

                    {(latestErr?.expected || latestErr?.received) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {latestErr.expected && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                              <div className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-300">Expected</div>
                            </div>
                            <pre className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap break-words font-mono bg-green-100 dark:bg-green-950/30 p-3 rounded-lg">{latestErr.expected}</pre>
                          </div>
                        )}
                        {latestErr.received && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                              </svg>
                              <div className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">Received</div>
                            </div>
                            <pre className="text-sm text-red-900 dark:text-red-100 whitespace-pre-wrap break-words font-mono bg-red-100 dark:bg-red-950/30 p-3 rounded-lg">{latestErr.received}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {latestStatus === 'passed' && (
                  <div className="mt-4 bg-green-100 dark:bg-green-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                        Great job! All requirements met. Continue to the next checkpoint.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Test History */}
            {history.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                    Test History
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {history.length} run{history.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-3">
                  {history.map((r, idx) => {
                    const s = resolveStatus(r);
                    const dur = r.durationMs ?? r.DurationMs;
                    const err = getErrorBits(r);

                    return (
                      <details
                        key={`${r.checkpoint}-${idx}`}
                        className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              s === 'passed' 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                              {s === 'passed' ? (
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                  Checkpoint {r.checkpoint}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeClass(s)}`}>
                                  {s}
                                </span>
                              </div>
                              {err.scenario && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {err.scenario}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {formatDuration(dur) && (
                              <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {formatDuration(dur)}
                              </span>
                            )}
                            <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        </summary>

                        {(err.hint || err.expected || err.received || err.message) && (
                          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-100 dark:border-gray-700">
                            {err.hint && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">💡 Hint</div>
                                <p className="text-xs text-blue-900 dark:text-blue-100">{err.hint}</p>
                              </div>
                            )}

                            {err.message && (
                              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Message</div>
                                <p className="text-xs text-gray-900 dark:text-gray-100 font-mono">{err.message}</p>
                              </div>
                            )}

                            {(err.expected || err.received) && (
                              <div className="grid grid-cols-2 gap-3">
                                {err.expected && (
                                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-300 mb-1">Expected</div>
                                    <pre className="text-xs text-green-900 dark:text-green-100 whitespace-pre-wrap break-words">{err.expected}</pre>
                                  </div>
                                )}
                                {err.received && (
                                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300 mb-1">Received</div>
                                    <pre className="text-xs text-red-900 dark:text-red-100 whitespace-pre-wrap break-words">{err.received}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </details>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  },
//   discussions: {
//     title: 'Discussions',
//     render: () => (
//       <div className="p-4">
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Discussion</h3>
//             <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
//               New Thread
//             </button>
//           </div>
          
//           <div className="space-y-4">
//             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
//               <div className="flex items-start space-x-3">
//                 <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
//                   JD
//                 </div>
//                 <div className="flex-1">
//                   <div className="flex items-center space-x-2">
//                     <span className="font-medium text-gray-900 dark:text-gray-100">John Doe</span>
//                     <span className="text-xs text-gray-500">2 hours ago</span>
//                   </div>
//                   <p className="text-gray-700 dark:text-gray-300 mt-1">
//                     Great work on the Button component! I noticed you're using template literals for className composition. 
//                     Have you considered using a utility like clsx for better readability?
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     )
//   },
//   video: {
//     title: 'Video Resources',
//     render: () => (
//       <div className="p-4">
//         <div className="space-y-4">
//           <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tutorial Videos</h3>
          
//           <div className="space-y-4">
//             <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
//               <div className="aspect-video bg-gray-900 flex items-center justify-center">
//                 <div className="text-center text-white">
//                   <PlayIcon className="w-16 h-16 mx-auto mb-4 opacity-80" />
//                   <p className="text-lg font-medium">Creating React Components</p>
//                   <p className="text-sm opacity-80">Duration: 12:34</p>
//                 </div>
//               </div>
//               <div className="p-4">
//                 <h4 className="font-medium text-gray-900 dark:text-gray-100">Introduction to React Components</h4>
//                 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
//                   Learn the basics of creating reusable React components with TypeScript
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     )
//   }
};

export const RightPanel = React.memo(({ 
  activeTab, 
  onTabChange,
  htmlContent = '',
  cssContent = '',
  jsContent = '',
  language,
  labId,
  startCommands = [],
  previewReloadNonce,
  params,
  onTerminalReady,
  isConnected,
  connectionError,
  onRetry,
  onInput,
  onResize,
  ...props
}: RightPanelProps) => {
  const terminalHandleRef = React.useRef<any>(null);
  const handleTerminalRef = React.useCallback(
    (instance: any) => {
      if (!instance) return;
      terminalHandleRef.current = instance;
      if (onTerminalReady) {
        onTerminalReady(instance);
      }
    },
    [onTerminalReady]
  );

  const tabs = [
    { id: 'preview' as const, label: 'Preview & Terminal', icon: EyeIcon },
    { id: 'instructions' as const, label: 'Instructions', icon: DocumentTextIcon },
    { 
      id: 'test-results' as const, 
      label: props.isRunningTests ? 'Running Tests...' : 'Test Results', 
      icon: ClipboardDocumentCheckIcon,
      isLoading: props.isRunningTests
    },
    // { id: 'discussions' as const, label: 'Discussions', icon: ChatBubbleLeftRightIcon },
    // { id: 'video' as const, label: 'Video', icon: PlayIcon }
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {tab.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Hidden terminal container - always mounted */}
        <div className={`absolute inset-0 ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col">
            {/* Preview Section */}
            <div className="flex-1 min-h-0">
              <PreviewPanel
                htmlContent={htmlContent}
                cssContent={cssContent}
                jsContent={jsContent}
                params={params || { language: language || 'html', labId: labId || 'test' }}
                startCommands={startCommands}
              />
            </div>
            
            {/* Resizable Divider */}
            <div className="h-1 bg-gray-200 dark:bg-gray-700 cursor-row-resize hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"></div>
            
            {/* Terminal Section - Always mounted */}
            <div className="h-80 min-h-[200px] bg-black">
              {params && (
                <TerminalComponent
                  ref={handleTerminalRef}
                  terminalId="main"
                  labId={params.labId}
                  isConnected={!!isConnected}
                  connectionError={connectionError || null}
                  onRetry={onRetry}
                  onInput={onInput || (() => {})}
                  onResize={onResize || (() => {})}
                />
              )}
            </div>
          </div>
        </div>

        {/* Other tab content */}
        <div className={`h-full overflow-y-auto ${activeTab !== 'preview' ? 'block' : 'hidden'}`}>
          {activeTab === 'instructions' && TabContent.instructions.render({ 
            activeTab, 
            onTabChange,
            htmlContent,
            cssContent,
            jsContent,
            language,
            labId,
            startCommands,
            params,
            ...props
          })}
          {activeTab === 'test-results' && TabContent['test-results'].render({ 
            activeTab, 
            onTabChange,
            htmlContent,
            cssContent,
            jsContent,
            language,
            labId,
            startCommands,
            params,
            ...props
          })}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.params?.labId === nextProps.params?.labId &&
    prevProps.params?.language === nextProps.params?.language &&
    prevProps.previewReloadNonce === nextProps.previewReloadNonce &&
    prevProps.isConnected === nextProps.isConnected &&
    prevProps.connectionError === nextProps.connectionError &&
    prevProps.isRunningTests === nextProps.isRunningTests &&
    JSON.stringify(prevProps.checkpoints) === JSON.stringify(nextProps.checkpoints) &&
    JSON.stringify(prevProps.testResults) === JSON.stringify(nextProps.testResults) &&
    prevProps.loadingQuestData === nextProps.loadingQuestData &&
    JSON.stringify(prevProps.questMetadata) === JSON.stringify(nextProps.questMetadata)
  );
});

RightPanel.displayName = 'RightPanel';

export default RightPanel;