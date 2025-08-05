// Enhanced Monaco Editor theme with better CSS and JavaScript highlighting
export const customDarkTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    // CSS specific enhancements
    { token: 'keyword.css', foreground: '569cd6' }, // CSS keywords (e.g., @media, @import)
    { token: 'support.type.property-name.css', foreground: '9cdcfe' }, // CSS property names
    { token: 'support.constant.property-value.css', foreground: 'ce9178' }, // CSS property values
    { token: 'punctuation.definition.entity.css', foreground: 'dcdcaa' }, // CSS selectors
    { token: 'entity.other.attribute-name.class.css', foreground: 'd7ba7d' }, // CSS class names
    { token: 'entity.other.attribute-name.id.css', foreground: 'ffd700' }, // CSS ID selectors
    { token: 'support.constant.color.w3c-standard-color-name.css', foreground: '4ec9b0' }, // CSS color names
    { token: 'constant.numeric.css', foreground: 'b5cea8' }, // CSS numbers
    { token: 'keyword.other.unit.css', foreground: 'b5cea8' }, // CSS units (px, em, %)
    
    // JavaScript specific enhancements
    { token: 'keyword.control.js', foreground: 'c586c0' }, // JS control keywords (if, for, while)
    { token: 'storage.type.js', foreground: '569cd6' }, // JS storage keywords (var, let, const, function)
    { token: 'support.function.dom.js', foreground: 'dcdcaa' }, // DOM methods
    { token: 'support.variable.dom.js', foreground: '4fc1ff' }, // DOM objects (document, window)
    { token: 'support.constant.js', foreground: '4ec9b0' }, // JS constants
    { token: 'entity.name.function.js', foreground: 'dcdcaa' }, // Function names
    { token: 'variable.parameter.js', foreground: '9cdcfe' }, // Function parameters
    { token: 'meta.object-literal.key.js', foreground: '9cdcfe' }, // Object keys
    { token: 'support.class.js', foreground: '4ec9b0' }, // JS classes
    
    // HTML specific enhancements
    { token: 'entity.name.tag.html', foreground: '569cd6' }, // HTML tag names
    { token: 'entity.other.attribute-name.html', foreground: '9cdcfe' }, // HTML attribute names
    { token: 'string.quoted.double.html', foreground: 'ce9178' }, // HTML attribute values
    { token: 'punctuation.definition.tag.html', foreground: '808080' }, // HTML angle brackets
    
    // String and comment enhancements
    { token: 'string', foreground: 'ce9178' },
    { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
    { token: 'comment.block.documentation', foreground: '6a9955', fontStyle: 'italic' },
    
    // Error highlighting
    { token: 'invalid', foreground: 'f44747', fontStyle: 'underline' },
    { token: 'invalid.deprecated', foreground: 'f44747', fontStyle: 'strikethrough' },
    
    // Enhanced operators
    { token: 'keyword.operator', foreground: 'd4d4d4' },
    { token: 'keyword.operator.logical', foreground: 'c586c0' },
    { token: 'keyword.operator.comparison', foreground: 'c586c0' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#d4d4d4',
    'editorLineNumber.foreground': '#858585',
    'editorLineNumber.activeForeground': '#c6c6c6',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editorCursor.foreground': '#aeafad',
    'editor.selectionHighlightBackground': '#add6ff26',
    'editor.wordHighlightBackground': '#575757b8',
    'editor.wordHighlightStrongBackground': '#004972b8',
    'editor.findMatchBackground': '#515c6a',
    'editor.findMatchHighlightBackground': '#ea5c0055',
    'editor.hoverHighlightBackground': '#264f7840',
    'editorHoverWidget.background': '#252526',
    'editorHoverWidget.border': '#454545',
    'editorSuggestWidget.background': '#252526',
    'editorSuggestWidget.border': '#454545',
    'editorSuggestWidget.selectedBackground': '#062f4a',
    'editorError.foreground': '#f44747',
    'editorWarning.foreground': '#ff8c00',
    'editorInfo.foreground': '#3794ff',
    'editorGutter.background': '#1e1e1e',
    'editorGutter.modifiedBackground': '#1b81a8',
    'editorGutter.addedBackground': '#487e02',
    'editorGutter.deletedBackground': '#f85149',
    // Bracket pair colorization
    'editorBracketMatch.background': '#0064001a',
    'editorBracketMatch.border': '#888888',
    // Enhanced bracket colors
    'editorBracketHighlight.foreground1': '#ffd700',
    'editorBracketHighlight.foreground2': '#da70d6',
    'editorBracketHighlight.foreground3': '#179fff',
    'editorBracketHighlight.foreground4': '#ffd700',
    'editorBracketHighlight.foreground5': '#da70d6',
    'editorBracketHighlight.foreground6': '#179fff',
  }
};

export const applyCustomTheme = (monaco: any) => {
  monaco.editor.defineTheme('enhanced-dark', customDarkTheme);
  monaco.editor.setTheme('enhanced-dark');
};
