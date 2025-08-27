import { useEffect } from 'react';

export type KeyboardShortcuts = {
  run: string;
  prettify: string;
  submit: string;
  save: string;
  newFile: string;
  toggleConsole: string;
  toggleValidation: string;
};

type ShortcutHandlers = {
  onRun?: () => void;
  onPrettify?: () => void;
  onSubmit?: () => void;
  onSave?: () => void;
  onNewFile?: () => void;
  onToggleConsole?: () => void;
  onToggleValidation?: () => void;
};

const parseShortcut = (shortcut: string) => {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  
  return {
    key: key.toUpperCase(),
    ctrl: modifiers.includes('ctrl'),
    cmd: modifiers.includes('cmd'),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
  };
};

const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
  const parsed = parseShortcut(shortcut);
  const isMac = navigator.platform.toLowerCase().includes('mac');

  // Check key
  if (event.key.toUpperCase() !== parsed.key) return false;

  // Check ctrl/cmd separately: on Mac, cmd maps to metaKey; on other OSes ctrlKey
  if (parsed.cmd) {
    if (!event.metaKey) return false;
  } else if (parsed.ctrl) {
    if (!event.ctrlKey) return false;
  }

  // Check alt and shift explicitly
  if (parsed.alt !== event.altKey) return false;
  if (parsed.shift !== event.shiftKey) return false;

  return true;
};

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts, handlers: ShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or textareas
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Check each shortcut
      if (handlers.onRun && matchesShortcut(event, shortcuts.run)) {
        event.preventDefault();
        handlers.onRun();
        return;
      }
      
      if (handlers.onPrettify && matchesShortcut(event, shortcuts.prettify)) {
        event.preventDefault();
        handlers.onPrettify();
        return;
      }
      
      if (handlers.onSubmit && matchesShortcut(event, shortcuts.submit)) {
        event.preventDefault();
        handlers.onSubmit();
        return;
      }
      
      if (handlers.onSave && matchesShortcut(event, shortcuts.save)) {
        event.preventDefault();
        handlers.onSave();
        return;
      }
      
      if (handlers.onNewFile && matchesShortcut(event, shortcuts.newFile)) {
        event.preventDefault();
        handlers.onNewFile();
        return;
      }
      
      if (handlers.onToggleConsole && matchesShortcut(event, shortcuts.toggleConsole)) {
        event.preventDefault();
        handlers.onToggleConsole();
        return;
      }
      
      if (handlers.onToggleValidation && matchesShortcut(event, shortcuts.toggleValidation)) {
        event.preventDefault();
        handlers.onToggleValidation();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, handlers]);
};
