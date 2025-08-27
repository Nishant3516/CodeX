// Mock data for development and testing
export const mockFiles = {
  'src': {
    type: 'folder',
    path: 'src',
    isDir: true,
    children: {
      'index.html': { 
        type: 'file',
        path: 'src/index.html',
        isDir: false,
        content: `<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Hello World!</h1>
    <button onclick="handleClick()">Click me</button>
  </div>
  <script src="script.js"></script>
</body>
</html>` 
      },
      'styles.css': { 
        type: 'file',
        path: 'src/styles.css',
        isDir: false,
        content: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

#app {
  text-align: center;
  padding: 50px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}

button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #c0392b;
}` 
      },
      'script.js': { 
        type: 'file',
        path: 'src/script.js',
        isDir: false,
        content: `function handleClick() {
  alert("Hello from JavaScript!");
  console.log("Button clicked!");
}

console.log("App loaded successfully!");` 
      }
    }
  },
  'package.json': { 
    type: 'file',
    path: 'package.json',
    isDir: false,
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "src/index.html"
}` 
  },
  'README.md': { 
    type: 'file',
    path: 'README.md',
    isDir: false,
    content: `# My Project

This is a sample project created in the DevArena editor.

## Features
- HTML structure
- CSS styling
- JavaScript functionality

## Getting Started
Open \`src/index.html\` to get started!` 
  }
};

export const mockProgress = {
  current: 2,
  total: 5,
  checkpoints: [
    { id: 1, name: "Setup HTML structure", completed: true },
    { id: 2, name: "Add CSS styling", completed: true },
    { id: 3, name: "Implement JavaScript", completed: false },
    { id: 4, name: "Add responsive design", completed: false },
    { id: 5, name: "Deploy application", completed: false }
  ]
};

// Helper function to extract file contents from mock data
export const extractFileContents = (files: any): { [key: string]: string } => {
  const contents: { [key: string]: string } = {};
  
  const traverse = (obj: any, path = '') => {
    Object.entries(obj).forEach(([key, value]: [string, any]) => {
      const fullPath = path ? `${path}/${key}` : key;
      if (value.type === 'file') {
        contents[fullPath] = value.content;
      } else if (value.type === 'folder' && value.children) {
        traverse(value.children, fullPath);
      }
    });
  };
  
  traverse(files);
  return contents;
};
