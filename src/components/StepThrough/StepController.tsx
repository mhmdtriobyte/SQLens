'use client';

import { useEffect, useRef } from 'react';
import { useQueryStore, useUIStore } from '@/stores';
import { StepExplanation } from './StepExplanation';
import { StepTimeline } from './StepTimeline';
import { cn } from '@/utils';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  if (!hasSteps) {
    return (
      <div className="h-full flex items-center justify-center bg-panel border-t border-border">
        <p className="text-sm text-muted">
          Click &quot;Step Through&quot; to visualize query execution
        </p>
      </div>
    );
  }

  return (
    <div className="bg-panel border-t border-border">
      {/* Current step explanation */}
      <AnimatePresence mode="wait">
        {currentStep && (
          <motion.div
            key={currentStep.stepNumber}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <StepExplanation step={currentStep} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          {/* Reset */}
          <button
            onClick={resetStepThrough}
            className={cn(
              "p-2 rounded-md transition-colors",
              "text-muted hover:text-foreground hover:bg-accent/10"
            )}
            title="Reset (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={previousStep}
            disabled={!canGoPrevious}
            className={cn(
              "p-2 rounded-md transition-colors",
              canGoPrevious
                ? "text-muted hover:text-foreground hover:bg-accent/10"
                : "text-muted/30 cursor-not-allowed"
            )}
            title="Previous Step (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayback}
            className={cn(
              "p-2 rounded-full transition-colors",
              "bg-accent text-accent-foreground hover:bg-accent/90"
            )}
            title={isPlaying ? "Pause (P)" : "Play (P)"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextStep}
            disabled={!canGoNext}
            className={cn(
              "p-2 rounded-md transition-colors",
              canGoNext
                ? "text-muted hover:text-foreground hover:bg-accent/10"
                : "text-muted/30 cursor-not-allowed"
            )}
            title="Next Step (→ or Space)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Skip to end */}
          <button
            onClick={() => goToStep(steps.length - 1)}
            disabled={!canGoNext}
            className={cn(
              "p-2 rounded-md transition-colors",
              canGoNext
                ? "text-muted hover:text-foreground hover:bg-accent/10"
                : "text-muted/30 cursor-not-allowed"
            )}
            title="Skip to End"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-background border border-border rounded px-2 py-1 text-xs"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>4x</option>
          </select>
        </div>

        {/* Step counter */}
        <div className="text-sm text-muted">
          Step <span className="text-foreground font-medium">{currentStepIndex + 1}</span> of {steps.length}
        </div>
      </div>

      {/* Timeline */}
      <StepTimeline
        steps={steps}
        currentIndex={currentStepIndex}
        onStepClick={goToStep}
      />
    </div>
  );
}
