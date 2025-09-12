import { TestCase, TestResult } from '@/types/project';

export class TestRunner {
  private iframe: HTMLIFrameElement | null = null;

  constructor(iframe: HTMLIFrameElement | null) {
    this.iframe = iframe;
  }

  async runTest(testCase: TestCase): Promise<TestResult> {
    if (!this.iframe || !this.iframe.contentWindow) {
      return {
        passed: false,
        message: 'Test environment not available - iframe not ready'
      };
    }

    try {
      // Safely construct the test function with proper escaping
      const functionName = this.extractFunctionName(testCase.testCode);
      const testFunction = `
        // Injected test code
        ${testCase.testCode}
        
        // Execute the test function (supports sync and Promise-based tests)
        (async function() {
          try {
            const maybeResult = ${functionName}();
            const isPromise = !!(maybeResult && typeof maybeResult.then === 'function');
         
            const result = isPromise ? await maybeResult : maybeResult;

            // Normalize common simple returns
            let normalized = result;
            if (typeof result === 'boolean') {
              normalized = { passed: result, message: result ? 'Test passed' : 'Test failed' };
            } else if (typeof result === 'string') {
              normalized = { passed: true, message: result };
            }

            if (normalized && typeof normalized === 'object' && 'passed' in normalized) {
              window.parent.postMessage({
                type: 'test-result',
                testId: ${JSON.stringify(testCase.testId)},
                result: normalized
              }, '*');
            } else {

              window.parent.postMessage({
                type: 'test-result',
                testId: ${JSON.stringify(testCase.testId)},
                result: { passed: false, message: 'Test function did not return a valid result object. Expected: {passed: boolean, message: string}. Got: ' + JSON.stringify(normalized ?? null) }
              }, '*');
            }
          } catch (error) {
            console.error('[TestRunner] Test execution error:', error);
            window.parent.postMessage({
              type: 'test-result',
              testId: ${JSON.stringify(testCase.testId)},
              result: { passed: false, message: 'Test execution error: ' + (error && error.message ? error.message : String(error)) }
            }, '*');
          }
        })();
      `;
      // Create a promise that resolves when we receive the test result
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve({
            passed: false,
            message: 'Test timeout - check if required HTML elements exist and JavaScript is working'
          });
  }, 8000); // Increased timeout to 8 seconds to allow async UI/fetch flows

        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'test-result' && event.data.testId === testCase.testId) {
            clearTimeout(timeoutId);
            window.removeEventListener('message', messageHandler);
            resolve(event.data.result);
          }
        };

        window.addEventListener('message', messageHandler);

        // Use postMessage for script injection
        this.iframe!.contentWindow!.postMessage({
          type: 'inject-test-script',
          testId: testCase.testId,
          script: testFunction
        }, '*');
      });

    } catch (error) {
      return {
        passed: false,
        message: `Test setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async runAllTests(testCases: TestCase[]): Promise<{ [testId: string]: TestResult }> {
    const results: { [testId: string]: TestResult } = {};
    console.log("Running all tests...", testCases);
    // Check if iframe exists
    if (!this.iframe) {
      for (const testCase of testCases) {
        results[testCase.testId] = {
          passed: false,
          message: 'Iframe not available - please run your code first'
        };
      }
      return results;
    }

    // Wait for iframe to be ready (but don't fail if timeout)
    try {
      await this.waitForIframeLoad();
    } catch (error) {
      // Don't return early, proceed with tests anyway
      console.error('Error waiting for iframe load:', error);
    }

    for (const testCase of testCases) {
      results[testCase.testId] = await this.runTest(testCase);
      // Small delay between tests to prevent overwhelming the iframe
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  private extractFunctionName(testCode: string): string {

    // Pattern 1: function functionName()
    let match = testCode.match(/function\s+(\w+)\s*\(/);
    if (match) {
      return match[1];
    }
    
    // Pattern 2: const functionName = function()
    match = testCode.match(/(?:const|let|var)\s+(\w+)\s*=\s*function/);
    if (match) {
      return match[1];
    }
    
    // Pattern 3: const functionName = () =>
    match = testCode.match(/(?:const|let|var)\s+(\w+)\s*=\s*\(/);
    if (match) {
      return match[1];
    }
    

    return 'testFunction';
  }

  private async waitForIframeLoad(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(); // Don't reject, just resolve to allow tests to proceed
      }, 3000); // Reduced timeout to 3 seconds

      // Check if iframe is already ready
      const checkIframeReady = () => {
        try {
          // First try contentDocument
          if (this.iframe && this.iframe.contentDocument && this.iframe.contentDocument.readyState === 'complete') {
            clearTimeout(timeout);
            setTimeout(() => resolve(), 200); // Small delay to ensure DOM is fully ready
            return true;
          }
          
          // Then try contentWindow.document
          if (this.iframe && this.iframe.contentWindow && this.iframe.contentWindow.document && this.iframe.contentWindow.document.readyState === 'complete') {
            clearTimeout(timeout);
            setTimeout(() => resolve(), 200);
            return true;
          }
        } catch (error) {
          // Continue waiting for message
        }
        return false;
      };

      // Immediate check
      if (checkIframeReady()) {
        return;
      }

      // Listen for iframe-ready message as fallback
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'iframe-ready') {
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
          setTimeout(() => resolve(), 200);
        }
      };

      window.addEventListener('message', messageHandler);
      
      // Periodic check as backup
      const checkInterval = setInterval(() => {
        if (checkIframeReady()) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
        }
      }, 100);

      // Clear interval when timeout occurs
      setTimeout(() => {
        clearInterval(checkInterval);
        window.removeEventListener('message', messageHandler);
      }, 3000);
    });
  }

  // Helper method to check if required DOM elements exist before running tests
  static async validateRequiredElements(requirements: string[], iframe: HTMLIFrameElement): Promise<TestResult[]> {
    if (!iframe.contentWindow || !iframe.contentDocument) {
      return [{ passed: false, message: 'Cannot access iframe content' }];
    }

    const results: TestResult[] = [];
    const doc = iframe.contentDocument;

    for (const requirement of requirements) {
      // Parse requirements to check for specific elements
      if (requirement.includes('id=')) {
        const idMatch = requirement.match(/id=['"](.*?)['"]/);
        if (idMatch) {
          const element = doc.getElementById(idMatch[1]);
          results.push({
            passed: !!element,
            message: element ? `✅ Element with id="${idMatch[1]}" found` : `❌ Element with id="${idMatch[1]}" not found - add it to your HTML`
          });
        }
      }
      
      if (requirement.includes('class=')) {
        const classMatch = requirement.match(/class=['"](.*?)['"]/);
        if (classMatch) {
          const elements = doc.getElementsByClassName(classMatch[1]);
          results.push({
            passed: elements.length > 0,
            message: elements.length > 0 ? `✅ Elements with class="${classMatch[1]}" found` : `❌ No elements with class="${classMatch[1]}" found - add them to your HTML`
          });
        }
      }
    }

    return results;
  }
}
