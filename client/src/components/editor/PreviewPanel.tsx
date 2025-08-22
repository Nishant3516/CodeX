"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye,
  RotateCcw,
  Download
} from 'lucide-react';

interface PreviewPanelProps {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function PreviewPanel({ 
  htmlContent, 
  cssContent, 
  jsContent, 
  onRefresh,
  onExport 
}: PreviewPanelProps) {
  
  const getPreviewContent = () => {
    // Clean HTML content by removing external links and scripts
    const cleanedHtml = htmlContent
      .replace(/<link[^>]*>/gi, '')
      .replace(/<script[^>]*>[^<]*<\/script>/gi, '');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent}</style>
        </head>
        <body>
          ${cleanedHtml}
          <script>${jsContent}</script>
        </body>
      </html>
    `;
  };

  return (
    <div className="h-full bg-white">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 border-b border-purple-600/30 flex items-center justify-between">
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-2 text-purple-400" />
          <span className="text-white font-medium">Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Refresh Preview"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onExport}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Export Project"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      <iframe
        srcDoc={getPreviewContent()}
        className="w-full h-full border-none"
        sandbox="allow-scripts"
        title="Preview"
      />
    </div>
  );
}
