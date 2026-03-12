'use client';

/**
 * HelpOverlay Component
 *
 * A modal overlay that displays help information and keyboard shortcuts
 * for SQLens. Shows on first visit and can be reopened via the help button.
 */

import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores';
import { X, Keyboard, Mouse, Database, Play, Search } from 'lucide-react';
import { cn } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  items: ShortcutItem[];
}

const helpSections: HelpSection[] = [
  {
    icon: <Keyboard className="w-5 h-5" />,
    title: 'Query Editor',
    items: [
      { keys: ['Ctrl', 'Enter'], description: 'Execute query' },
      { keys: ['Ctrl', 'Shift', 'Enter'], description: 'Execute and step through' },
      { keys: ['Ctrl', '/'], description: 'Toggle comment' },
      { keys: ['Ctrl', 'Space'], description: 'Trigger autocomplete' },
      { keys: ['Ctrl', 'F'], description: 'Find in editor' },
      { keys: ['Ctrl', 'H'], description: 'Find and replace' },
    ],
  },
  {
    icon: <Play className="w-5 h-5" />,
    title: 'Step-Through Controls',
    items: [
      { keys: ['Space'], description: 'Next step' },
      { keys: ['Arrow Left'], description: 'Previous step' },
      { keys: ['Arrow Right'], description: 'Next step' },
      { keys: ['P'], description: 'Play/Pause auto-step' },
      { keys: ['R'], description: 'Reset to beginning' },
    ],
  },
  {
    icon: <Mouse className="w-5 h-5" />,
    title: 'Plan Visualization',
    items: [
      { keys: ['Scroll'], description: 'Zoom in/out' },
      { keys: ['Drag'], description: 'Pan around' },
      { keys: ['Click node'], description: 'Select and highlight' },
      { keys: ['Double-click'], description: 'Focus on node' },
    ],
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: 'Schema Panel',
    items: [
      { keys: ['Click table'], description: 'Expand/collapse columns' },
      { keys: ['Click column'], description: 'Insert into query' },
    ],
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Global Shortcuts',
    items: [
      { keys: ['?'], description: 'Show this help' },
      { keys: ['Escape'], description: 'Close overlays' },
      { keys: ['Ctrl', 'K'], description: 'Command palette (coming soon)' },
    ],
  },
];

export function HelpOverlay() {
  const { showHelp, setShowHelp, markHelpAsSeen } = useUIStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    if (!showHelp) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelp(false);
        markHelpAsSeen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp, setShowHelp, markHelpAsSeen]);

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setShowHelp(false);
      markHelpAsSeen();
    }
  };

  const handleClose = () => {
    setShowHelp(false);
    markHelpAsSeen();
  };

  return (
    <AnimatePresence>
      {showHelp && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-3xl max-h-[85vh] mx-4 overflow-hidden rounded-xl bg-panel border border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Welcome to SQLens
                </h2>
                <p className="text-sm text-muted mt-1">
                  Interactive SQL Query Visualizer
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-muted hover:text-foreground hover:bg-accent/10 rounded-md transition-colors"
                aria-label="Close help"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
              {/* Quick intro */}
              <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-foreground">
                  SQLens helps you understand SQL by visualizing query execution plans.
                  Write a query, execute it, and step through each operation to see how
                  data flows through the relational algebra operators.
                </p>
              </div>

              {/* Shortcuts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {helpSections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="text-accent">{section.icon}</span>
                      <h3 className="font-medium">{section.title}</h3>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted">{item.description}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((key, keyIndex) => (
                              <span key={keyIndex} className="flex items-center gap-1">
                                <kbd
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs font-mono",
                                    "bg-background border border-border text-foreground"
                                  )}
                                >
                                  {key}
                                </kbd>
                                {keyIndex < item.keys.length - 1 && (
                                  <span className="text-muted">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background/50">
              <p className="text-xs text-muted">
                Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono bg-background border border-border">?</kbd> anytime to show this help
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-accent-foreground bg-accent rounded-md hover:bg-accent/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
