// Helper functions for fetching project data and assets

export interface RawCheckpoint {
  id: string;
  title: string;
  description: string;
  boiler_plate_code: string;
  testing_code: string;
  requirements: string[];
}

export interface RawQuest {
  id: string;
  name: string;
  description: string;
  boiler_plate_code:string;
  image: string;
  category_id: string;
  category: any;
  tech_stack: any[];
  topics: any[];
  difficulty_id: string;
  difficulty: any;
  final_test_code: string;
  checkpoints: RawCheckpoint[];
  requirements: string[];
}



export async function fetchQuest(projectID: string): Promise<RawQuest> {
  const res = await fetch(`/api/project/${projectID}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch project: ${res.statusText}`);
  }
  return res.json();
}



// Fetch all checkpoint assets and boilerplate code in parallel
export async function fetchCheckpointAssets(
  checkpoints: RawCheckpoint[], 
  boilerplateZipUrl: string,
  projectId?: string
): Promise<{
  checkpoints: Array<{
    id: string;
    title: string;
    description: string;
    requirements: string[];
    tests: Array<{
      testId: string;
      title: string;
      description: string;
      testCode: string;
    }>;
  }>;
  boilerplateCode: Record<string, string>;
}> {
  const assetsPromise = fetchCheckpointAssetsInternal(checkpoints, boilerplateZipUrl);  
  return assetsPromise;
}

async function fetchCheckpointAssetsInternal(
  checkpoints: RawCheckpoint[], 
  boilerplateZipUrl: string
): Promise<{
  checkpoints: Array<{
    id: string;
    title: string;
    description: string;
    requirements: string[];
    tests: Array<{
      testId: string;
      title: string;
      description: string;
      testCode: string;
    }>;
  }>;
  boilerplateCode: Record<string, string>;
}> {
  try {
    // Fetch boilerplate ZIP and all checkpoint test files in parallel
    const [boilerRes, ...testResponses] = await Promise.all([
      fetch(boilerplateZipUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip, application/octet-stream, */*'
        }
      }),
      ...checkpoints.map(cp => 
        fetch(cp.testing_code, {
          method: 'GET',
          headers: {
            'Accept': 'text/javascript, text/plain, */*'
          }
        })
      )
    ]);

    // Check if boilerplate fetch was successful
    if (!boilerRes.ok) {
      throw new Error(`Failed to fetch boilerplate: ${boilerRes.status} ${boilerRes.statusText}`);
    }

    // Check if all test fetches were successful
    for (let i = 0; i < testResponses.length; i++) {
      if (!testResponses[i].ok) {
        throw new Error(`Failed to fetch test for checkpoint ${checkpoints[i].id}: ${testResponses[i].status} ${testResponses[i].statusText}`);
      }
    }

    // Extract boilerplate ZIP
    const zipArrayBuffer = await boilerRes.arrayBuffer();

    // Validate that we actually got a ZIP file
    if (zipArrayBuffer.byteLength < 22) {
      console.warn("Response too small to be a valid ZIP file, using fallback");
      throw new Error("Invalid ZIP file: too small");
    }

    const boilerplateCode = await extractZipFiles(zipArrayBuffer);

    // Process all test responses in parallel
    const testTexts = await Promise.all(
      testResponses.map(response => response.text())
    );

    // Process checkpoints with their test data
    const processedCheckpoints = checkpoints.map((cp, index) => {
      const testText = testTexts[index];

      const testFunctions = extractTestFunctions(testText);

      const tests = testFunctions.map((testFunc, testIndex) => ({
        testId: `${cp.id}-${testIndex + 1}`,
        title: testFunc.name || `Test ${testIndex + 1}`,
        description: testFunc.description || `Test for ${cp.title}`,
        testCode: testFunc.code,
      }));

      return {
        id: cp.id,
        title: cp.title,
        description: cp.description,
        requirements: cp.requirements,
        tests,
      };
    });

    const result = {
      checkpoints: processedCheckpoints,
      boilerplateCode,
    };
    
    return result;
    
  } catch (error) {
    console.error("Error fetching checkpoint assets:", error);
    
    // Return default data instead of throwing
    const defaultBoilerplate = getDefaultBoilerplate();
    const defaultCheckpoints = checkpoints.map(cp => {
      const testFunctions = extractTestFunctions("// Default test function\nfunction defaultTest() { return { passed: true, message: 'Default test' }; }");
      
      const tests = testFunctions.map((testFunc, index) => ({
        testId: `${cp.id}-${index + 1}`,
        title: testFunc.name || `Test ${index + 1}`,
        description: testFunc.description || `Test for ${cp.title}`,
        testCode: testFunc.code,
      }));

      return {
        id: cp.id,
        title: cp.title,
        description: cp.description,
        requirements: cp.requirements,
        tests,
      };
    });

    return {
      checkpoints: defaultCheckpoints,
      boilerplateCode: defaultBoilerplate,
    };
  }
}

