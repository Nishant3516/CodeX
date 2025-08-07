export interface TestCase {
  testId: string;
  title: string;
  description: string;
  testCode: string;
}

export interface StoredProgress{
  projectId:string;
  checkPointProgress: CheckpointProgress[];
  files: {
    [fileName: string]: string;
  };
}

export interface TestResult {
  passed: boolean;
  message: string;
}

export interface Checkpoint {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  tests: TestCase[];
}

export interface ProjectData {
  projectId: string;
  title: string;
  description: string;
  requirements: string[];
  checkpoints: Checkpoint[];
  boilerplateCode: Record<string, string>; // Optional, can be set during initialization
}

export interface CheckpointProgress {
  checkpointId: string;
  completed: boolean;
  testsResults: {
    [testId: string]: TestResult;
  };
}
