/**
 * @fileoverview Compact plan node component for the execution plan visualizer.
 *
 * Renders individual nodes in the query execution plan tree with
 * operation-specific styling, symbols, and status indicators.
 * Designed to be compact to reduce visual clutter.
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
const operationStyles: Record<OperationType, { symbol: string; colorClass: string; bgClass: string }> = {
  TABLE_SCAN: { symbol: '\u{1F4C4}', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/15' },
  SELECTION: { symbol: '\u03C3', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/15' },
  PROJECTION: { symbol: '\u03C0', colorClass: 'text-green-400', bgClass: 'bg-green-500/15' },
  JOIN: { symbol: '\u22C8', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/15' },
  CROSS_JOIN: { symbol: '\u00D7', colorClass: 'text-purple-300', bgClass: 'bg-purple-400/15' },
  GROUP_BY: { symbol: '\u03B3', colorClass: 'text-pink-400', bgClass: 'bg-pink-500/15' },
  DISTINCT: { symbol: '\u03B4', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500/15' },
  SORT: { symbol: '\u03C4', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/15' },
  LIMIT: { symbol: '\u230A\u230B', colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/15' },
  UNION: { symbol: '\u222A', colorClass: 'text-red-400', bgClass: 'bg-red-500/15' },
  INTERSECT: { symbol: '\u2229', colorClass: 'text-red-300', bgClass: 'bg-red-400/15' },
  EXCEPT: { symbol: '\u2212', colorClass: 'text-red-200', bgClass: 'bg-red-300/15' },
  AGGREGATE: { symbol: '\u03A3', colorClass: 'text-pink-300', bgClass: 'bg-pink-400/15' },
  SUBQUERY: { symbol: '\u2282', colorClass: 'text-violet-400', bgClass: 'bg-violet-500/15' },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the display configuration for an operation type.
 *
 * @param type - The operation type
 * @returns Symbol and color classes for the operation
 */
function getOperationStyle(type: OperationType): { symbol: string; colorClass: string; bgClass: string } {
  return operationStyles[type] || { symbol: '?', colorClass: 'text-gray-400', bgClass: 'bg-gray-500/15' };
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
 * - Compact design with minimal visual footprint
 * - Operation-specific symbols and colors
 * - Active state highlighting with pulsing animation
 * - Selection state visual feedback
 * - Truncated condition/expression display
 * - Row count output only (simpler than input/output)
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

  // Get compact label
  const label = node.tableName || node.label;
  const hasCondition = node.condition && node.condition.length > 0;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: isActive ? 1.02 : 1,
        opacity: 1,
      }}
      transition={{ duration: 0.15 }}
      className={cn(
        'min-w-[120px] max-w-[160px] rounded-md border bg-panel shadow-md',
        'transition-all duration-150',
        isActive && 'border-accent ring-1 ring-accent/40',
        selected && !isActive && 'border-blue-400',
        !isActive && !selected && 'border-border/80'
      )}
    >
      {/* Incoming data handle (from children) */}
      <Handle
        type="target"
        position={Position.Bottom}
        className="!bg-accent !w-2 !h-2 !border-2 !border-panel"
      />

      {/* Header - compact */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 rounded-t-md',
          opStyle.bgClass
        )}
      >
        <span className={cn('text-sm font-bold', opStyle.colorClass)}>{opStyle.symbol}</span>
        <span className="text-xs font-medium truncate flex-1">{label}</span>
        {node.outputRowCount !== undefined && (
          <span className="text-[10px] text-muted whitespace-nowrap">
            {formatRowCount(node.outputRowCount)}
          </span>
        )}
      </div>

      {/* Condition - only if present, very compact */}
      {hasCondition && (
        <div className="px-2 py-1 border-t border-border/50">
          <p
            className="text-[10px] font-mono text-muted truncate"
            title={node.condition}
          >
            {node.condition}
          </p>
        </div>
      )}

      {/* Active indicator - subtle pulsing border */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-md border border-accent pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}

      {/* Complete indicator - small checkmark */}
      {isComplete && !isActive && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
          <svg
            className="w-2 h-2 text-white"
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
        className="!bg-accent !w-2 !h-2 !border-2 !border-panel"
      />
    </motion.div>
  );
}

export const PlanNode = memo(PlanNodeComponent);
