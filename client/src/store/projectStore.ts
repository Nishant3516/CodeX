import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProjectData, CheckpointProgress, TestResult } from '@/types/project';

interface ProjectState {
  // Project data
  projectData: ProjectData | null;
  currentCheckpoint: string;
  checkpointProgress: CheckpointProgress[];
  
  // Code state
  files: string[];
  contents: Record<string, string>;
  activeFile: string;
  boilerplateCode: Record<string, string>; // Optional, can be set during initialization
  // UI state
  isTestingInProgress: boolean;
  showRequirements: boolean;
  
  // Actions
  setProjectData: (data: ProjectData) => void;
  setCurrentCheckpoint: (checkpointId: string) => void;
  updateCheckpointProgress: (progress: CheckpointProgress) => void;
  setFiles: (files: string[]) => void;
  updateFileContent: (filename: string, content: string) => void;
  setActiveFile: (filename: string) => void;
  addFile: (filename: string) => void;
  setIsTestingInProgress: (isInProgress: boolean) => void;
  setShowRequirements: (show: boolean) => void;
  
  // Complex actions
  initializeProject: (projectData: ProjectData) => void;
  navigateToCheckpoint: (checkpointId: string) => void;
  canNavigateToCheckpoint: (checkpointId: string) => boolean;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      // Initial state
      projectData: null,
      currentCheckpoint: '',
      checkpointProgress: [],
      files: [],
      contents: {},
      activeFile: '',
      boilerplateCode: {},
      isTestingInProgress: false,
      showRequirements: false,

      // Simple setters
      setProjectData: (data) => set({ projectData: data }),
      setCurrentCheckpoint: (checkpointId) => set({ currentCheckpoint: checkpointId }),
      updateCheckpointProgress: (progress) => set((state) => ({
        checkpointProgress: [
          ...state.checkpointProgress.filter(cp => cp.checkpointId !== progress.checkpointId),
          progress
        ]
      })),
      setFiles: (files) => set({ files }),
      updateFileContent: (filename, content) => set((state) => ({
        contents: { ...state.contents, [filename]: content }
      })),
      setActiveFile: (filename) => set({ activeFile: filename }),
      addFile: (filename) => set((state) => ({
        files: [...state.files, filename],
        contents: { ...state.contents, [filename]: "" }
      })),
      setIsTestingInProgress: (isInProgress) => set({ isTestingInProgress: isInProgress }),
      setShowRequirements: (show) => set({ showRequirements: show }),

      // Complex actions
      initializeProject: (projectData) => {
        const initialProgress: CheckpointProgress[] = projectData.checkpoints.map(checkpoint => ({
          checkpointId: checkpoint.id,
          completed: false,
          testsResults: {}
        }));

        // Set initial boilerplate code from first checkpoint
        const firstCheckpoint = projectData.checkpoints[0];
        let initialContents: Record<string, string> = {};
        let initialFiles: string[] = [];

        if (firstCheckpoint) {
          Object.entries(projectData.boilerplateCode).forEach(([filename, code]) => {
            initialContents[filename] = code;
          });
          initialFiles = Object.keys(initialContents);
        }

        set({
          projectData,
          checkpointProgress: initialProgress,
          currentCheckpoint: projectData.checkpoints[0]?.id || '',
          contents: initialContents,
          files: initialFiles,
          activeFile: initialFiles[0] || 'index.html'
        });
      },

      canNavigateToCheckpoint: (checkpointId) => {
        const state = get();
        if (!state.projectData) return false;
        
        // Find the index of the requested checkpoint
        const checkpointIndex = state.projectData.checkpoints.findIndex(cp => cp.id === checkpointId);
        if (checkpointIndex === 0) return true; // Can always access first checkpoint
        
        // Check if previous checkpoint is completed
        const previousCheckpoint = state.projectData.checkpoints[checkpointIndex - 1];
        if (!previousCheckpoint) return false;
        
        const previousProgress = state.checkpointProgress.find(
          cp => cp.checkpointId === previousCheckpoint.id
        );
        return previousProgress?.completed || false;
      },

      navigateToCheckpoint: (checkpointId) => {
        const state = get();
        if (!state.canNavigateToCheckpoint(checkpointId)) {
          return false; // Cannot navigate to this checkpoint
        }

        set({ currentCheckpoint: checkpointId });
        return true;
      }
    }),
    {
      name: 'project-store'
    }
  )
);
