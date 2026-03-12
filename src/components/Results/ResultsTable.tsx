/**
 * @fileoverview Results table component for displaying query execution results.
 *
 * This component renders the query results in a tabular format with
 * metadata about execution time and row count. It handles various states
 * including loading, empty results, and error conditions.
 *
 * @module components/Results/ResultsTable
 */

'use client';

import { useQueryStore } from '@/stores';
import { DataTable } from '@/components/shared/DataTable';
import { Table, Clock, Hash, AlertCircle } from 'lucide-react';
import { formatDuration } from '@/utils';

/**
 * ResultsTable displays the query execution results with metadata.
 *
 * Features:
 * - Loading state with animated spinner
 * - Empty state when no query has been executed
 * - Error state with formatted error message
 * - Results info bar with row count and execution time
 * - Scrollable data table for large result sets
 *
 * @example
 * ```tsx
 * // Place in the results panel area
 * <ResultsTable />
 * ```
 */
export function ResultsTable() {
  const { queryResult, isLoading } = useQueryStore();

  // Loading state - show spinner while query is executing
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted">
          <div
            className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading"
          />
          <span className="text-sm">Executing query...</span>
        </div>
      </div>
    );
  }

  // Empty state - no query has been executed yet
  if (!queryResult) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted">
          <Table className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p className="text-sm">No results yet</p>
          <p className="text-xs mt-1">Run a query to see results here</p>
        </div>
      </div>
    );
  }

  // Error state - query execution failed
  if (queryResult.error) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center" role="alert">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" aria-hidden="true" />
          <p className="text-sm text-red-400 font-medium">Query Error</p>
          <p className="text-xs text-red-400/70 mt-2 font-mono break-words">
            {queryResult.error}
          </p>
        </div>
      </div>
    );
  }

  // Success state - display results
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Results info bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-border bg-panel"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted">
            <Hash className="w-4 h-4" aria-hidden="true" />
            <span>
              <span className="text-foreground font-medium">
                {queryResult.rowCount.toLocaleString()}
              </span>{' '}
              row{queryResult.rowCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>
              <span className="text-foreground font-medium">
                {formatDuration(queryResult.executionTime)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="flex-1 overflow-auto">
        {queryResult.rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            Query returned no rows
          </div>
        ) : (
          <DataTable
            columns={queryResult.columns.map(c => c.name)}
            rows={queryResult.rows.map((row) => ({
              data: row,
              status: 'included' as const,
            }))}
          />
        )}
      </div>
    </div>
  );
}
