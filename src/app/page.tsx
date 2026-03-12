'use client';

/**
 * SQLens Main Application Page
 *
 * This is the entry point for the SQLens interactive SQL query visualizer.
 * It provides a comprehensive environment for understanding SQL through
 * visualization of query execution plans.
 */

import { useEffect, useState } from 'react';
import { useDatabaseStore, useUIStore } from '@/stores';
import { SchemaPanel } from '@/components/SchemaPanel';
import { QueryEditor } from '@/components/Editor';
import { PlanTree } from '@/components/ExecutionPlan';
import { StepController } from '@/components/StepThrough';
import { ResultsTable } from '@/components/Results';
import { ThemeToggle, HelpOverlay, KeyboardShortcuts } from '@/components/shared';
import { cn } from '@/utils';
import { Loader2, HelpCircle, Github } from 'lucide-react';

export default function Home() {
  const { initialize, isInitialized, isLoading, error } = useDatabaseStore();
  const {
    theme,
    setShowHelp,
    hasSeenHelp,
    resultsPanelHeight,
    setResultsPanelHeight,
    editorPanelHeight,
    setEditorPanelHeight
  } = useUIStore();
  const [resizingPanel, setResizingPanel] = useState<'editor' | 'results' | null>(null);

  // Initialize database on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  }, [theme]);

  // Show help overlay on first visit
  useEffect(() => {
    if (isInitialized && !hasSeenHelp) {
      setShowHelp(true);
    }
  }, [isInitialized, hasSeenHelp, setShowHelp]);

  // Handle vertical resize for panels
  useEffect(() => {
    if (!resizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingPanel === 'editor') {
        // Editor resize: measure from header (approx 48px)
        const headerHeight = 48;
        const newHeight = e.clientY - headerHeight;
        setEditorPanelHeight(Math.min(Math.max(newHeight, 100), 400));
      } else if (resizingPanel === 'results') {
        const newHeight = window.innerHeight - e.clientY;
        setResultsPanelHeight(Math.min(Math.max(newHeight, 100), 500));
      }
    };

    const handleMouseUp = () => setResizingPanel(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingPanel, setEditorPanelHeight, setResultsPanelHeight]);

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-6">
          {/* Logo with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-blue-500/30 rounded-full" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              <span className="text-blue-400">SQL</span>ens
            </h1>
            <p className="text-sm text-slate-400 mt-2">Interactive Query Visualizer</p>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center gap-3 mt-2">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-sm text-slate-300">Initializing SQL engine...</span>
          </div>

          {/* Progress bar */}
          <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-red-500">Initialization Error</h1>
          <p className="text-sm text-muted mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-accent">SQL</span>ens
          </h1>
          <span className="text-xs text-muted hidden sm:inline">
            Interactive Query Visualizer
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 text-muted hover:text-foreground hover:bg-accent/10 rounded-md transition-colors"
            title="Help (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <ThemeToggle />
          <a
            href="https://github.com/sqlens/sqlens"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-muted hover:text-foreground hover:bg-accent/10 rounded-md transition-colors"
            title="View on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Schema Panel (left sidebar) */}
        <SchemaPanel />

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Editor (top) */}
          <div
            className="min-h-[100px] border-b border-border overflow-hidden"
            style={{ height: editorPanelHeight }}
          >
            <QueryEditor />
          </div>

          {/* Editor resize handle */}
          <div
            onMouseDown={() => setResizingPanel('editor')}
            className={cn(
              "h-1.5 bg-border hover:bg-accent cursor-ns-resize transition-colors flex items-center justify-center group",
              resizingPanel === 'editor' && "bg-accent"
            )}
          >
            <div className="w-8 h-0.5 bg-muted/50 rounded-full group-hover:bg-accent-foreground/50" />
          </div>

          {/* Execution Plan + Step Through (middle) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[150px]">
            {/* Plan Tree */}
            <div className="flex-1 overflow-hidden">
              <PlanTree />
            </div>

            {/* Step Controller */}
            <StepController />
          </div>

          {/* Results resize handle */}
          <div
            onMouseDown={() => setResizingPanel('results')}
            className={cn(
              "h-1.5 bg-border hover:bg-accent cursor-ns-resize transition-colors flex items-center justify-center group",
              resizingPanel === 'results' && "bg-accent"
            )}
          >
            <div className="w-8 h-0.5 bg-muted/50 rounded-full group-hover:bg-accent-foreground/50" />
          </div>

          {/* Results Panel (bottom) */}
          <div
            className="overflow-hidden border-t border-border min-h-[100px]"
            style={{ height: resultsPanelHeight }}
          >
            <ResultsTable />
          </div>
        </div>
      </div>

      {/* Overlays and global components */}
      <HelpOverlay />
      <KeyboardShortcuts />
    </div>
  );
}
