/**
 * @fileoverview Step-through execution type definitions for SQLens.
 *
 * This module defines types for representing the step-by-step execution
 * of query plans, including intermediate results, row highlighting,
 * and explanations for educational visualization.
 *
 * @module types/step
 */

import { PlanNode } from './plan';

// ============================================================================
// Row Status Types
// ============================================================================

/**
 * Status of a row during step-through visualization.
 *
 * - included: Row passes the current operation's filter/condition
 * - excluded: Row is filtered out by the current operation
 * - pending: Row has not yet been evaluated
 * - new: Row is newly created (e.g., from aggregation or join)
 */
export type RowStatus = 'included' | 'excluded' | 'pending' | 'new';

// ============================================================================
// Highlighted Row
// ============================================================================

/**
 * Represents a data row with visualization metadata.
 *
 * During step-through execution, rows are annotated with their status
 * and relationships to other rows for visual highlighting.
 *
 * @example
 * ```typescript
 * // A row that passed a WHERE filter
 * const includedRow: HighlightedRow = {
 *   data: { id: 1, name: 'Alice', age: 25 },
 *   status: 'included'
 * };
 *
 * // A row excluded by WHERE age > 21
 * const excludedRow: HighlightedRow = {
 *   data: { id: 2, name: 'Bob', age: 18 },
 *   status: 'excluded'
 * };
 *
 * // A row in a join showing which rows it matched
 * const joinedRow: HighlightedRow = {
 *   data: { student_id: 1, course_id: 101 },
 *   status: 'included',
 *   matchedWith: [0, 2]  // Matched with rows at indices 0 and 2
 * };
 *
 * // A row in a GROUP BY showing group membership
 * const groupedRow: HighlightedRow = {
 *   data: { name: 'Alice', department: 'CS' },
 *   status: 'included',
 *   groupId: 0  // Belongs to group 0
 * };
 * ```
 */
export interface HighlightedRow {
  /**
   * The actual row data as a column-value mapping.
   */
  data: Record<string, any>;

  /**
   * The current status of this row in the visualization.
   */
  status: RowStatus;

  /**
   * For JOIN operations: indices of rows from the other table
   * that this row matched with.
   * Empty array indicates no matches (relevant for outer joins).
   */
  matchedWith?: number[];

  /**
   * For GROUP BY operations: the identifier of the group
   * this row belongs to.
   * Used to visually group rows with the same grouping key.
   */
  groupId?: number;
}

// ============================================================================
// Intermediate Result
// ============================================================================

/**
 * Represents the intermediate result at a point in query execution.
 *
 * Contains the current set of rows and their column structure,
 * along with highlighting information for visualization.
 *
 * @example
 * ```typescript
 * const result: IntermediateResult = {
 *   columns: ['id', 'name', 'age'],
 *   rows: [
 *     { data: { id: 1, name: 'Alice', age: 25 }, status: 'included' },
 *     { data: { id: 2, name: 'Bob', age: 18 }, status: 'excluded' },
 *     { data: { id: 3, name: 'Carol', age: 30 }, status: 'included' }
 *   ]
 * };
 * ```
 */
export interface IntermediateResult {
  /**
   * Array of column names in the result set.
   * Order determines display order in the visualization.
   */
  columns: string[];

  /**
   * Array of rows with highlighting metadata.
   */
  rows: HighlightedRow[];
}

// ============================================================================
// Step Explanation
// ============================================================================

/**
 * Plain English explanation of what happens at an execution step.
 *
 * Provides educational context to help users understand each
 * operation in the query execution plan.
 *
 * @example
 * ```typescript
 * const selectionExplanation: StepExplanation = {
 *   title: 'Filtering rows with WHERE clause',
 *   description: 'The WHERE clause `age > 21` checks each row and keeps only those where the age column has a value greater than 21.',
 *   beforeCount: 5,
 *   afterCount: 3,
 *   operation: 'age > 21',
 *   details: [
 *     'Row with age=18 is excluded because 18 is not greater than 21',
 *     'Row with age=25 is included because 25 > 21',
 *     '2 rows were filtered out'
 *   ]
 * };
 * ```
 */
