/**
 * @fileoverview Compact results info component for displaying query metadata.
 *
 * This component provides a minimal display of query result statistics
 * suitable for use in status bars or compact UI areas.
 *
 * @module components/Results/ResultsInfo
 */

'use client';

import { useQueryStore } from '@/stores';
import { formatDuration, formatNumber } from '@/utils';

/**
 * ResultsInfo displays compact query result statistics.
 *
 * Shows row count and execution time in a minimal format suitable for
 * status bars or toolbar areas. Returns null when there are no results
 * or when the query resulted in an error.
 *
 * @example
 * ```tsx
 * // Use in a status bar
 * <div className="flex items-center gap-2">
 *   <span>Status:</span>
 *   <ResultsInfo />
 * </div>
 * ```
 */
export function ResultsInfo() {
  const { queryResult } = useQueryStore();

  // Don't render if no results or if there's an error
  if (!queryResult || queryResult.error) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 text-xs text-muted"
      role="status"
      aria-live="polite"
      aria-label={`Query returned ${queryResult.rowCount} rows in ${formatDuration(queryResult.executionTime)}`}
    >
      <span>
        {formatNumber(queryResult.rowCount)} row
        {queryResult.rowCount !== 1 ? 's' : ''}
      </span>
      <span className="text-border" aria-hidden="true">
        &bull;
      </span>
      <span>{formatDuration(queryResult.executionTime)}</span>
    </div>
  );
}
