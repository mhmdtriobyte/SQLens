/**
 * @fileoverview Compact step controller bar for SQL execution visualization.
 *
 * A single horizontal bar with playback controls, step indicator,
 * current operation name, and speed control.
 *
 * @module components/StepThrough/StepController
 */

'use client';

import { useEffect, useRef } from 'react';
import { useQueryStore, useUIStore } from '@/stores';
import { cn } from '@/utils';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

// ============================================================================
// Constants
// ============================================================================

/**
 * Short labels for each operation type.
 */
const OPERATION_LABELS: Record<string, string> = {
  TABLE_SCAN: 'Scan',
  SELECTION: 'Filter',
  PROJECTION: 'Project',
  JOIN: 'Join',
  CROSS_JOIN: 'Cross Join',
  GROUP_BY: 'Group',
  DISTINCT: 'Distinct',
  SORT: 'Sort',
  LIMIT: 'Limit',
  UNION: 'Union',
  INTERSECT: 'Intersect',
  EXCEPT: 'Except',
  AGGREGATE: 'Aggregate',
  SUBQUERY: 'Subquery',
};

/**
 * Color classes for operation types.
 */
const OPERATION_COLORS: Record<string, string> = {
  TABLE_SCAN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SELECTION: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PROJECTION: 'bg-green-500/20 text-green-400 border-green-500/30',
  JOIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CROSS_JOIN: 'bg-purple-400/20 text-purple-300 border-purple-400/30',
  GROUP_BY: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  DISTINCT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  SORT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  LIMIT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  UNION: 'bg-red-500/20 text-red-400 border-red-500/30',
  INTERSECT: 'bg-red-400/20 text-red-300 border-red-400/30',
  EXCEPT: 'bg-red-300/20 text-red-200 border-red-300/30',
  AGGREGATE: 'bg-pink-400/20 text-pink-300 border-pink-400/30',
  SUBQUERY: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
};

// ============================================================================
// StepController Component
// ============================================================================

/**
 * Compact step controller bar for SQL execution visualization.
 *
 * Features:
 * - Play/pause and step navigation buttons
 * - Step counter (e.g., "2 / 4")
 * - Current operation badge with color coding
 * - Optional table/target name
 * - Speed control dropdown
 * - Keyboard shortcuts support
 *
 * @example
 * ```tsx
 * <StepController />
 * ```
 */
export function StepController() {
  const {
    stepThrough,
    nextStep,
    previousStep,
    goToStep,
    togglePlayback,
    resetStepThrough,
    setPlaybackSpeed
  } = useQueryStore();
  const { keyboardShortcutsEnabled } = useUIStore();

  const { steps, currentStepIndex, isPlaying, playbackSpeed } = stepThrough;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = steps[currentStepIndex];
  const hasSteps = steps.length > 0;
  const canGoPrevious = currentStepIndex > 0;
  const canGoNext = currentStepIndex < steps.length - 1;

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && canGoNext) {
      intervalRef.current = setInterval(() => {
        nextStep();
      }, playbackSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, canGoNext, playbackSpeed, nextStep]);

  // Stop playing when reaching the end
  useEffect(() => {
    if (isPlaying && !canGoNext) {
      togglePlayback();
    }
  }, [canGoNext, isPlaying, togglePlayback]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboardShortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or CodeMirror editor
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.classList?.contains('cm-content') ||
        target.closest?.('.cm-editor')
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (hasSteps) {
            if (canGoNext) {
              nextStep();
            } else {
              resetStepThrough();
            }
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (canGoPrevious) previousStep();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canGoNext) nextStep();
          break;
        case 'p':
          if (hasSteps) togglePlayback();
          break;
        case 'r':
          if (hasSteps) resetStepThrough();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcutsEnabled, hasSteps, canGoPrevious, canGoNext, nextStep, previousStep, togglePlayback, resetStepThrough]);

  // Empty state
  if (!hasSteps) {
    return (
      <div className="flex items-center justify-center px-4 py-2 bg-panel/50 border-t border-border">
        <p className="text-xs text-muted">
          Click &quot;Step Through&quot; to visualize query execution
        </p>
      </div>
    );
  }

  // Get current step info
  const operationType = currentStep?.node.type || '';
  const operationLabel = OPERATION_LABELS[operationType] || operationType;
  const operationColor = OPERATION_COLORS[operationType] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const targetName = currentStep?.node.tableName || currentStep?.node.label || '';

  // Format speed label
  const speedLabel = playbackSpeed === 2000 ? '0.5x' :
                     playbackSpeed === 1000 ? '1x' :
                     playbackSpeed === 500 ? '2x' : '4x';

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-panel/80 border-t border-border backdrop-blur-sm">
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        {/* Reset */}
        <button
          onClick={resetStepThrough}
          className={cn(
            "p-1.5 rounded transition-colors",
            "text-muted hover:text-foreground hover:bg-accent/10"
          )}
          title="Reset (R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Skip to start */}
        <button
          onClick={() => goToStep(0)}
          disabled={!canGoPrevious}
          className={cn(
            "p-1.5 rounded transition-colors",
            canGoPrevious
              ? "text-muted hover:text-foreground hover:bg-accent/10"
              : "text-muted/30 cursor-not-allowed"
          )}
          title="First Step"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Previous */}
        <button
          onClick={previousStep}
          disabled={!canGoPrevious}
          className={cn(
            "p-1.5 rounded transition-colors",
            canGoPrevious
              ? "text-muted hover:text-foreground hover:bg-accent/10"
              : "text-muted/30 cursor-not-allowed"
          )}
          title="Previous (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlayback}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            "bg-accent text-accent-foreground hover:bg-accent/90"
          )}
          title={isPlaying ? "Pause (P)" : "Play (P)"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={nextStep}
          disabled={!canGoNext}
          className={cn(
            "p-1.5 rounded transition-colors",
            canGoNext
              ? "text-muted hover:text-foreground hover:bg-accent/10"
              : "text-muted/30 cursor-not-allowed"
          )}
          title="Next (Right Arrow or Space)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Skip to end */}
        <button
          onClick={() => goToStep(steps.length - 1)}
          disabled={!canGoNext}
          className={cn(
            "p-1.5 rounded transition-colors",
            canGoNext
              ? "text-muted hover:text-foreground hover:bg-accent/10"
              : "text-muted/30 cursor-not-allowed"
          )}
          title="Last Step"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Step counter */}
      <div className="text-xs text-muted whitespace-nowrap">
        Step <span className="text-foreground font-medium">{currentStepIndex + 1}</span>
        <span className="mx-0.5">/</span>
        <span>{steps.length}</span>
      </div>

      {/* Operation badge */}
      <div className={cn(
        "px-2 py-0.5 rounded border text-xs font-medium",
        operationColor
      )}>
        {operationLabel}
      </div>

      {/* Target name (table, condition, etc.) */}
      {targetName && (
        <span className="text-xs text-muted font-mono truncate max-w-[150px]" title={targetName}>
          {targetName}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Speed control */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted">Speed:</span>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="bg-background border border-border rounded px-1.5 py-0.5 text-xs cursor-pointer hover:border-accent/50 transition-colors"
        >
          <option value={2000}>0.5x</option>
          <option value={1000}>1x</option>
          <option value={500}>2x</option>
          <option value={250}>4x</option>
        </select>
      </div>
    </div>
  );
}
