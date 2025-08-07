import React, { FC, useEffect, useRef } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { applyCustomTheme } from '@/utils/monacoTheme';
import { SettingsState } from './SettingsModal';

type CodeEditorProps = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  files?: string[];
  settings?: SettingsState;
  allowDefaultContent?: boolean; // New prop to control default content behavior
};

// Enhanced CSS and JS snippets with linking examples
const getDefaultContent = (language: string, files: string[] = []) => {
  const cssFiles = files.filter(f => f.endsWith('.css'));
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  switch (language) {
    case 'html':
      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    ${cssFiles.map(file => `    <link rel="stylesheet" href="${file}">`).join('\n')}
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Project</h1>
        <p>Start building something amazing!</p>
        <button id="myButton">Click Me</button>
    </div>
    
    ${jsFiles.map(file => `    <script src="${file}"></script>`).join('\n')}
</body>
</html>`;

    case 'css':
      return `/* Stylesheet for your project */

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

h1 {
    color: #333;
    text-align: center;
    margin-bottom: 20px;
}

p {
    color: #666;
    line-height: 1.6;
    margin-bottom: 20px;
}

button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background-color: #0056b3;
}`;

    case 'javascript':
      return `// JavaScript for your project

document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded successfully!');
    
    // Get button element
    const button = document.getElementById('myButton');
    
    // Add click event listener
    if (button) {
        button.addEventListener('click', function() {
            alert('Hello! Button clicked!');
        });
    }
});

