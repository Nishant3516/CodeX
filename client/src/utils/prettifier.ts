// Enhanced code prettification using Prettier
import prettier from 'prettier/standalone';
import htmlParser from 'prettier/plugins/html';
import cssParser from 'prettier/plugins/postcss';
import jsParser from 'prettier/plugins/babel';
import estree from 'prettier/plugins/estree';

const prettifyWithPrettier = async (code: string, language: string): Promise<string> => {
  try {
    let parser: string;
    let plugins: any[];

    switch (language.toLowerCase()) {
      case 'html':
        parser = 'html';
        plugins = [htmlParser];
        break;
      case 'css':
        parser = 'css';
        plugins = [cssParser];
        break;
      case 'javascript':
      case 'js':
        parser = 'babel';
        plugins = [jsParser, estree];
        break;
      default:
        return code;
    }

    const formatted = await prettier.format(code, {
      parser,
      plugins,
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      quoteProps: 'as-needed',
      trailingComma: 'es5',
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: 'avoid',
      htmlWhitespaceSensitivity: 'css',
      endOfLine: 'lf',
    });

    return formatted;
  } catch (error) {
    console.warn('Prettier formatting failed, falling back to basic formatter:', error);
    return fallbackPrettify(code, language);
  }
};

// Fallback formatter for when Prettier fails
const fallbackPrettify = (code: string, language: string): string => {
  try {
    switch (language.toLowerCase()) {
      case 'html':
        return prettifyHTML(code);
      case 'css':
        return prettifyCSS(code);
      case 'javascript':
      case 'js':
        return prettifyJavaScript(code);
      default:
        return code;
    }
  } catch (error) {
    console.warn('Fallback formatting failed:', error);
    return code;
  }
};

const prettifyHTML = (code: string): string => {
  let formatted = code;
  let indent = 0;
  const indentSize = 2;
  
  // Remove extra whitespace
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Add newlines after closing tags and before opening tags
  formatted = formatted.replace(/></g, '>\n<');
  
  const lines = formatted.split('\n');
  const result: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Decrease indent for closing tags
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - indentSize);
    }
    
    // Add indented line
    result.push(' '.repeat(indent) + trimmed);
    
    // Increase indent for opening tags (but not self-closing)
    if (trimmed.match(/<\w+/) && !trimmed.includes('/>') && !trimmed.includes('</')) {
      const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
      const tagMatch = trimmed.match(/<(\w+)/);
      if (tagMatch && !selfClosingTags.includes(tagMatch[1].toLowerCase())) {
        indent += indentSize;
      }
    }
  });
  
  return result.join('\n');
};

const prettifyCSS = (code: string): string => {
  let formatted = code;
  
  // Remove extra whitespace
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Add proper spacing around braces and semicolons
  formatted = formatted.replace(/\{/g, ' {\n');
  formatted = formatted.replace(/\}/g, '\n}\n\n');
  formatted = formatted.replace(/;(?!\s*\})/g, ';\n');
  formatted = formatted.replace(/,(?!\s*\})/g, ',\n');
  
  const lines = formatted.split('\n');
  const result: string[] = [];
  let inRule = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!inRule) result.push('');
      return;
    }
    
    if (trimmed.includes('{')) {
      inRule = true;
      result.push(trimmed);
    } else if (trimmed === '}') {
      inRule = false;
      result.push(trimmed);
    } else if (inRule) {
      // Indent properties and ensure semicolon
      let property = trimmed;
      if (property.includes(':') && !property.endsWith(';')) {
        property += ';';
      }
      result.push('  ' + property);
    } else {
      // Comments and selectors
      result.push(trimmed);
    }
  });
  
  return result.join('\n').replace(/\n\n\n+/g, '\n\n').trim();
};

const prettifyJavaScript = (code: string): string => {
  let formatted = code;
  let indent = 0;
  const indentSize = 2;
  
  // Basic formatting - add newlines after semicolons and braces
  formatted = formatted.replace(/;(?!\s*\/\/|\s*$)/g, ';\n');
  formatted = formatted.replace(/\{(?!\s*\})/g, ' {\n');
  formatted = formatted.replace(/\}(?!\s*[,;)])/g, '\n}\n');
  
  const lines = formatted.split('\n');
  const result: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Decrease indent for closing braces
    if (trimmed === '}' || trimmed.startsWith('}')) {
      indent = Math.max(0, indent - indentSize);
    }
    
    // Add indented line
    result.push(' '.repeat(indent) + trimmed);
    
    // Increase indent after opening braces
    if (trimmed.includes('{') && !trimmed.includes('}')) {
      indent += indentSize;
    }
  });
  
  return result.join('\n').replace(/\n\n\n+/g, '\n\n');
};

export const prettifyCode = async (code: string, language: string): Promise<string> => {
  // First try with Prettier
  const prettierResult = await prettifyWithPrettier(code, language);
  return prettierResult;
};
