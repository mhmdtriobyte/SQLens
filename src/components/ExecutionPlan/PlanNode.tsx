/**
 * @fileoverview Plan node component for the execution plan visualizer.
 *
 * Renders individual nodes in the query execution plan tree with
 * operation-specific styling, symbols, and status indicators.
 *
 * @module components/ExecutionPlan/PlanNode
 */

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import type { PlanNode as PlanNodeType, OperationType } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Data passed to each plan node in React Flow.
 */
interface PlanNodeData {
  /**
   * The underlying plan node data.
   */
  node: PlanNodeType;

  /**
   * Whether this node is the currently active step.
   */
  isActive: boolean;

  /**
   * Whether this node's execution is complete.
   */
  isComplete: boolean;
}

// ============================================================================
// Operation Styling
// ============================================================================

/**
 * Visual configuration for each operation type.
 * Maps operation types to their symbols and color classes.
 */
const operationStyles: Record<OperationType, { symbol: string; colorClass: string }> = {
  TABLE_SCAN: { symbol: '\u{1F4C4}', colorClass: 'bg-blue-500' },
  SELECTION: { symbol: '\u03C3', colorClass: 'bg-amber-500' },
  PROJECTION: { symbol: '\u03C0', colorClass: 'bg-green-500' },
  JOIN: { symbol: '\u22C8', colorClass: 'bg-purple-500' },
  CROSS_JOIN: { symbol: '\u00D7', colorClass: 'bg-purple-400' },
  GROUP_BY: { symbol: '\u03B3', colorClass: 'bg-pink-500' },
  DISTINCT: { symbol: '\u03B4', colorClass: 'bg-cyan-500' },
  SORT: { symbol: '\u03C4', colorClass: 'bg-orange-500' },
  LIMIT: { symbol: '\u230A\u230B', colorClass: 'bg-indigo-500' },
  UNION: { symbol: '\u222A', colorClass: 'bg-red-500' },
  INTERSECT: { symbol: '\u2229', colorClass: 'bg-red-400' },
  EXCEPT: { symbol: '\u2212', colorClass: 'bg-red-300' },
  AGGREGATE: { symbol: '\u03A3', colorClass: 'bg-pink-400' },
  SUBQUERY: { symbol: '\u2282', colorClass: 'bg-violet-500' },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the display configuration for an operation type.
 *
 * @param type - The operation type
 * @returns Symbol and color class for the operation
 */
function getOperationStyle(type: OperationType): { symbol: string; colorClass: string } {
  return operationStyles[type] || { symbol: '?', colorClass: 'bg-gray-500' };
}

/**
 * Formats a row count for display.
 *
 * @param count - The row count
 * @returns Formatted string
 */
function formatRowCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

// ============================================================================
// PlanNode Component
// ============================================================================

/**
 * Renders a single node in the execution plan tree.
 *
 * Features:
 * - Operation-specific symbols and colors
 * - Active state highlighting with pulsing animation
 * - Selection state visual feedback
 * - Row count display (input/output)
 * - Truncated condition/expression display
 * - Table name for TABLE_SCAN nodes
 * - Column list for PROJECTION nodes
 *
 * @example
 * ```tsx
 * // Used internally by React Flow
 * <PlanNode
 *   data={{
 *     node: planNode,
 *     isActive: true,
 *     isComplete: false
 *   }}
 *   selected={false}
 * />
 * ```
 */
function PlanNodeComponent({ data, selected }: NodeProps<PlanNodeData>) {
  const { node, isActive, isComplete } = data;
  const opStyle = getOperationStyle(node.type);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: 1,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        'min-w-[160px] rounded-lg border-2 bg-panel shadow-lg',
        'transition-all duration-200',
        isActive && 'border-accent ring-2 ring-accent/30',
        selected && !isActive && 'border-blue-500',
        !isActive && !selected && 'border-border'
      )}
    >
      {/* Incoming data handle (from children) */}
      <Handle
        type="target"
        position={Position.Bottom}
        className="!bg-accent !w-3 !h-3 !border-2 !border-panel"
      />

      {/* Header with symbol */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-t-lg',
          opStyle.colorClass,
          'bg-opacity-20'
        )}
      >
        <span className="text-lg font-bold">{opStyle.symbol}</span>
        <span className="text-sm font-medium truncate">{node.label}</span>
      </div>

      {/* Details */}
      <div className="px-3 py-2 space-y-1">
        {/* Condition/expression */}
        {node.condition && (
          <p
            className="text-xs font-mono text-muted truncate"
            title={node.condition}
          >
            {node.condition}
          </p>
        )}

        {/* Table name for scans */}
        {node.tableName && (
          <p className="text-xs text-muted">
            Table:{' '}
            <span className="text-foreground font-mono">{node.tableName}</span>
          </p>
        )}

        {/* Row counts */}
        {(node.inputRowCount !== undefined || node.outputRowCount !== undefined) && (
          <div className="flex items-center gap-2 text-xs">
            {node.inputRowCount !== undefined && (
              <span className="text-muted">
                In: {formatRowCount(node.inputRowCount)}
              </span>
            )}
            {node.outputRowCount !== undefined && (
              <>
                <span className="text-muted">{'\u2192'}</span>
                <span
                  className={cn(
                    node.outputRowCount < (node.inputRowCount || 0)
                      ? 'text-red-400'
                      : 'text-green-400'
                  )}
                >
                  Out: {formatRowCount(node.outputRowCount)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Columns for projection */}
        {node.columns && node.columns.length > 0 && (
          <p className="text-xs text-muted truncate">
            Cols: {node.columns.join(', ')}
          </p>
        )}

        {/* Join type */}
        {node.joinType && (
          <p className="text-xs text-muted">
            Type:{' '}
            <span className="text-foreground">{node.joinType}</span>
          </p>
        )}

        {/* Group by columns */}
        {node.groupByColumns && node.groupByColumns.length > 0 && (
          <p className="text-xs text-muted truncate">
            Group: {node.groupByColumns.join(', ')}
          </p>
        )}

        {/* Limit/offset */}
        {node.limit !== undefined && (
          <p className="text-xs text-muted">
            Limit: {node.limit}
            {node.offset !== undefined && node.offset > 0 && (
              <span>, Offset: {node.offset}</span>
            )}
          </p>
        )}

        {/* Sort order */}
        {node.orderBy && node.orderBy.length > 0 && (
          <p className="text-xs text-muted truncate">
            Order:{' '}
            {node.orderBy
              .map((s) => `${s.column} ${s.direction}`)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Active indicator - pulsing border */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-accent pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Complete indicator */}
      {isComplete && !isActive && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Outgoing handle (to parent) */}
      <Handle
        type="source"
        position={Position.Top}
        className="!bg-accent !w-3 !h-3 !border-2 !border-panel"
      />
    </motion.div>
  );
}

export const PlanNode = memo(PlanNodeComponent);
