import { useEffect, useRef, useState, useCallback } from 'react';
import { fsSocket } from '../helpers/fileSystemSocket';
import {
  FS_INITIALIZE_CLIENT,
  FS_FETCH_QUEST_META,
  FS_LOAD_DIR,
  FS_FETCH_FILE_CONTENT,
  FS_FILE_CONTENT_UPDATE,
  FS_NEW_FILE,
  FS_DELETE_FILE,
  FS_EDIT_FILE_META,
  QuestMetaResponse,
  FileInfo,
  FileContentResponse
} from '../constants/FS_MessageTypes';
import { buildFsUrl } from '@/lib/fs';
import { buildPtyUrl } from '@/lib/pty';
import { dlog, isDebug } from '../utils/debug';

type RunnerCheckpointResult = {
  checkpoint: number;
  status?: string;
  durationMs?: number;
  error?: any;
};

type NormalizedCheckpointResult = {
  checkpoint: string;
  passed: boolean;
  status: string;
  durationMs?: number;
  error?: {
    scenario?: string;
    expected?: string;
    received?: string;
    hint?: string;
    message?: string;
  } | null;
  output?: string;
};

// Simple file tree builder (duplicated trimmed version to avoid importing large hook)
const buildFileTree = (files: FileInfo[]) => {
  const tree: any = {};
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let cur = tree;
    parts.forEach((part, idx) => {
      const isLast = idx === parts.length - 1;
      if (isLast) {
        cur[part] = {
          type: file.isDir ? 'folder' : 'file',
          children: file.isDir ? {} : undefined,
          path: file.path,
          size: file.size,
          modTime: file.modTime,
          isDir: file.isDir,
        };
      } else {
        cur[part] = cur[part] || {
          type: 'folder',
          children: {},
          path: parts.slice(0, idx + 1).join('/'),
          isDir: true,
        };
        cur = cur[part].children;
      }
    });
  }
  return tree;
};

// Module-level cache per labId
const questMetaCache: Record<string, QuestMetaResponse> = {};

// Single-flight / primary-instance guards (very lightweight; assumes one lab per page)
let fsConnectInFlight: Promise<void> | null = null; // single-flight connect promise
let fsReconnectAttempts = 0; // aggregate attempts across hook re-renders

export type LabBootstrapPhase =
  | 'checking-progress'
  | 'starting-project'
  | 'waiting-active'
  | 'fs-meta-loading'
  | 'fs-connecting'
  | 'pty-connecting'
  | 'ready'
  | 'full-ready'
  | 'error';

interface UseLabBootstrapParams {
  labId: string;
  language: string;
  autoConnectPty?: boolean; // if true attempt PTY once FS ready
  requirePtyForReady?: boolean; // if true we only declare ready when PTY connected
  mainFileCandidates?: string[]; // ordered list; fallback to first file
  onFirstFileReady?: (path: string) => void;
  requireFileMetaForReady?: boolean; // if true we don't go ready until we have non-empty meta files
  metaTimeoutMs?: number; // timeout to stop waiting for meta
}

interface RenameMeta { oldPath: string; newPath: string; }

