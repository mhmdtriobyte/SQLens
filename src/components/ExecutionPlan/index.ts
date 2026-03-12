/**
 * @fileoverview Execution plan visualization components barrel export.
 *
 * This module exports all components for visualizing and interacting
 * with SQL query execution plans.
 *
 * @module components/ExecutionPlan
 *
 * @example
 * ```tsx
 * import { PlanTree, PlanNode } from '@/components/ExecutionPlan';
 *
 * function ExecutionPlanVisualizer() {
 *   return (
 *     <div className="h-full">
 *       <PlanTree />
 *     </div>
 *   );
 * }
 * ```
 */

// Main plan tree visualization
export { PlanTree } from './PlanTree';

// Individual plan node component (used internally by PlanTree)
export { PlanNode } from './PlanNode';

// Data flow animation overlay
export { DataFlowAnimation } from './DataFlowAnimation';
