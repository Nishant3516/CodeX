import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const renderMarkdown = (text: string) => {
    // Convert markdown to HTML
    const html = marked(text);
    return { __html: html };
  };

  return (
    <div 
      className={`prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-200 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded ${className}`}
      style={{
        // Custom styles for better integration
        fontSize: 'inherit',
        lineHeight: 'inherit',
      }}
      dangerouslySetInnerHTML={renderMarkdown(content)}
    />
  );
};

// Custom hook for detecting markdown content
export const useMarkdownDetection = (text: string): boolean => {
  // Simple heuristics to detect if text contains markdown
  const markdownPatterns = [
    /\*\*.*?\*\*/,  // Bold
    /\*.*?\*/,      // Italic
    /`.*?`/,        // Code
    /^\s*[-*+]\s/m, // Lists
    /^\s*\d+\.\s/m, // Numbered lists
    /^#{1,6}\s/m,   // Headers
    /\[.*?\]\(.*?\)/, // Links
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
};

export default MarkdownRenderer;
