/**
 * @fileoverview Node detail panel component for the execution plan visualizer.
 *
 * Displays detailed information about a selected node including
 * input/output data, row counts, and intermediate results.
 *
 * @module components/ExecutionPlan/NodeDetailPanel
 */

'use client';

import { memo, useMemo } from 'react';
import { X, Table, ArrowRight, Columns, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryStore, useUIStore } from '@/stores';
import { DataTable } from '@/components/shared/DataTable';
import { cn } from '@/utils';
import type { ExecutionStep, OperationType } from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the NodeDetailPanel component.
 */
interface NodeDetailPanelProps {
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
}

// ============================================================================
// Operation Icons
// ============================================================================

/**
 * Gets the appropriate icon for an operation type.
 */
function getOperationIcon(type: OperationType) {
  switch (type) {
    case 'TABLE_SCAN':
      return Table;
    case 'SELECTION':
      return Filter;
    case 'PROJECTION':
      return Columns;
    default:
      return Table;
  }
}

// ============================================================================
// Step Summary Component
// ============================================================================

/**
 * Renders a summary of row counts for a step.
 */
interface StepSummaryProps {
  step: ExecutionStep;
}

const StepSummary = memo(function StepSummary({ step }: StepSummaryProps) {
  const inputCount = step.inputs.reduce((sum, input) => sum + input.rows.length, 0);
  const outputCount = step.output.rows.filter((r) => r.status === 'included').length;
  const excludedCount = step.output.rows.filter((r) => r.status === 'excluded').length;

  const percentageChange = inputCount > 0
    ? Math.round(((outputCount - inputCount) / inputCount) * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/10 text-sm border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-muted">Input:</span>
        <span className="font-medium">{inputCount} rows</span>
      </div>

      <ArrowRight className="w-4 h-4 text-muted" />

      <div className="flex items-center gap-2">
        <span className="text-muted">Output:</span>
        <span className={cn(
          'font-medium',
          outputCount < inputCount && 'text-red-400',
          outputCount > inputCount && 'text-green-400'
        )}>
          {outputCount} rows
        </span>
      </div>

      {excludedCount > 0 && (
        <span className="text-xs text-muted">
          ({excludedCount} excluded)
        </span>
      )}

      {percentageChange !== 0 && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          percentageChange < 0 && 'bg-red-500/20 text-red-400',
          percentageChange > 0 && 'bg-green-500/20 text-green-400'
        )}>
          {percentageChange > 0 ? '+' : ''}{percentageChange}%
        </span>
      )}
    </div>
  );
});

// ============================================================================
// Input Tables Component
// ============================================================================

/**
 * Renders input tables for join operations.
 */
interface InputTablesProps {
  step: ExecutionStep;
}

const InputTables = memo(function InputTables({ step }: InputTablesProps) {
  if (step.inputs.length <= 1) return null;

  return (
    <div className="border-b border-border">
      <div className="px-4 py-2 text-xs font-medium text-muted uppercase tracking-wider bg-muted/30">
        Input Tables
      </div>
      <div className="grid grid-cols-2 gap-2 p-2">
        {step.inputs.map((input, idx) => (
          <div
            key={idx}
            className="border border-border rounded overflow-hidden"
          >
            <div className="px-2 py-1 bg-muted/20 text-xs font-medium border-b border-border">
              Input {idx + 1} ({input.rows.length} rows)
            </div>
            <div className="max-h-24 overflow-auto">
              <DataTable
                columns={input.columns}
                rows={input.rows}
                compact
                striped={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Explanation Component
// ============================================================================

/**
 * Renders the explanation section for a step.
 */
interface ExplanationProps {
  step: ExecutionStep;
}

const Explanation = memo(function Explanation({ step }: ExplanationProps) {
  const { explanation } = step;

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/5">
      <h4 className="text-sm font-medium mb-1">{explanation.title}</h4>
      <p className="text-xs text-muted leading-relaxed">{explanation.description}</p>

      {explanation.details && explanation.details.length > 0 && (
        <ul className="mt-2 space-y-1">
          {explanation.details.map((detail, idx) => (
            <li key={idx} className="text-xs text-muted flex items-start gap-2">
              <span className="text-accent mt-0.5">{'\u2022'}</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

// ============================================================================
// NodeDetailPanel Component
// ============================================================================

/**
 * Panel that displays detailed information about a selected plan node.
 *
 * Features:
 * - Input/output row count summary with change indicators
 * - DataTable showing intermediate results with status highlighting
 * - Step-by-step explanation of the operation
 * - Support for multi-input operations (joins)
 * - Dismissible with close button
 *
 * @example
 * ```tsx
 * // Positioned at the bottom of the plan tree
 * <div className="relative h-full">
 *   <ReactFlow {...props} />
 *   {selectedNodeId && <NodeDetailPanel />}
 * </div>
 * ```
 */
function NodeDetailPanelComponent({ className }: NodeDetailPanelProps) {
  const { stepThrough } = useQueryStore();
  const { selectedNodeId, setSelectedNodeId } = useUIStore();

  // Find the step for the selected node
  const step = useMemo(() => {
    return stepThrough.steps.find((s) => s.nodeId === selectedNodeId) || null;
  }, [stepThrough.steps, selectedNodeId]);

  // Close handler
  const handleClose = () => {
    setSelectedNodeId(null);
  };

  // Get operation icon
  const IconComponent = step ? getOperationIcon(step.node.type) : Table;

  return (
    <AnimatePresence>
      {step && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute bottom-4 left-4 right-4 max-h-[40%] z-10',
            'bg-panel border border-border rounded-lg shadow-xl overflow-hidden',
            'flex flex-col',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/10">
            <div className="flex items-center gap-2">
              <IconComponent className="w-4 h-4 text-muted" />
              <span className="text-sm font-medium">{step.node.label}</span>
              {step.node.condition && (
                <span className="text-xs text-muted font-mono bg-muted/30 px-1.5 py-0.5 rounded">
                  {step.node.condition}
                </span>
              )}
              <span className="text-xs text-muted">
                Step {step.stepNumber} of {stepThrough.steps.length}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-muted hover:text-foreground transition-colors rounded hover:bg-muted/30"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row counts summary */}
          <StepSummary step={step} />

          {/* Explanation */}
          <Explanation step={step} />

          {/* Input tables for joins */}
          <InputTables step={step} />

          {/* Data table */}
          <div className="flex-1 overflow-auto min-h-0">
            <DataTable
              columns={step.output.columns}
              rows={step.output.rows}
              showRowStatus
              compact
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const NodeDetailPanel = memo(NodeDetailPanelComponent);
