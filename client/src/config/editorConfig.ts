// Editor configuration for easy customization
export const editorConfig = {
  // Color scheme
  colors: {
    primary: '#a855f7',      // Purple
    secondary: '#ef4444',    // Red
    background: '#000000',   // Black
    surface: '#1e293b',      // Dark gray
    border: '#6b21a8',       // Purple border
    text: {
      primary: '#ffffff',
      secondary: '#e2e8f0',
      muted: '#64748b'
    }
  },

  // Panel sizes (percentages)
  panels: {
    fileExplorer: {
      default: 20,
      min: 15,
      max: 30
    },
    codeEditor: {
      default: 50,
      min: 30
    },
    rightPanel: {
      default: 30,
      min: 20
    },
    preview: {
      default: 60,
      min: 30
    },
    terminal: {
      default: 40,
      min: 20
    }
  },

  // Editor settings
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    minimap: false,
    lineNumbers: 'on',
    theme: 'vs-dark'
  },

  // Animation settings
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    },
    easing: 'ease-out'
  },

  // File icons mapping
  fileIcons: {
    html: { color: '#ef4444', icon: 'File' }, // Red
    css: { color: '#3b82f6', icon: 'File' },  // Blue
    js: { color: '#eab308', icon: 'File' },   // Yellow
    json: { color: '#10b981', icon: 'File' }, // Green
    md: { color: '#6b7280', icon: 'File' },   // Gray
    default: { color: '#6b7280', icon: 'File' }
  },

  // Console log colors
  console: {
    info: '#6b7280',
    success: '#10b981',
    error: '#ef4444',
    warning: '#eab308'
  }
};

// Theme variants for easy switching
export const themes = {
  purpleRedBlack: {
    name: 'Purple Red Black',
    colors: {
      primary: '#a855f7',
      secondary: '#ef4444',
      background: '#000000',
      surface: '#1e293b',
      border: '#6b21a8'
    }
  },
  
  darkBlue: {
    name: 'Dark Blue',
    colors: {
      primary: '#3b82f6',
      secondary: '#06b6d4',
      background: '#0f172a',
      surface: '#1e293b',
      border: '#1d4ed8'
    }
  },
  
  darkGreen: {
    name: 'Dark Green',
    colors: {
      primary: '#10b981',
      secondary: '#f59e0b',
      background: '#064e3b',
      surface: '#065f46',
      border: '#047857'
    }
  }
};

export type EditorTheme = keyof typeof themes;