// More robust ZIP file extraction
async function extractZipFiles(zipData: ArrayBuffer | Blob): Promise<Record<string, string>> {
  try {
    // Import JSZip dynamically
    const JSZip = (await import("jszip")).default;
    
    // Convert ArrayBuffer to Blob if needed
    const zipBlob = zipData instanceof ArrayBuffer ? new Blob([zipData]) : zipData;
    
    // Check for ZIP file signature in the first few bytes
    const firstBytes = zipData instanceof ArrayBuffer ? 
      new Uint8Array(zipData.slice(0, 4)) : 
      new Uint8Array(await zipData.slice(0, 4).arrayBuffer());
    
    // ZIP file should start with PK (0x504B)
    if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4B) {
      console.warn("File doesn't have ZIP signature, treating as invalid");
      throw new Error("Not a valid ZIP file - missing ZIP signature");
    }
    
    // Load the ZIP file
    const zip = await JSZip.loadAsync(zipBlob);
    
    
    const boilerplateCode: Record<string, string> = {};
    
    // Map expected files to standard names
    const fileMapping: Record<string, string> = {
      'index.html': 'index.html',
      'styles.css': 'styles.css', 
      'script.js': 'script.js',
      // Handle different naming patterns
      'boiler-plate.html': 'index.html',
      'boiler-plate.css': 'styles.css',
      'boiler-plate.js': 'script.js',
      // Handle folder structures
      'boilerplate/index.html': 'index.html',
      'boilerplate/styles.css': 'styles.css',
      'boilerplate/script.js': 'script.js',
    };
    
    // Process all files in the ZIP
    for (const [fileName, zipFile] of Object.entries(zip.files)) {
      // Skip directories
      if (zipFile.dir) {
        continue;
      }

      try {
        const content = await zipFile.async("text");
        
        // Determine the standard file name
        let standardName = fileMapping[fileName];
        
        // If no direct mapping, try to infer from extension
        if (!standardName) {
          const lowerFileName = fileName.toLowerCase();
          if (lowerFileName.includes('.html') || lowerFileName.includes('.htm')) {
            standardName = 'index.html';
          } else if (lowerFileName.includes('.css')) {
            standardName = 'styles.css';
          } else if (lowerFileName.includes('.js')) {
            standardName = 'script.js';
          } else {
            // Use original filename if we can't map it
            standardName = fileName;
          }
        }
        
        boilerplateCode[standardName] = content;
        
      } catch (fileError) {
        console.error(`Error extracting file ${fileName}:`, fileError);
      }
    }
    
    // Ensure we have the three required files in the correct order (HTML, CSS, JS)
    const orderedBoilerplate: Record<string, string> = {};
    
    // Always add in this order
    orderedBoilerplate['index.html'] = boilerplateCode['index.html'] || getDefaultHtml();
    orderedBoilerplate['styles.css'] = boilerplateCode['styles.css'] || getDefaultCss();
    orderedBoilerplate['script.js'] = boilerplateCode['script.js'] || getDefaultJs();
    
    // Add any other files that were in the ZIP
    for (const [fileName, content] of Object.entries(boilerplateCode)) {
      if (!orderedBoilerplate[fileName]) {
        orderedBoilerplate[fileName] = content;
      }
    }
    
    return orderedBoilerplate;
    
  } catch (zipError) {
    console.error("ZIP EXTRACTION ERROR:", zipError);
    
    // Fallback: return default files if ZIP extraction fails
    return getDefaultBoilerplate();
  }
}

// Helper function to get default boilerplate files in correct order
function getDefaultBoilerplate(): Record<string, string> {
  const ordered: Record<string, string> = {};
  ordered['index.html'] = getDefaultHtml();
  ordered['styles.css'] = getDefaultCss();
  ordered['script.js'] = getDefaultJs();
  return ordered;
}

function getDefaultHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Todo App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Add your HTML here -->
  <script src="script.js"></script>
</body>
</html>`;
}

function getDefaultCss(): string {
  return `/* Add your CSS styles here */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}`;
}

function getDefaultJs(): string {
  return `// Add your JavaScript here
console.log("Todo app loaded");`;
}

function extractTestFunctions(
  testCode: string
): Array<{ name: string; description: string; code: string }> {
  const functions: Array<{ name: string; description: string; code: string }> = [];

  // Enhanced regex to find function declarations (including arrow functions)
  const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;

  while ((match = functionRegex.exec(testCode)) !== null) {
    const functionName = match[1];
    const functionCode = match[0];

    // Extract description from comments above function (if any)
    const beforeFunction = testCode.substring(0, match.index);
    const lines = beforeFunction.split("\n");
    let description = `Test function ${functionName}`;

    // Look for comment in the lines before function
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("//")) {
        description = line.replace("//", "").trim();
        break;
      }
      if (line !== "" && !line.startsWith("*") && !line.startsWith("/*")) {
        break; // Stop at first non-empty, non-comment line
      }
    }

    functions.push({
      name: functionName,
      description,
      code: functionCode,
    });
  }

  // If no functions found, treat entire code as single test
  if (functions.length === 0) {
    functions.push({
      name: "test",
      description: "Test function",
      code: testCode,
    });
  }

  return functions;
}