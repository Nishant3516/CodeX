import { SupportedLanguage, FileSystemItem } from '@/types/editor';

// File utilities
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

export const getLanguageFromFile = (fileName: string): SupportedLanguage => {
  const ext = getFileExtension(fileName);
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

export const getFileIconColor = (fileName: string): string => {
  const ext = getFileExtension(fileName);
  
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text-red-400';
    case 'css':
      return 'text-blue-400';
    case 'js':
    case 'jsx':
      return 'text-yellow-400';
    case 'json':
      return 'text-green-400';
    case 'md':
    case 'markdown':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
};

// File system utilities
export const extractFileContents = (files: { [key: string]: FileSystemItem }): { [key: string]: string } => {
  const contents: { [key: string]: string } = {};
  
  const traverse = (obj: { [key: string]: FileSystemItem }, path = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const fullPath = path ? `${path}/${key}` : key;
      if (value.type === 'file') {
        contents[fullPath] = value.content || '';
      } else if (value.type === 'folder' && value.children) {
        traverse(value.children, fullPath);
      }
    });
  };
  
  traverse(files);
  return contents;
};

export const createPreviewContent = (
  htmlContent: string,
  cssContent: string,
  jsContent: string
): string => {
  // Clean HTML content by removing external links and scripts
  const cleanedHtml = htmlContent
    .replace(/<link[^>]*>/gi, '')
    .replace(/<script[^>]*>[^<]*<\/script>/gi, '');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>${cssContent}</style>
      </head>
      <body>
        ${cleanedHtml}
        <script>
          // Prevent errors from breaking the preview
          window.addEventListener('error', function(e) {
            console.error('Preview Error:', e.error);
          });
          
          ${jsContent}
        </script>
      </body>
    </html>
  `;
};

// Time utilities
export const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Animation utilities
export const getSlideAnimation = (direction: 'up' | 'down' | 'left' | 'right' = 'up') => {
  const animations = {
    up: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 }
    },
    down: {
      initial: { opacity: 0, y: -10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 10 }
    },
    left: {
      initial: { opacity: 0, x: 10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -10 }
    },
    right: {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 10 }
    }
  };
  
  return animations[direction];
};

// Local storage utilities
export const saveToLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

// Debounce utility for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
