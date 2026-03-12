'use client';

/**
 * @fileoverview Error Display component for SQLens.
 *
 * This component displays parse errors with user-friendly messages,
 * technical details, and suggestions for fixing the error.
 *
 * @module components/Editor/ErrorDisplay
 */

import { ParseError } from '@/types';
import { cn } from '@/utils';
import { AlertCircle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ErrorDisplay component.
 */
interface ErrorDisplayProps {
  /**
   * The parse error to display.
   */
  error: ParseError;
}

// ============================================================================
// ErrorDisplay Component
// ============================================================================

/**
 * Error display panel for SQL parse errors.
 *
 * Displays:
 * - A user-friendly error message
 * - The technical error message (if different)
 * - Line and column location (if available)
 * - Helpful suggestions for fixing the error
 *
 * @example
 * ```tsx
 * const error: ParseError = {
 *   message: "Unexpected token 'FORM'",
 *   friendlyMessage: "Did you mean 'FROM' instead of 'FORM'?",
 *   line: 1,
 *   column: 8,
 *   suggestions: ["Check the spelling of SQL keywords"]
 * };
 *
 * return <ErrorDisplay error={error} />;
 * ```
 */
export function ErrorDisplay({ error }: ErrorDisplayProps) {
  // State for expanding technical details
  const [showDetails, setShowDetails] = useState(false);

  // Check if we have additional details to show
  const hasDetails =
    (error.message !== error.friendlyMessage) ||
    (error.line !== undefined && error.column !== undefined);

  // Check if we have suggestions
  const hasSuggestions = error.suggestions && error.suggestions.length > 0;

  return (
    <div
      className={cn(
        'border-t border-red-500/30 bg-red-500/10 p-3',
        'animate-in slide-in-from-top-2 duration-200'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        {/* Error Icon */}
        <AlertCircle
          className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          {/* Friendly Error Message */}
          <p className="text-sm text-red-400 font-medium">
            {error.friendlyMessage}
          </p>

          {/* Location Info */}
          {error.line !== undefined && error.column !== undefined && (
            <p className="text-xs text-red-400/70 mt-0.5 font-mono">
              at line {error.line}, column {error.column}
            </p>
          )}

          {/* Technical Details Toggle */}
          {hasDetails && error.message !== error.friendlyMessage && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                'flex items-center gap-1 mt-2 text-xs text-red-400/70',
                'hover:text-red-400 transition-colors'
              )}
              type="button"
              aria-expanded={showDetails}
            >
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              <span>
                {showDetails ? 'Hide technical details' : 'Show technical details'}
              </span>
            </button>
          )}

          {/* Technical Error Message */}
          {showDetails && error.message !== error.friendlyMessage && (
            <p className="text-xs text-red-400/70 mt-1 font-mono p-2 bg-red-500/10 rounded border border-red-500/20">
              {error.message}
            </p>
          )}

          {/* Suggestions */}
          {hasSuggestions && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-amber-400/80 font-medium flex items-center gap-1">
                <Lightbulb className="w-3 h-3" aria-hidden="true" />
                <span>Suggestions:</span>
              </p>
              <ul className="space-y-0.5 ml-4" aria-label="Error suggestions">
                {error.suggestions!.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-amber-400 list-disc"
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Error Display Component
// ============================================================================

/**
 * Props for the InlineError component.
 */
interface InlineErrorProps {
  /**
   * The error message to display.
   */
  message: string;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Compact inline error display.
 *
 * For use in smaller spaces where a full error panel would be too much.
 *
 * @example
 * ```tsx
 * <InlineError message="Invalid syntax" />
 * ```
 */
export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-red-400 text-xs',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
