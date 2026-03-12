'use client';

/**
 * KeyboardShortcuts Component
 *
 * Global keyboard shortcut handler that listens for common shortcuts
 * and triggers appropriate actions. Renders nothing visually.
 */

import { useEffect } from 'react';
import { useUIStore } from '@/stores';

export function KeyboardShortcuts() {
  const {
    keyboardShortcutsEnabled,
    setShowHelp,
    toggleTheme,
    toggleSchemaSidebar
  } = useUIStore();

  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.classList.contains('cm-content') ||
        target.closest('.cm-editor');

      // Help shortcut - always available
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditing) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Don't process other shortcuts if editing
      if (isEditing) return;

      // Theme toggle: Ctrl/Cmd + Shift + T
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Toggle schema sidebar: Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSchemaSidebar();
        return;
      }

      // Escape to close overlays
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, setShowHelp, toggleTheme, toggleSchemaSidebar]);

  // This component doesn't render anything
  return null;
}
