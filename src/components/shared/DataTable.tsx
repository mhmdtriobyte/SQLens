/**
 * @fileoverview Reusable data table component for SQLens.
 *
 * Displays tabular data with support for row status highlighting,
 * used in both query results and step-through visualization.
 *
 * @module components/shared/DataTable
 */

'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/utils';
import type { HighlightedRow, RowStatus } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the DataTable component.
 */
interface DataTableProps {
  /**
   * Array of column names to display.
   */
  columns: string[];

  /**
   * Array of rows to display, with optional status highlighting.
   */
  rows: HighlightedRow[];

  /**
   * Whether to show row status indicators.
   * @default false
   */
  showRowStatus?: boolean;

  /**
   * Maximum height for the table container.
   * @default 'auto'
   */
  maxHeight?: string | number;

  /**
   * Additional CSS classes for the container.
   */
  className?: string;

  /**
   * Whether to use compact row styling.
   * @default false
   */
  compact?: boolean;

  /**
   * Callback when a row is clicked.
   */
  onRowClick?: (row: HighlightedRow, index: number) => void;

  /**
   * Index of the currently selected row.
   */
  selectedRowIndex?: number;

  /**
   * Whether to show alternating row backgrounds.
   * @default true
   */
  striped?: boolean;

  /**
   * Empty state message when no rows exist.
   * @default 'No data to display'
   */
  emptyMessage?: string;
}

// ============================================================================
// Status Styling
// ============================================================================

/**
 * Maps row status to background color classes.
 */
const statusBackgroundClasses: Record<RowStatus, string> = {
  included: 'bg-green-500/10 border-l-4 border-l-green-500',
  excluded: 'bg-red-500/10 border-l-4 border-l-red-500 opacity-60',
  pending: 'bg-yellow-500/10 border-l-4 border-l-yellow-500',
  new: 'bg-blue-500/10 border-l-4 border-l-blue-500',
};

/**
 * Maps row status to text labels.
 */
const statusLabels: Record<RowStatus, string> = {
  included: 'Included',
  excluded: 'Excluded',
  pending: 'Pending',
  new: 'New',
};

// ============================================================================
// Cell Value Formatter
// ============================================================================

/**
 * Formats a cell value for display.
 *
 * @param value - The value to format
 * @returns Formatted string representation
 */
function formatCellValue(value: unknown): string {
  if (value === null) return 'NULL';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ============================================================================
// Table Header Component
// ============================================================================

/**
 * Table header component.
 */
interface TableHeaderProps {
  columns: string[];
  showRowStatus: boolean;
}

const TableHeader = memo(function TableHeader({
  columns,
  showRowStatus,
}: TableHeaderProps) {
  return (
    <thead className="bg-muted/50 sticky top-0 z-10">
      <tr>
        {showRowStatus && (
          <th className="px-2 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider w-20">
            Status
          </th>
        )}
        {columns.map((column, index) => (
          <th
            key={`${column}-${index}`}
            className="px-3 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
});

// ============================================================================
// Table Row Component
// ============================================================================

/**
 * Table row component.
 */
interface TableRowProps {
  row: HighlightedRow;
  columns: string[];
  rowIndex: number;
  showRowStatus: boolean;
  compact: boolean;
  isSelected: boolean;
  striped: boolean;
  onRowClick?: (row: HighlightedRow, index: number) => void;
}

const TableRow = memo(function TableRow({
  row,
  columns,
  rowIndex,
  showRowStatus,
  compact,
  isSelected,
  striped,
  onRowClick,
}: TableRowProps) {
  const handleClick = () => {
    onRowClick?.(row, rowIndex);
  };

  return (
    <tr
      onClick={handleClick}
      className={cn(
        'transition-colors duration-150',
        showRowStatus && statusBackgroundClasses[row.status],
        !showRowStatus && striped && rowIndex % 2 === 1 && 'bg-muted/30',
        isSelected && 'ring-2 ring-inset ring-accent',
        onRowClick && 'cursor-pointer hover:bg-muted/50'
      )}
    >
      {showRowStatus && (
        <td className="px-2 py-1.5">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
              row.status === 'included' && 'bg-green-500/20 text-green-400',
              row.status === 'excluded' && 'bg-red-500/20 text-red-400',
              row.status === 'pending' && 'bg-yellow-500/20 text-yellow-400',
              row.status === 'new' && 'bg-blue-500/20 text-blue-400'
            )}
          >
            {statusLabels[row.status]}
          </span>
        </td>
      )}
      {columns.map((column, colIndex) => (
        <td
          key={`${column}-${colIndex}`}
          className={cn(
            'px-3 text-sm font-mono whitespace-nowrap',
            compact ? 'py-1' : 'py-2',
            row.data[column] === null && 'text-muted italic'
          )}
        >
          {formatCellValue(row.data[column])}
        </td>
      ))}
    </tr>
  );
});

// ============================================================================
// DataTable Component
// ============================================================================

/**
 * Reusable data table component for displaying tabular data.
 *
 * Features:
 * - Row status highlighting for step-through visualization
 * - Sticky headers for scrolling
 * - Compact mode for dense displays
 * - Row selection support
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <DataTable
 *   columns={['id', 'name', 'age']}
 *   rows={[
 *     { data: { id: 1, name: 'Alice', age: 25 }, status: 'included' },
 *     { data: { id: 2, name: 'Bob', age: 18 }, status: 'excluded' },
 *   ]}
 *   showRowStatus
 * />
 * ```
 */
function DataTableComponent({
  columns,
  rows,
  showRowStatus = false,
  maxHeight = 'auto',
  className,
  compact = false,
  onRowClick,
  selectedRowIndex,
  striped = true,
  emptyMessage = 'No data to display',
}: DataTableProps) {
  // Memoize the table body to prevent unnecessary re-renders
  const tableBody = useMemo(
    () =>
      rows.map((row, index) => (
        <TableRow
          key={`row-${index}`}
          row={row}
          columns={columns}
          rowIndex={index}
          showRowStatus={showRowStatus}
          compact={compact}
          isSelected={selectedRowIndex === index}
          striped={striped}
          onRowClick={onRowClick}
        />
      )),
    [rows, columns, showRowStatus, compact, selectedRowIndex, striped, onRowClick]
  );

  // Empty state
  if (rows.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-muted', className)}>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn('overflow-auto', className)}
      style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
    >
      <table className="min-w-full divide-y divide-border">
        <TableHeader columns={columns} showRowStatus={showRowStatus} />
        <tbody className="divide-y divide-border/50">{tableBody}</tbody>
      </table>
    </div>
  );
}

export const DataTable = memo(DataTableComponent);
