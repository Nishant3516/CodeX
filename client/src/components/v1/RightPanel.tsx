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
  testResults?: any;
  loadingTestResults?: boolean;
  isRunningTests?: boolean;
  currentTestingCheckpoint?: string | null;
  // Props for terminal
  params?: {
    language: string;
    labId: string;
  };
  onTerminalReady?: (terminal: any) => void;
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
      status === 'passed' ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' :
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
            status === 'passed' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
            status === 'failed' ? 'bg-gradient-to-br from-red-500 to-rose-500' :
            'bg-gradient-to-br from-gray-400 to-gray-500'
          }`}>
            {isCurrentlyTesting ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : status === 'passed' ? (
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
                  status === 'passed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
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
            <div>
              <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Test Results
              </h5>
              <div className={`p-4 rounded-xl border-l-4 ${
                status === 'passed' ? 'bg-green-50 dark:bg-green-900/20 border-green-400' :
                status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-400' :
                'bg-gray-50 dark:bg-gray-800/50 border-gray-400'
              }`}>
                {rawTestResult.message && (
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{rawTestResult.message}</p>
                )}
                {rawTestResult.error && (
                  <pre className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded overflow-x-auto">
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
              params={props.params}
              terminalId="main"
            />
          )}
        </div>
      </div>
    )
  },
  instructions: {
    title: 'Instructions',
    render: (props: RightPanelProps) => {
      const firstIncompleteIndex = props.checkpoints ? props.checkpoints.findIndex(cp => cp.status !== 'completed') : -1;
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
                  
                  {/* Progress Stats */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {props.checkpoints.filter(cp => cp.status === 'completed').length}/{props.checkpoints.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Overall Progress</span>
                    <span>{Math.round((props.checkpoints.filter(cp => cp.status === 'completed').length / props.checkpoints.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(props.checkpoints.filter(cp => cp.status === 'completed').length / props.checkpoints.length) * 100}%` }}
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
                {props.checkpoints.map((checkpoint, index) => (
                  <CheckpointComponent 
                    key={checkpoint.id || index}
                    checkpoint={checkpoint}
                    index={index}
                    hideTestDetails
                    isFirstIncomplete={index === firstIncompleteIndex}
                  />
                ))}
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
    render: (props: RightPanelProps) => (
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Test Results</h3>
                <p className="text-gray-600 dark:text-gray-400">Real-time feedback on your progress</p>
              </div>
            </div>
            
            {props.isRunningTests && (
              <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Running Tests...</span>
              </div>
            )}
          </div>
          
          {/* Enhanced Test Summary */}
          {Object.keys(props.testResults || {}).length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                const results = Object.values(props.testResults || {});
                const totalTests = results.length;
                const passedTests = results.filter((r: any) => r.status === 'passed' || r.passed).length;
                const failedTests = results.filter((r: any) => r.status === 'failed' || (!r.passed && r.status !== 'running')).length;
                const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
                
                return (
                  <>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{passedTests}</div>
                          <div className="text-sm font-medium text-green-700 dark:text-green-300">Passed</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedTests}</div>
                          <div className="text-sm font-medium text-red-700 dark:text-red-300">Failed</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalTests}</div>
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Total</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{successRate}%</div>
                          <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Success</div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          {/* Progress Bar */}
          {Object.keys(props.testResults || {}).length > 0 && (
            <div className="mt-6">
              {(() => {
                const results = Object.values(props.testResults || {});
                const totalTests = results.length;
                const passedTests = results.filter((r: any) => r.status === 'passed' || r.passed).length;
                const progressPercent = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
                
                return (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">Overall Test Progress</span>
                      <span className="font-semibold">{passedTests}/{totalTests} checkpoints passed</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        
        {/* Test Results Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {props.isRunningTests && Object.keys(props.testResults || {}).length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="relative mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Initializing Test Suite
              </div>
              <div className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Setting up your testing environment and preparing to validate your code against checkpoint requirements.
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800 max-w-md">
                <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">Compiling your project files</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <span>Loading test specifications</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    <span>Executing checkpoint validations</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Checkpoints List */}
          {props.checkpoints && props.checkpoints.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Checkpoint Validation Results</h4>
                <p className="text-gray-600 dark:text-gray-400">Each checkpoint tests specific requirements from your quest</p>
              </div>
              {props.checkpoints.map((checkpoint, index) => (
                <CheckpointComponent
                  key={checkpoint.id || index}
                  checkpoint={checkpoint}
                  index={index}
                  testResults={props.testResults}
                  isRunningTests={props.isRunningTests}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                No Test Results Yet
              </h4>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                Load a quest project and run tests to see detailed checkpoint validation results. 
                Click the <strong>"Test"</strong> button in the editor to get started.
              </p>
              <div className="mt-6 inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
                <span>Tests will validate your code against each checkpoint's requirements</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
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
  params,
  onTerminalReady,
  ...props
}: RightPanelProps) => {
  const terminalHandleRef = React.useRef<any>(null);

  // Notify parent when terminal is ready
  React.useEffect(() => {
    if (onTerminalReady && terminalHandleRef.current) {
      onTerminalReady(terminalHandleRef.current);
    }
  }, [onTerminalReady, terminalHandleRef.current]);

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
                  ref={terminalHandleRef}
                  params={params}
                  terminalId="main"
                  isVisible={activeTab === 'preview'}
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
    prevProps.isRunningTests === nextProps.isRunningTests &&
    JSON.stringify(prevProps.checkpoints) === JSON.stringify(nextProps.checkpoints) &&
    JSON.stringify(prevProps.testResults) === JSON.stringify(nextProps.testResults) &&
    prevProps.loadingQuestData === nextProps.loadingQuestData &&
    JSON.stringify(prevProps.questMetadata) === JSON.stringify(nextProps.questMetadata)
  );
});

RightPanel.displayName = 'RightPanel';

export default RightPanel;