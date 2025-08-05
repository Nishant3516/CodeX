// Enhanced validation utilities with better error detection and suggestions
export const validateHTML = (html: string): string[] => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Basic HTML validation
  const unclosedTags = html.match(/<(\w+)(?![^>]*\/>)[^>]*>/g) || [];
  const closedTags = html.match(/<\/(\w+)>/g) || [];
  
  const openTags = unclosedTags.map(tag => tag.match(/<(\w+)/)?.[1]).filter((tag): tag is string => Boolean(tag));
  const closeTags = closedTags.map(tag => tag.match(/<\/(\w+)>/)?.[1]).filter((tag): tag is string => Boolean(tag));
  
  // Self-closing tags that don't need closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  
  openTags.forEach(tag => {
    if (!closeTags.includes(tag) && !selfClosingTags.includes(tag)) {
      errors.push(`⚠️ Unclosed HTML tag: <${tag}>. Add </${tag}> to close it.`);
    }
  });
  
  // Check for missing DOCTYPE
  if (!html.includes('<!DOCTYPE') && html.includes('<html')) {
    suggestions.push('💡 Consider adding <!DOCTYPE html> at the beginning of your HTML document');
  }
  
  // Check for missing meta viewport
  if (html.includes('<head>') && !html.includes('viewport')) {
    suggestions.push('📱 Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile responsiveness');
  }
  
  // Check for missing lang attribute
  if (html.includes('<html') && !html.includes('lang=')) {
    suggestions.push('🌐 Add lang="en" attribute to <html> tag for accessibility');
  }
  
  // Check for missing title
  if (html.includes('<head>') && !html.includes('<title>')) {
    suggestions.push('📄 Add <title> tag inside <head> for better SEO');
  }
  
  // Check for common typos
  if (html.includes('charset="utf8"')) {
    errors.push('❌ Use charset="UTF-8" instead of "utf8"');
  }
  
  return [...errors, ...suggestions];
};

export const validateCSS = (css: string, checkSemicolons: boolean = false): string[] => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Basic CSS validation
  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('⚠️ Mismatched CSS braces. Check for missing { or }');
  }

  // Check for invalid property syntax
  const rules = css.match(/[^{}]+{[^{}]*}/g) || [];
  rules.forEach(rule => {
    const selector = rule.split('{')[0]?.trim();
    const content = rule.split('{')[1]?.split('}')[0];
    
    if (content) {
      const allProperties = content.split(/[;\n]/).filter(p => p.trim());
      
      allProperties.forEach((prop, index) => {
        const trimmedProp = prop.trim();
        if (trimmedProp && !trimmedProp.includes(':')) {
          errors.push(`❌ Invalid CSS property: "${trimmedProp}". Properties should be in format "property: value;"`);
        }
        
        // Only suggest semicolons if the setting is enabled and for properties that aren't the last one
        if (checkSemicolons && 
            trimmedProp && 
            !trimmedProp.endsWith(';') && 
            trimmedProp.includes(':')) {
          // Check if this is truly missing a semicolon (not the last property in a rule)
          const afterThisProperty = content.substring(content.indexOf(trimmedProp) + trimmedProp.length).trim();
          const nextCharAfterProperty = afterThisProperty.charAt(0);
          
          // Only suggest semicolon if there's another property after this one (indicated by letters/digits/-, not } or end)
          if (nextCharAfterProperty && nextCharAfterProperty !== '}' && /[a-zA-Z0-9-]/.test(nextCharAfterProperty)) {
            suggestions.push(`💡 Consider adding semicolon after "${trimmedProp}"`);
          }
        }        // Check for common property name typos
        const propertyName = trimmedProp.split(':')[0]?.trim();
        if (propertyName) {
          const commonTypos: Record<string, string> = {
            'colour': 'color',
            'centre': 'center',
            'margine': 'margin',
            'paddin': 'padding',
            'widht': 'width',
            'heigth': 'height',
            'backgroud': 'background',
            'bordor': 'border'
          };
          
          if (commonTypos[propertyName.toLowerCase()]) {
            errors.push(`❌ Did you mean "${commonTypos[propertyName.toLowerCase()]}" instead of "${propertyName}"?`);
          }
        }
      });
    }
    
    // Check for empty rules
    if (!content || !content.trim()) {
      suggestions.push(`💡 Empty CSS rule for "${selector}". Consider adding properties or removing the rule.`);
    }
  });
  
  // Check for missing CSS reset or normalize
  if (css.length > 50 && !css.includes('box-sizing') && !css.includes('margin: 0') && !css.includes('margin:0')) {
    suggestions.push('🎨 Consider adding CSS reset: * { margin: 0; padding: 0; box-sizing: border-box; }');
  }
  
  // Check for color accessibility
  const colorProps = css.match(/(color|background-color|background):\s*#[0-9a-fA-F]{3,6}/g) || [];
  if (colorProps.some(prop => prop.includes('#000') || prop.includes('#fff'))) {
    suggestions.push('♿ Consider using slightly off-black (#333) and off-white (#fafafa) colors for better readability');
  }
  
  return [...errors, ...suggestions];
};

