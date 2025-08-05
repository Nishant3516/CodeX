export interface TestCase {
  testId: number;
  title: string;
  description: string;
  testCode: string;
}

export interface TestResult {
  passed: boolean;
  message: string;
}

export interface Checkpoint {
  id: number;
  title: string;
  description: string;
  requirements: string[];
  boilerplateCode: {
    [filename: string]: string;
  };
  tests: TestCase[];
}

export interface ProjectData {
  projectId: string;
  title: string;
  description: string;
  requirements: string[];
  checkpoints: Checkpoint[];
}

export interface CheckpointProgress {
  checkpointId: number;
  completed: boolean;
  testsResults: {
    [testId: number]: TestResult;
  };
}