export interface StepExplanation {
  /**
   * Short title describing the operation.
   * Displayed as a heading in the explanation panel.
   */
  title: string;

  /**
   * Detailed explanation of what the operation does.
   * Written in plain English for educational purposes.
   */
  description: string;

  /**
   * Number of rows before this operation was applied.
   */
  beforeCount: number;

  /**
   * Number of rows after this operation was applied.
   */
  afterCount: number;

  /**
   * The specific operation expression being performed.
   * For SELECTION: the WHERE predicate
   * For PROJECTION: the column list
   * For JOIN: the join condition
   */
  operation: string;

  /**
   * Additional bullet points providing extra context.
   * Can include specific examples of rows being included/excluded.
   */
  details?: string[];
}

// ============================================================================
// Execution Step
// ============================================================================

/**
 * Represents one step in the step-through query execution.
 *
 * Each step corresponds to processing one node in the query plan tree,
 * transforming input data into output data according to the operation.
 *
 * @example
 * ```typescript
 * const selectionStep: ExecutionStep = {
 *   stepNumber: 2,
 *   nodeId: 'node-selection-1',
 *   node: selectionPlanNode,
 *   inputs: [tableScanResult],
 *   output: filteredResult,
 *   explanation: {
 *     title: 'Filtering with WHERE',
 *     description: 'Applying WHERE age > 21...',
 *     beforeCount: 5,
 *     afterCount: 3,
 *     operation: 'age > 21'
 *   },
 *   isComplete: true
 * };
 * ```
 */
export interface ExecutionStep {
  /**
   * Sequential step number (1-indexed) for display.
   */
  stepNumber: number;

  /**
   * The ID of the plan node being executed at this step.
   */
  nodeId: string;

  /**
   * Reference to the full plan node with operation details.
   */
  node: PlanNode;

  /**
   * Input data to this step from child node(s).
   * - Unary operations: single input
   * - Binary operations (JOIN, UNION): two inputs
   * - Leaf nodes (TABLE_SCAN): empty array
   */
  inputs: IntermediateResult[];

  /**
   * Output data produced by this step.
   * Becomes input to the parent node.
   */
  output: IntermediateResult;

  /**
   * Plain English explanation of this step for education.
   */
  explanation: StepExplanation;

  /**
   * Whether this step has finished executing.
   * Used for animation: false while animating, true when done.
   */
  isComplete: boolean;
}

// ============================================================================
// Step-Through State
// ============================================================================

/**
 * Complete state for step-through execution visualization.
 *
 * Manages the list of all steps, current position, playback state,
 * and the final result of query execution.
 *
 * @example
 * ```typescript
 * const stepState: StepThroughState = {
 *   steps: [tableScanStep, selectionStep, projectionStep],
 *   currentStepIndex: 1,  // Currently showing selection step
 *   isPlaying: false,     // Paused
 *   playbackSpeed: 1000,  // 1 second between steps
 *   finalResult: {
 *     columns: ['name', 'age'],
 *     rows: [
 *       { data: { name: 'Alice', age: 25 }, status: 'included' },
 *       { data: { name: 'Carol', age: 30 }, status: 'included' }
 *     ]
 *   }
 * };
 * ```
 */
export interface StepThroughState {
  /**
   * Array of all execution steps in order.
   * Follows bottom-up tree traversal (leaves first, root last).
   */
  steps: ExecutionStep[];

  /**
   * Index of the currently displayed step (0-indexed).
   * -1 indicates no step is selected (initial state).
   */
  currentStepIndex: number;

  /**
   * Whether automatic playback is active.
   * When true, steps advance automatically at playbackSpeed interval.
   */
  isPlaying: boolean;