export const validateJS = (js: string): string[] => {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  try {
    // Basic syntax check using Function constructor
    new Function(js);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown syntax error';
    errors.push(`❌ JavaScript syntax error: ${message}`);
  }
  
  // Check for common issues
  const openParens = (js.match(/\(/g) || []).length;
  const closeParens = (js.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    errors.push('⚠️ Mismatched parentheses in JavaScript. Check for missing ( or )');
  }
  
  const openBraces = (js.match(/{/g) || []).length;
  const closeBraces = (js.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push('⚠️ Mismatched braces in JavaScript. Check for missing { or }');
  }
  
  const openBrackets = (js.match(/\[/g) || []).length;
  const closeBrackets = (js.match(/]/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    errors.push('⚠️ Mismatched square brackets in JavaScript. Check for missing [ or ]');
  }
  
  // Check for common typos and issues
  const commonTypos: Record<string, string> = {
    'getElementByID': 'getElementById',
    'getElementByClass': 'getElementsByClassName',
    'addEventListner': 'addEventListener',
    'removeEventListner': 'removeEventListener',
    'querySeletor': 'querySelector',
    'querySeletorAll': 'querySelectorAll',
    'lenght': 'length',
    'puch': 'push',
    'undefiend': 'undefined',
    'funciton': 'function',
    'reutrn': 'return'
  };
  
  Object.entries(commonTypos).forEach(([typo, correct]) => {
    if (js.includes(typo)) {
      errors.push(`❌ Did you mean "${correct}" instead of "${typo}"?`);
    }
  });
  
  // Check for missing DOMContentLoaded
  if (js.includes('document.') && !js.includes('DOMContentLoaded') && !js.includes('window.onload')) {
    suggestions.push('🚀 Consider wrapping DOM manipulations in DOMContentLoaded event listener for better reliability');
  }
  
  // Check for missing semicolons
  const lines = js.split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed && 
        !trimmed.endsWith(';') && 
        !trimmed.endsWith('{') && 
        !trimmed.endsWith('}') && 
        !trimmed.startsWith('//') && 
        !trimmed.startsWith('/*') && 
        !trimmed.includes('if') && 
        !trimmed.includes('else') && 
        !trimmed.includes('for') && 
        !trimmed.includes('while') &&
        !trimmed.includes('function') &&
        trimmed.length > 3) {
      suggestions.push(`💡 Line ${index + 1}: Consider adding semicolon after "${trimmed}"`);
    }
  });
  
  // Check for console.log statements (suggest removing for production)
  const consoleCount = (js.match(/console\.(log|warn|error)/g) || []).length;
  if (consoleCount > 3) {
    suggestions.push('🧹 Consider removing console.log statements before deploying to production');
  }
  
  // Check for var usage (suggest let/const)
  if (js.includes('var ')) {
    suggestions.push('✨ Consider using "let" or "const" instead of "var" for better scoping');
  }
  
  // Check for == vs ===
  if (js.includes('==') && !js.includes('===')) {
    suggestions.push('⚡ Consider using "===" for strict equality comparison instead of "=="');
  }
  
  return [...errors, ...suggestions];
};

// Enhanced file linking suggestions
export const generateLinkSuggestions = (filename: string, allFiles: string[]): string[] => {
  const suggestions: string[] = [];
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'html') {
    const cssFiles = allFiles.filter(f => f.endsWith('.css'));
    const jsFiles = allFiles.filter(f => f.endsWith('.js'));
    
    if (cssFiles.length > 0) {
      suggestions.push('🎨 Link CSS files in <head>:');
      cssFiles.forEach(file => {
        suggestions.push(`   <link rel="stylesheet" href="${file}">`);
      });
    }
    
    if (jsFiles.length > 0) {
      suggestions.push('⚡ Link JavaScript files before </body>:');
      jsFiles.forEach(file => {
        suggestions.push(`   <script src="${file}"></script>`);
      });
    }
  }
  
  return suggestions;
};