// Add your custom functions here
function myCustomFunction() {
    // Your code here
}`;

    default:
      return '';
  }
};

const CodeEditor: FC<CodeEditorProps> = ({ language, value, onChange, files = [], settings, allowDefaultContent = false }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  const handleChange: OnChange = (val) => {
    onChange(val || '');
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    
    // Apply custom theme with enhanced syntax highlighting
    applyCustomTheme(monacoInstance);
    
    // Configure enhanced language features
    configureLanguageFeatures(monacoInstance, language);
    
    // Add custom error detection
    setupErrorDetection(editor, monacoInstance, language);
  };

  const configureLanguageFeatures = (monacoInstance: typeof monaco, lang: string) => {
    // Enhanced CSS configuration
    if (lang === 'css') {
      monacoInstance.languages.css.cssDefaults.setOptions({
        validate: true,
        lint: {
          compatibleVendorPrefixes: 'warning',
          vendorPrefix: 'warning',
          duplicateProperties: 'warning',
          emptyRules: 'warning',
          importStatement: 'warning',
          boxModel: 'warning',
          universalSelector: 'warning',
          zeroUnits: 'warning',
          fontFaceProperties: 'warning',
          hexColorLength: 'warning',
          argumentsInColorFunction: 'warning',
          unknownProperties: 'warning',
          ieHack: 'warning',
          unknownVendorSpecificProperties: 'warning',
          propertyIgnoredDueToDisplay: 'warning',
          important: 'warning',
          float: 'warning',
          idSelector: 'warning'
        }
      });
    }

    // Enhanced JavaScript configuration
    if (lang === 'javascript') {
      monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        typeRoots: ["node_modules/@types"]
      });

      monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false
      });
    }

    // Enhanced HTML configuration
    if (lang === 'html') {
      monacoInstance.languages.html.htmlDefaults.setOptions({
        format: {
          tabSize: 2,
          insertSpaces: true,
          wrapLineLength: 120,
          unformatted: 'default"',
          contentUnformatted: 'pre,code,textarea',
          indentInnerHtml: false,
          preserveNewLines: true,
          maxPreserveNewLines: 2,
          indentHandlebars: false,
          endWithNewline: false,
          extraLiners: 'head, body, /html',
          wrapAttributes: 'auto'
        },
        suggest: { html5: true, angular1: false, ionic: false }
      });
    }
  };

  const setupErrorDetection = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco, lang: string) => {
    // Custom error markers for better visibility
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;

      const markers: monaco.editor.IMarkerData[] = [];
      const content = model.getValue();

      // Custom CSS validation
      if (lang === 'css') {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for common CSS errors
          if (line.includes('{') && !line.includes('}') && !lines[index + 1]?.includes('}')) {
            const nextBraceIndex = lines.findIndex((l, i) => i > index && l.includes('}'));
            if (nextBraceIndex === -1) {
              markers.push({
                severity: monacoInstance.MarkerSeverity.Error,
                startLineNumber: index + 1,
                startColumn: line.indexOf('{') + 1,
                endLineNumber: index + 1,
                endColumn: line.length + 1,
                message: 'Missing closing brace "}"'
              });
            }
          }

          // Check for missing semicolons in property declarations
          if (line.includes(':') && !line.includes(';') && !line.includes('{') && !line.includes('}') && line.trim()) {
            markers.push({
              severity: monacoInstance.MarkerSeverity.Warning,
              startLineNumber: index + 1,
              startColumn: 1,
              endLineNumber: index + 1,
              endColumn: line.length + 1,
              message: 'Missing semicolon ";" at the end of declaration'
            });
          }

          // Check for invalid property names
          const propertyMatch = line.match(/^\s*([a-zA-Z-]+)\s*:/);
          if (propertyMatch) {
            const property = propertyMatch[1];
            const validProperties = ['color', 'background', 'font-size', 'margin', 'padding', 'border', 'width', 'height', 'display', 'position', 'flex', 'grid'];
            if (!validProperties.some(p => property.startsWith(p)) && !property.startsWith('-webkit-') && !property.startsWith('-moz-')) {
              markers.push({
                severity: monacoInstance.MarkerSeverity.Info,
                startLineNumber: index + 1,
                startColumn: 1,
                endLineNumber: index + 1,
                endColumn: property.length + 1,
                message: `Unknown property "${property}". Verify spelling or check if it's a valid CSS property.`
              });
            }
          }
        });
      }

      // Custom JavaScript validation
      if (lang === 'javascript') {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Check for missing semicolons
          if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && !line.trim().endsWith('}') && !line.includes('//') && !line.includes('if') && !line.includes('else') && !line.includes('for') && !line.includes('while')) {
            markers.push({
              severity: monacoInstance.MarkerSeverity.Info,
              startLineNumber: index + 1,
              startColumn: line.length,
              endLineNumber: index + 1,
              endColumn: line.length + 1,
              message: 'Consider adding a semicolon ";" at the end of this statement'
            });
          }

          // Check for common typos
          if (line.includes('document.getElementByID')) {
            markers.push({
              severity: monacoInstance.MarkerSeverity.Error,
              startLineNumber: index + 1,
              startColumn: line.indexOf('getElementByID') + 1,
              endLineNumber: index + 1,
              endColumn: line.indexOf('getElementByID') + 'getElementByID'.length + 1,
              message: 'Did you mean "getElementById"? (lowercase "d")'
            });
          }
        });
      }

      monacoInstance.editor.setModelMarkers(model, 'customLint', markers);
    });
  };

  // Set default content if value is empty and allowed
  useEffect(() => {
    if (!value && language && allowDefaultContent) {
      const defaultContent = getDefaultContent(language, files);
      if (defaultContent) {
        onChange(defaultContent);
      }
    }
  }, [language, files, value, onChange, allowDefaultContent]);

  return (
    <div className="h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        theme="enhanced-dark"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          automaticLayout: true,
          fontSize: settings?.fontSize || 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'Monaco', 'Menlo', monospace",
          minimap: { enabled: settings?.showMinimap || false },
          wordWrap: settings?.wordWrap ? 'on' : 'off',
          lineNumbers: settings?.lineNumbers ? 'on' : 'off',
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          folding: true,
          autoIndent: 'full',
          formatOnPaste: settings?.cssAutoSemicolon || true,
          formatOnType: settings?.cssAutoSemicolon || true,
          tabSize: settings?.tabSize || 2,
          insertSpaces: true,
          detectIndentation: false,
          // Enhanced syntax highlighting
          colorDecorators: true,
          links: true,
          // Better error visualization
          renderValidationDecorations: 'on',
          showUnused: true,
          showDeprecated: true,
          // Enhanced IntelliSense
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          snippetSuggestions: 'top',
          // Better editing experience
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoSurround: 'languageDefined',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            bracketPairsHorizontal: true,
            highlightActiveBracketPair: true,
            indentation: true
          },
          // Enhanced formatting
          trimAutoWhitespace: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