  /**
   * Milliseconds to wait between steps during playback.
   * Lower values = faster playback.
   */
  playbackSpeed: number;

  /**
   * The final result after all steps complete.
   * Null if execution has not completed or failed.
   */
  finalResult: IntermediateResult | null;
}

// ============================================================================
// Result Column and Row Types
// ============================================================================

/**
 * Represents a column in a query result.
 *
 * @example
 * ```typescript
 * const column: ResultColumn = {
 *   name: 'student_name',
 *   type: 'TEXT'
 * };
 * ```
 */
export interface ResultColumn {
  /**
   * The name of the column.
   */
  name: string;

  /**
   * The data type of the column (optional, may be 'unknown').
   */
  type?: string;
}

/**
 * Represents a row in a query result.
 * Maps column names to their values.
 *
 * @example
 * ```typescript
 * const row: ResultRow = {
 *   id: 1,
 *   name: 'Alice',
 *   age: 25
 * };
 * ```
 */
export type ResultRow = Record<string, string | number | boolean | null>;

// ============================================================================
// Query Result
// ============================================================================

/**
 * Raw query execution result from the database engine.
 *
 * Represents the direct output from executing a SQL query,
 * without step-through visualization metadata.
 *
 * @example
 * ```typescript
 * const result: QueryResult = {
 *   success: true,
 *   columns: [{ name: 'id', type: 'INTEGER' }, { name: 'name', type: 'TEXT' }],
 *   rows: [
 *     { id: 1, name: 'Alice' },
 *     { id: 2, name: 'Bob' }
 *   ],
 *   executionTime: 15  // milliseconds
 * };
 *
 * // Error case
 * const errorResult: QueryResult = {
 *   success: false,
 *   columns: [],
 *   rows: [],
 *   executionTime: 0,
 *   error: 'Table "users" does not exist'
 * };
 * ```
 */
export interface QueryResult {
  /**
   * Whether the query executed successfully.
   */
  success: boolean;

  /**
   * Array of column definitions in the result set.
   */
  columns: ResultColumn[];

  /**
   * Array of data rows as key-value objects.
   * Each row maps column names to their values.
   */
  rows: ResultRow[];

  /**
   * Number of rows in the result set.
   */
  rowCount: number;

  /**
   * Query execution time in milliseconds.
   */
  executionTime: number;

  /**
   * Number of rows affected by the query (for INSERT, UPDATE, DELETE).
   */
  rowsAffected?: number;

  /**
   * Error message if the query failed.
   * Undefined for successful queries.
   */
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Callback function type for step change events.
 */
export type StepChangeHandler = (step: ExecutionStep, index: number) => void;

/**
 * Callback function type for playback state changes.
 */
export type PlaybackChangeHandler = (isPlaying: boolean) => void;

/**
 * Configuration options for step-through execution.
 */
export interface StepThroughConfig {
  /**
   * Initial playback speed in milliseconds.
   * @default 1000
   */
  initialSpeed?: number;

  /**
   * Whether to start in playing mode.
   * @default false
   */
  autoPlay?: boolean;

  /**
   * Whether to loop back to start after completing.
   * @default false
   */
  loop?: boolean;

  /**
   * Callback when step changes.
   */
  onStepChange?: StepChangeHandler;

  /**
   * Callback when playback state changes.
   */
  onPlaybackChange?: PlaybackChangeHandler;
}

/**
 * Maps row status to CSS class names for styling.
 */
export const ROW_STATUS_CLASSES: Record<RowStatus, string> = {
  included: 'row-included',
  excluded: 'row-excluded',
  pending: 'row-pending',
  new: 'row-new',
};

/**
 * Maps row status to display colors.
 */
export const ROW_STATUS_COLORS: Record<RowStatus, string> = {
  included: '#4ade80',  // Green
  excluded: '#f87171',  // Red
  pending: '#fbbf24',   // Yellow
  new: '#60a5fa',       // Blue
};