export function useLabBootstrap({
  labId,
  language,
  autoConnectPty = false,
  requirePtyForReady = false,
  mainFileCandidates = ['App.jsx','index.js','main.js','index.html','README.md'],
  onFirstFileReady,
  requireFileMetaForReady = true,
  metaTimeoutMs = 8000,
}: UseLabBootstrapParams) {
  const [phase, setPhaseState] = useState<LabBootstrapPhase>('checking-progress');
  const setPhase = useCallback((p: LabBootstrapPhase) => {
    dlog(`Bootstrap phase: ${phase} -> ${p}`);
    setPhaseState(p);
  }, [phase]);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [progressLogs, setProgressLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('unknown');
  const [fsReady, setFsReady] = useState(false);
  const [ptyReady, setPtyReady] = useState(false);
  const [fileTree, setFileTree] = useState<any>({});
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [maxLabsReached, setMaxLabsReached] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(0);
  const [isRunningTests, setIsRunningTests] = useState(false);
  // Append-only chronological list of checkpoint results (may contain multiple runs)
  const [testResults, setTestResults] = useState<NormalizedCheckpointResult[]>([]);
  const [currentTestingCheckpoint, setCurrentTestingCheckpoint] = useState<string | null>(null);
  const initialFileChosen = useRef(false);
  const ptySocketRef = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const apiCalls = useRef(0);
  const pollingStopped = useRef(false);
  const connectingFs = useRef(false);
  const fsUrl = buildFsUrl(labId);
  const ptyUrl = buildPtyUrl(labId);
  const metaLoadedRef = useRef(false);
  const metaTimeoutRef = useRef<number | null>(null);
  const firstActiveSeenAt = useRef<number | null>(null);

  // Adaptive poll loop (single flight)
  const pollProgress = useCallback(async () => {
    const start = Date.now();
    while (!pollingStopped.current && isMounted.current && !fsReady) {
      try {
        apiCalls.current++;
        const resp = await fetch(`/api/project/progress/${labId}`);
        if (resp.status === 404) {
          // need to start project
          setPhase('starting-project');
          const started = await startProject();
          if (!started) {
            await delay(3000);
            continue;
          }
          setPhase('waiting-active');
          await delay(2000);
          continue;
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        setStatus(data.status);
        setProgressLogs(data.progressLogs || []);
        
        // Load test results + active checkpoint from Redis (via progress API)
        if (data.testResults) {
          // New backend: array; legacy: object map
          if (Array.isArray(data.testResults)) {
          setTestResults(data.testResults);
          } else {
            setTestResults(Object.values(data.testResults || {}));
          }
        }

        if (data.activeCheckpoint !== undefined && data.activeCheckpoint !== null) {
          // New backend: number = next checkpoint to attempt; UI tracks last passed checkpoint
          if (typeof data.activeCheckpoint === 'number') {
            setCurrentCheckpoint(Math.max(0, data.activeCheckpoint));
          } else if (typeof data.activeCheckpoint === 'string') {
          const checkpointNum = parseInt(data.activeCheckpoint.replace('checkpoint_', ''));
          if (!isNaN(checkpointNum)) {
            setCurrentCheckpoint(checkpointNum);
            }
          }
        }
        
        if (data.status === 'active') {
          if (!firstActiveSeenAt.current) firstActiveSeenAt.current = Date.now();
          const fsActive = data.progressLogs?.some((l: any) => l.ServiceName === 'file_system' && l.Status === 'active');
          const ptyActive = data.progressLogs?.some((l: any) => l.ServiceName === 'pty' && l.Status === 'active');
          const activeAge = firstActiveSeenAt.current ? Date.now() - firstActiveSeenAt.current : 0;
          if (fsActive || activeAge > 5000) { // fallback connect after 5s of active even if log missing
            pollingStopped.current = true;
            setPhase('fs-connecting');
            connectFs();
            if (autoConnectPty || requirePtyForReady || ptyActive) {
              // PTY will be lazy after FS connect
            }
            break;
          }
        }
      } catch (e: any) {
        setError({ code: 'progress_fetch_failed', message: e.message });
      }
      const elapsed = Date.now() - start;
      // adaptive interval
      const interval = elapsed < 10000 ? 2000 : elapsed < 30000 ? 4000 : 8000;
      await delay(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labId]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Attach passive quest_meta listener once (module-level guard via ref)
  const questMetaListenerAttached = useRef(false);
  useEffect(() => {
    if (!questMetaListenerAttached.current) {
      questMetaListenerAttached.current = true;
      fsSocket.onMessage('quest_meta', (data:any) => {
        if (!data?.files) return;
        if (!metaLoadedRef.current) {
          dlog(`Passive quest_meta listener received ${data.files.length} files`);
        }
        metaLoadedRef.current = true;
        setFileTree(buildFileTree(data.files));
        if (!initialFileChosen.current) {
          const list = data.files.filter((f:any) => !f.isDir);
          let pick: string | undefined;
          for (const cand of mainFileCandidates) {
            pick = list.find((f:any) => f.path.endsWith('/'+cand) || f.path === cand)?.path;
            if (pick) break;
          }
          if (!pick && list.length) pick = list[0].path;
          if (pick) {
            initialFileChosen.current = true;
            setActiveFile(pick);
            openFileRef.current(pick).catch(()=>{});
            onFirstFileReady?.(pick);
          }
        }
        if (!fsReady) {
          setFsReady(true);
          setPhase(requirePtyForReady ? 'pty-connecting' : 'ready');
        }
      });
    }
  }, [fsReady, mainFileCandidates, onFirstFileReady, requirePtyForReady]);

  const startProject = useCallback(async (): Promise<boolean> => {
    try {
      apiCalls.current++;
      const res = await fetch('/api/project/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, language })
      });
      if (res.status === 429) {
        setMaxLabsReached(true);
        return false;
      }
      if (res.ok || res.status === 409) return true;
      return false;
    } catch {
      return false;
    }
  }, [labId, language]);

  // placeholder; real openFile defined later. We'll capture via ref to avoid ordering issue.
  const openFileRef = useRef<(p: string) => Promise<string>>(async () => '');

  const fetchQuestMeta = useCallback(async (attempt = 1): Promise<QuestMetaResponse | null> => {
    try {
      let meta = questMetaCache[labId];
      if (!meta) {
        dlog(`Fetching quest meta (attempt ${attempt})`);
        meta = await fsSocket.sendMessage(FS_FETCH_QUEST_META, { path: '' }, fsUrl);
        questMetaCache[labId] = meta;
      } else if (isDebug()) {
        dlog('Using cached quest meta');
      }
      if (!isMounted.current) return null;
      if (meta?.files && meta.files.length > 0) {
        setFileTree(buildFileTree(meta.files));
        metaLoadedRef.current = true;
        if (!initialFileChosen.current) {
          const list = meta.files.filter(f => !f.isDir);
            let pick: string | undefined;
            for (const cand of mainFileCandidates) {
              pick = list.find(f => f.path.endsWith('/'+cand) || f.path === cand)?.path;
              if (pick) break;
            }
            if (!pick && list.length) pick = list[0].path;
            if (pick) {
              initialFileChosen.current = true;
              setActiveFile(pick);
              try { await openFileRef.current(pick); } catch {}
              onFirstFileReady?.(pick);
            }
        }
        return meta;
      } else {
        if (attempt < 3) {
          await delay(400 * attempt);
          return fetchQuestMeta(attempt + 1);
        }
        return meta; // even if empty after retries
      }
    } catch (e: any) {
      if (isMounted.current) {
        setError({ code: 'meta_fetch_failed', message: e.message || 'Failed to fetch meta' });
      }
      if (attempt < 3) {
        await delay(500 * attempt);
        return fetchQuestMeta(attempt + 1);
      }
      return null;
    }
  }, [labId, fsUrl, mainFileCandidates, onFirstFileReady]);

  const connectFs = useCallback(async () => {
    if (fsReady) return;
    if (fsConnectInFlight) {
      dlog('FS connect already in flight – joining');
      return fsConnectInFlight;
    }
    if (connectingFs.current) {
      dlog('FS connect flagged as connecting (double guard)');
      return;
    }
    connectingFs.current = true;
    fsSocket.setVerboseDebug(isDebug());
    const doConnect = async () => {
      try {
        dlog('Connecting FS socket...');
        await fsSocket.connect(fsUrl);
        dlog('Sending FS_INITIALIZE_CLIENT (fire-and-forget)');
        try {
          await fsSocket.sendOneWay(FS_INITIALIZE_CLIENT, { language, labId });
        } catch (initErr:any) {
          dlog('Initialization send failed (continuing to meta fetch): ' + initErr?.message);
        }
        setPhase('fs-meta-loading');
        const meta = await fetchQuestMeta();
        const hasFiles = !!meta?.files && meta.files.length > 0;
        if (requireFileMetaForReady && !hasFiles) {
          if (!metaTimeoutRef.current) {
            metaTimeoutRef.current = window.setTimeout(() => {
              if (!metaLoadedRef.current) {
                setError({ code: 'meta_timeout', message: 'File metadata took too long to load' });
                setFsReady(true);
                setPhase(requirePtyForReady ? 'pty-connecting' : 'ready');
              }
            }, metaTimeoutMs);
          }
        } else {
          setFsReady(true);
          setPhase(requirePtyForReady ? 'pty-connecting' : 'ready');
        }
        if (autoConnectPty || requirePtyForReady) {
          connectPty();
        }
        // Refetch meta once if connection reopens and we still lack files
        const reopenHandler = () => {
          if (!metaLoadedRef.current) fetchQuestMeta();
        };
        const closeHandler = (ev: CloseEvent) => {
          if (!metaLoadedRef.current && isMounted.current) {
            // Suppress user-facing error; treat as a silent retry state
            dlog(`FS closed (${ev.code}) before metadata loaded – retrying silently`);
            setPhase('fs-connecting');
        
          }
        };
        fsSocket.onOpen(reopenHandler);
        fsSocket.onClose(closeHandler as any);
        setTimeout(() => {
          fsSocket.offOpen(reopenHandler);
          fsSocket.offClose(closeHandler as any);
        }, 20000);
      } catch (e: any) {
        fsReconnectAttempts++;
        if (isMounted.current) {
          // Only mark as error if socket itself failed before any connection (no open event yet)
          setError({ code: 'fs_connect_failed', message: e.message || 'Failed to connect FS' });
          const backoff = Math.min(1500 * fsReconnectAttempts, 6000);
          dlog(`FS connect error (attempt ${fsReconnectAttempts}) – retrying in ${backoff}ms`);
          setTimeout(() => {
            connectingFs.current = false;
            fsConnectInFlight = null;
            connectFs();
          }, backoff);
          setPhase('fs-connecting');
        }
      } finally {
        fsConnectInFlight = null; // release single-flight holder
      }
    };
    fsConnectInFlight = doConnect();
    return fsConnectInFlight;
  }, [fsUrl, language, labId, autoConnectPty, requirePtyForReady, fsReady, fetchQuestMeta]);

  const connectPty = useCallback(() => {
    if (ptyReady || !ptyUrl || ptySocketRef.current) return;
    try {
      const ws = new WebSocket(ptyUrl);
      ptySocketRef.current = ws;  
      ws.onopen = () => {
        if (!isMounted.current) return;
        setPtyReady(true);
        setPhase('full-ready');
        setError(prev => (prev?.code === 'pty_connect_failed' ? null : prev));
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          dlog("DEBUG: EXECUTING RUN COMMAND", message)
          handlePtyMessage(message);
        } catch (error) {
          dlog('DEBUG: PTY output:', event.data);
        }
      };
      
      ws.onclose = () => {
        if (!isMounted.current) return;
        if (requirePtyForReady && fsReady) {
          setPhase('pty-connecting');
        }
        ptySocketRef.current = null;
        setPtyReady(false);
      };
      
      ws.onerror = (error) => {
        console.error('PTY WebSocket error:', error);
        if (requirePtyForReady) {
          setError({ code: 'pty_connect_failed', message: 'Failed to connect PTY' });
          setPhase('error');
        }
      };
    } catch (e: any) {
      if (requirePtyForReady) {
        setError({ code: 'pty_connect_failed', message: e.message || 'Failed to connect PTY' });
        setPhase('error');
      }
    }
  }, [ptyUrl, ptyReady, requirePtyForReady, fsReady]);

  const appendTestResults = useCallback((results: NormalizedCheckpointResult[]) => {
    if (!results.length) return;
    setTestResults(prev => [...prev, ...results]);
  }, []);


  const handlePtyMessage = useCallback((message: any) => {
    dlog('DEBUG: PTY message received:', message);
    
    const testPromise = ptySocketRef.current ? (ptySocketRef.current as any).testPromise : null;
    
    switch (message.type) {
      case 'test_started':
        console.log('Test started:', message.data);
        setCurrentTestingCheckpoint(message.data?.checkpointId || null);
        break;
        
      case 'test_completed':
        setIsRunningTests(false);
        setCurrentTestingCheckpoint(null);
        
        const result = message.data;
        console.log('Test completed:', result);
        

        if (result && result.results && Array.isArray(result.results)) {
          const normalized: NormalizedCheckpointResult[] = result.results.map((checkpointResult: any) => {
            const checkpointId = `${checkpointResult.checkpoint}`;

            // Normalize status to handle new server payloads (e.g., FAILED_ASSERTION)
            const rawStatus = checkpointResult.status || '';
            const normalizedStatus = rawStatus.toString().toLowerCase();
            const passed = checkpointResult.passed ?? (normalizedStatus === 'passed' || normalizedStatus === 'success');
            
            const errorPayload = checkpointResult.error || checkpointResult.Error || null;
            return {
              checkpoint: checkpointId,
              passed,
              status: rawStatus,
              durationMs: checkpointResult.durationMs ?? checkpointResult.DurationMs,
              error: errorPayload
                ? {
                    scenario: errorPayload.scenario || errorPayload.Scenario,
                    expected: errorPayload.expected || errorPayload.Expected,
                    received: errorPayload.received || errorPayload.Received,
                    hint: errorPayload.hint || errorPayload.Hint,
                    message: errorPayload.message || errorPayload.Message,
                  }
                : null,
              output: passed ? `Checkpoint ${checkpointResult.checkpoint} passed successfully!` : undefined,
            };
          });
            
          appendTestResults(normalized);

          // Update current checkpoint based on the activeCheckpoint coming from PTY response
          if (typeof result.activeCheckpoint === 'number') {
            setCurrentCheckpoint(Math.max(0, result.activeCheckpoint ));
          }
        }
        
        // Resolve the test promise
        if (testPromise) {
          clearTimeout(testPromise.timeout);
          testPromise.resolve();
          delete (ptySocketRef.current as any).testPromise;
        }
        break;
        
      case 'test_error':
        setIsRunningTests(false);
        setCurrentTestingCheckpoint(null);
        setError({ code: 'test_execution_failed', message: message.data?.message || 'Test execution failed' });
        console.error('Test error:', message.data);
        
        if (testPromise) {
          clearTimeout(testPromise.timeout);
          testPromise.reject(new Error(message.data?.message || 'Test execution failed'));
          delete (ptySocketRef.current as any).testPromise;
        }
        break;
        
        
      default:
        // Handle other PTY messages (terminal output, etc.)
        break;
    }
  }, [appendTestResults]);

  // Test execution functionality using PTY connection
  const runCheckpointTest = useCallback(async (checkpointId: string, language: string): Promise<void> => {
    if (isRunningTests || !ptySocketRef.current || ptySocketRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('PTY connection not ready or test already running');
    }
    
    setIsRunningTests(true);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        setIsRunningTests(false);
        reject(new Error('Test execution timeout'));
      }, 60000); // 60 second timeout
      
      // Store the promise handlers to be called from the message handler
      const testPromiseRef = { resolve, reject, timeout, checkpointId };
      (ptySocketRef.current as any).testPromise = testPromiseRef;
      
      try {
        const testRequest = {
          type: 'test',
          data: JSON.stringify({
            type: 'checkpoint',
            checkpointId: checkpointId,
            language: language
          })
        };
        
        ptySocketRef.current!.send(JSON.stringify(testRequest));
        console.log('Test request sent:', testRequest);
      } catch (error) {
        clearTimeout(timeout);
        setIsRunningTests(false);
        delete (ptySocketRef.current as any).testPromise;
        reject(error);
      }
    });
  }, [isRunningTests]);


  const loadTestResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/test-results/${labId}`);
      if (response.ok) {
        const data = await response.json();
        const raw = data.testResults ?? [];
        const normalized = Array.isArray(raw) ? raw : [];
        setTestResults(normalized);
        

        if (typeof data.activeCheckpoint === 'number') {
          setCurrentCheckpoint(data.activeCheckpoint);
        }
        return normalized;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch test results:', error);
      return [];
    }
  }, [labId]);

  // Load test results when the component mounts and FS is ready
  useEffect(() => {
    if (fsReady && labId) {
      loadTestResults();
    }
  }, [fsReady, labId, loadTestResults]);

  // File operations (minimal subset)
  const openFile = useCallback(async (path: string): Promise<string> => {
    if (fileContents[path] !== undefined) return fileContents[path];
    try {
      const resp: FileContentResponse = await fsSocket.sendMessage(FS_FETCH_FILE_CONTENT, { path }, fsUrl);
      if (!isMounted.current) return '';
      setFileContents(prev => ({ ...prev, [path]: resp.content }));
      return resp.content;
    } catch (e: any) {
      setError({ code: 'file_load_failed', message: e.message || 'Failed to load file' });
      return '';
    }
  }, [fileContents, fsUrl]);
  // sync ref after definition
  openFileRef.current = openFile;

  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      await fsSocket.sendOneWay(FS_FILE_CONTENT_UPDATE, { path, content }, fsUrl);
      setFileContents(prev => ({ ...prev, [path]: content }));
    } catch (e: any) {
      setError({ code: 'file_save_failed', message: e.message || 'Failed to save file' });
      throw e;
    }
  }, [fsUrl]);

  const createFile = useCallback(async (path: string, isDir: boolean, content = '') => {
    try {
      await fsSocket.sendMessage(FS_NEW_FILE, { path, isDir, content }, fsUrl);
      // Refresh parent directory lazily
      const parent = path.split('/').slice(0,-1).join('/');
      await loadDirectory(parent);
      if (!isDir) setFileContents(prev => ({ ...prev, [path]: content }));
    } catch (e: any) {
      setError({ code: 'file_create_failed', message: e.message || 'Failed to create file' });
    }
  }, [fsUrl]);

  const deleteFile = useCallback(async (path: string) => {
    try {
      await fsSocket.sendMessage(FS_DELETE_FILE, { path }, fsUrl);
      // Simplistic removal: rebuild tree from cache meta if available
      const meta = questMetaCache[labId];
      if (meta?.files) {
        meta.files = meta.files.filter(f => f.path !== path && !f.path.startsWith(path + '/'));
        setFileTree(buildFileTree(meta.files));
      }
    } catch (e: any) {
      setError({ code: 'file_delete_failed', message: e.message || 'Failed to delete file' });
    }
  }, [fsUrl, labId]);

  const renameFile = useCallback(async (oldPath: string, newPath: string) => {
    try {
      await fsSocket.sendMessage(FS_EDIT_FILE_META, { oldPath, newPath }, fsUrl);
      const meta = questMetaCache[labId];
      if (meta?.files) {
        meta.files.forEach(f => {
          if (f.path === oldPath || f.path.startsWith(oldPath + '/')) {
            f.path = f.path.replace(oldPath, newPath);
          }
        });
        setFileTree(buildFileTree(meta.files));
      }
      // Move content cache if exists
      setFileContents(prev => {
        if (prev[oldPath] === undefined) return prev;
        const next = { ...prev };
        next[newPath] = next[oldPath];
        delete next[oldPath];
        return next;
      });
    } catch (e: any) {
      setError({ code: 'file_rename_failed', message: e.message || 'Failed to rename file' });
    }
  }, [fsUrl, labId]);

  const loadDirectory = useCallback(async (path: string) => {
    try {
  const resp: any = await fsSocket.sendMessage(FS_LOAD_DIR, { path }, fsUrl);
  if (resp && Array.isArray(resp.files)) {
        // Merge into meta cache if present
        const meta = questMetaCache[labId];
        if (meta) {
          const other = meta.files.filter(f => !f.path.startsWith(path + '/'));
          meta.files = [...other, ...resp.files];
          setFileTree(buildFileTree(meta.files));
        }
      }
  return (resp && Array.isArray(resp.files)) ? resp.files : [];
    } catch (e: any) {
      setError({ code: 'dir_load_failed', message: e.message || 'Failed to load directory' });
      return [];
    }
  }, [fsUrl, labId]);

  // Kick off bootstrap
  useEffect(() => {
    isMounted.current = true;
    pollProgress();
    return () => {
      isMounted.current = false;
      pollingStopped.current = true;
      try { fsSocket.disconnect(); } catch {}
      if (ptySocketRef.current) {
        try { ptySocketRef.current.close(); } catch {}
        ptySocketRef.current = null;
      }
    };
  }, [pollProgress]);

  // Auto connect PTY once FS ready (lazy after a tick) if requested
  useEffect(() => {
    if (fsReady && (autoConnectPty || requirePtyForReady)) {
      const t = setTimeout(() => connectPty(), 500);
      return () => clearTimeout(t);
    }
  }, [fsReady, autoConnectPty, requirePtyForReady, connectPty]);

  // Percent heuristic
  const lastPercentRef = useRef(0);
  const percent = (() => {
    const phasePercent = (p: LabBootstrapPhase): number => {
      switch (p) {
        case 'checking-progress': return 5;
        case 'starting-project': return 12;
        case 'waiting-active': return 25;
        case 'fs-connecting': return 45;
        case 'fs-meta-loading': return metaLoadedRef.current ? 65 : 55;
        case 'ready': return 80;
        case 'pty-connecting': return 90;
        case 'full-ready': return 100;
        case 'error': return lastPercentRef.current; // freeze at last good percent
        default: return 5;
      }
    };
    const current = phasePercent(phase);
    if (typeof window === 'undefined') {
      lastPercentRef.current = Math.max(lastPercentRef.current, current);
      return lastPercentRef.current;
    }
  const key = '__DEV_ARENA_LAST_PERCENT__';
  const prev = (window as any)[key];
  const next = prev === undefined ? current : Math.max(prev, current);
  // If we haven't loaded meta (no files) never exceed 92%
  const metaLoaded = metaLoadedRef.current;
  const baseCap = !metaLoaded ? 92 : 98;
  const capped = next >= 99 && phase !== 'full-ready' ? baseCap : Math.min(next, baseCap);
    (window as any)[key] = capped;
    lastPercentRef.current = capped;
    return capped;
  })();


  const publicApi = {
    phase,
    percent,
    error,
    progressLogs,
    status,
    fsReady: requirePtyForReady ? (fsReady && ptyReady) : fsReady,
    ptyReady,
    connectPty,
    fileTree,
    fileContents,
    activeFile,
    setActiveFile,
    openFile,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
    loadDirectory,
    retryFetchMeta: fetchQuestMeta,
    metaLoaded: metaLoadedRef.current,
    apiCalls: apiCalls.current,
    maxLabsReached,
    // Test execution methods
    runCheckpointTest,
    loadTestResults,
    currentCheckpoint,
    isRunningTests,
    testResults,
    currentTestingCheckpoint,
    setCurrentCheckpoint
  };

  return publicApi;
}
