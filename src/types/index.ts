/**
 * @fileoverview Central export point for all SQLens type definitions.
 *
 * This module re-exports all types from the types directory, providing
 * a single import point for consumers of the type system.
 *
 * @module types
 *
 * @example
 * ```typescript
 * // Import specific types
 * import { Table, Column, PlanNode, ExecutionStep } from '@/types';
 *
 * // Import everything
 * import * as Types from '@/types';
 * ```
 */

// ============================================================================
// Schema Types
// ============================================================================

/**
 * Schema types for database structure definitions.
 *
 * - Column: Individual column definition with type and constraints
 * - ForeignKey: Relationship between tables
 * - Table: Complete table definition
 * - Schema: Full database schema with all tables
 * - DatabasePreset: Pre-configured database with schema and sample data
 * - ExampleQuery: Sample query with metadata for learning
 */
export {
  // Column types
  type ColumnType,
  type Column,

  // Relationship types
  type ForeignKey,

  // Table types
  type Table,

  // Schema types
  type Schema,

  // Query types
  type QueryCategory,
  type ExampleQuery,

  // Preset types
  type SeedData,
  type DatabasePreset,
} from './schema';

// ============================================================================
// Plan Types
// ============================================================================

/**
 * Query plan types for execution visualization.
 *
 * - OperationType: All supported relational algebra operations
 * - JoinType: Types of SQL joins (INNER, LEFT, RIGHT, etc.)
 * - AggregateFunction: Aggregate functions (COUNT, SUM, AVG, etc.)
 * - PlanNode: Single node in the execution plan tree
 * - QueryPlan: Complete execution plan for a query
 * - ParseError: Error information when parsing fails
 */
export {
  // Operation types
  type OperationType,
  type JoinType,
  type AggregateFunction,

  // Aggregate definition
  type AggregateDefinition,

  // Sort definition
  type SortDirection,
  type SortDefinition,

  // Plan node types
  type PlanNode,
  type QueryPlan,

  // Error types
  type ParseError,
  type ParseResult,

  // Constants
  OPERATION_SYMBOLS,
  OPERATION_LABELS,
} from './plan';

// ============================================================================
// Step Types
// ============================================================================

/**
 * Step-through execution types for visual query walkthrough.
 *
 * - RowStatus: Status of a row during execution (included/excluded/etc.)
 * - HighlightedRow: Row data with visualization metadata
 * - IntermediateResult: Result set at a point in execution
 * - ExecutionStep: One step in the step-through process
 * - StepThroughState: Complete state for step-through visualization
 * - QueryResult: Raw query execution result
 */
export {
  // Row types
  type RowStatus,
  type HighlightedRow,

  // Result types
  type IntermediateResult,
  type QueryResult,
  type ResultColumn,
  type ResultRow,

  // Explanation types
  type StepExplanation,

  // Step types
  type ExecutionStep,
  type StepThroughState,

  // Callback types
  type StepChangeHandler,
  type PlaybackChangeHandler,

  // Configuration types
  type StepThroughConfig,

  // Constants
  ROW_STATUS_CLASSES,
  ROW_STATUS_COLORS,
} from './step';
