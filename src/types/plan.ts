/**
 * @fileoverview Query plan type definitions for SQLens visualization.
 *
 * This module defines types for representing SQL query execution plans
 * as trees of relational algebra operations, enabling visual step-through
 * of query execution.
 *
 * @module types/plan
 */

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Enumeration of all supported relational algebra operation types.
 *
 * Each operation type corresponds to a specific SQL clause or
 * relational algebra operator:
 *
 * - TABLE_SCAN: Leaf node that reads data from a base table
 * - SELECTION: WHERE clause filter (sigma - σ)
 * - PROJECTION: SELECT column list (pi - π)
 * - JOIN: Various join operations (bowtie - ⋈)
 * - CROSS_JOIN: Cartesian product (times - ×)
 * - GROUP_BY: GROUP BY with aggregation (gamma - γ)
 * - DISTINCT: Remove duplicate rows (delta - δ)
 * - SORT: ORDER BY clause (tau - τ)
 * - LIMIT: LIMIT/OFFSET for pagination
 * - UNION: Set union of two result sets (∪)
 * - INTERSECT: Set intersection (∩)
 * - EXCEPT: Set difference (-)
 * - SUBQUERY: Nested query as a derived table
 * - AGGREGATE: Aggregate functions without GROUP BY
 */
export type OperationType =
  | 'TABLE_SCAN'
  | 'SELECTION'
  | 'PROJECTION'
  | 'JOIN'
  | 'CROSS_JOIN'
  | 'GROUP_BY'
  | 'DISTINCT'
  | 'SORT'
  | 'LIMIT'
  | 'UNION'
  | 'INTERSECT'
  | 'EXCEPT'
  | 'SUBQUERY'
  | 'AGGREGATE';

/**
 * Supported SQL join types.
 *
 * - INNER: Returns only matching rows from both tables
 * - LEFT: Returns all rows from left table, matched rows from right
 * - RIGHT: Returns all rows from right table, matched rows from left
 * - FULL: Returns all rows from both tables with NULLs where no match
 * - CROSS: Cartesian product of both tables
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

/**
 * Supported SQL aggregate functions.
 *
 * - COUNT: Number of rows/non-null values
 * - SUM: Sum of numeric values
 * - AVG: Average of numeric values
 * - MIN: Minimum value
 * - MAX: Maximum value
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

// ============================================================================
// Aggregate Definition
// ============================================================================

/**
 * Represents a single aggregate function application.
 *
 * @example
 * ```typescript
 * const countAggregate: AggregateDefinition = {
 *   func: 'COUNT',
 *   column: '*',
 *   alias: 'total_count'
 * };
 *
 * const avgSalary: AggregateDefinition = {
 *   func: 'AVG',
 *   column: 'salary',
 *   alias: 'average_salary'
 * };
 * ```
 */
export interface AggregateDefinition {
  /**
   * The aggregate function to apply.
   */
  func: AggregateFunction;

  /**
   * The column to aggregate. Use '*' for COUNT(*).
   */
  column: string;

  /**
   * The alias for the result column in the output.
   */
  alias: string;
}

// ============================================================================
// Sort Order Definition
// ============================================================================

/**
 * Sort direction for ORDER BY clauses.
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Represents a single column sort specification.
 *
 * @example
 * ```typescript
 * const sortByDate: SortDefinition = {
 *   column: 'created_at',
 *   direction: 'DESC'
 * };
 * ```
 */
export interface SortDefinition {
  /**
   * The column name to sort by.
   */
  column: string;

  /**
   * The sort direction: ascending or descending.
   */
  direction: SortDirection;
}

// ============================================================================
// Plan Node
// ============================================================================

/**
 * Represents a single node in the query execution plan tree.
 *
 * Each node represents one relational algebra operation with its
 * specific parameters, child nodes (inputs), and rendering position.
 *
 * The tree structure represents the data flow: data flows from leaf
 * nodes (TABLE_SCAN) up through intermediate operations to the root
 * node which produces the final result.
 *
 * @example
 * ```typescript
 * // A simple selection node
 * const selectionNode: PlanNode = {
 *   id: 'node-1',
 *   type: 'SELECTION',
 *   symbol: 'σ',
 *   label: 'Selection',
 *   condition: 'age > 21',
 *   children: [tableScanNode]
 * };
 *
 * // A join node with two inputs
 * const joinNode: PlanNode = {
 *   id: 'node-2',
 *   type: 'JOIN',
 *   symbol: '⋈',
 *   label: 'Inner Join',
 *   joinType: 'INNER',
 *   joinCondition: 'students.id = enrollments.student_id',
 *   children: [leftTableScan, rightTableScan]
 * };
 * ```
 */
export interface PlanNode {
  /**
   * Unique identifier for this node within the plan.
   * Used for referencing nodes during step-through execution.
   */
  id: string;

  /**
   * The type of relational operation this node performs.
   */
  type: OperationType;

  // -------------------------------------------------------------------------
  // Display Information
  // -------------------------------------------------------------------------

  /**
   * Mathematical symbol for the operation.
   * Used in compact/formal notation displays.
   * Examples: σ (selection), π (projection), ⋈ (join)
   */
  symbol: string;

  /**
   * Human-readable label for the operation.
   * Displayed as the node title in the visualization.
   * Examples: "Selection", "Inner Join", "Group By"
   */
  label: string;

  /**
   * The condition or expression associated with this operation.
   * For SELECTION: the WHERE predicate
   * For JOIN: the join condition
   * For other ops: relevant expression
   */
  condition?: string;

  // -------------------------------------------------------------------------
  // Table Scan Properties
  // -------------------------------------------------------------------------

  /**
   * For TABLE_SCAN: the name of the table being scanned.
   */
  tableName?: string;

  /**
   * For TABLE_SCAN: the alias used for the table in the query.
   * Example: "students s" -> tableName='students', tableAlias='s'
   */
  tableAlias?: string;

  // -------------------------------------------------------------------------
  // Projection Properties
  // -------------------------------------------------------------------------

  /**
   * For PROJECTION: the list of column names or expressions being selected.
   * Includes computed columns and aliases.
   */
  columns?: string[];

  // -------------------------------------------------------------------------
  // Join Properties
  // -------------------------------------------------------------------------

  /**
   * For JOIN: the type of join being performed.
   */
  joinType?: JoinType;

  /**
   * For JOIN: the condition on which tables are joined.
   * Example: "students.id = enrollments.student_id"
   */
  joinCondition?: string;

  // -------------------------------------------------------------------------
  // Aggregation Properties
  // -------------------------------------------------------------------------

  /**
   * For GROUP_BY: columns used for grouping.
   */
  groupByColumns?: string[];

  /**
   * For GROUP_BY and AGGREGATE: the aggregate functions being applied.
   */
  aggregates?: AggregateDefinition[];

  // -------------------------------------------------------------------------
  // Sort Properties
  // -------------------------------------------------------------------------

  /**
   * For SORT: the columns and directions for ordering.
   */
  orderBy?: SortDefinition[];

  // -------------------------------------------------------------------------
  // Limit Properties
  // -------------------------------------------------------------------------

  /**
   * For LIMIT: maximum number of rows to return.
   */
  limit?: number;

  /**
   * For LIMIT: number of rows to skip before returning results.
   */
  offset?: number;

  // -------------------------------------------------------------------------
  // Tree Structure
  // -------------------------------------------------------------------------

  /**
   * Child nodes that provide input to this operation.
   * - Leaf nodes (TABLE_SCAN): empty array
   * - Unary operations (SELECTION, PROJECTION, etc.): single child
   * - Binary operations (JOIN, UNION, etc.): two children
   */
  children: PlanNode[];

  // -------------------------------------------------------------------------
  // Rendering Position
  // -------------------------------------------------------------------------

  /**
   * X coordinate for rendering this node in the visualization.
   * Calculated by the layout algorithm.
   */
  x?: number;

  /**
   * Y coordinate for rendering this node in the visualization.
   * Calculated by the layout algorithm.
   */
  y?: number;

  // -------------------------------------------------------------------------
  // Runtime Statistics
  // -------------------------------------------------------------------------

  /**
   * Number of rows received as input to this operation.
   * Populated during step-through execution.
   */
  inputRowCount?: number;

  /**
   * Number of rows produced by this operation.
   * Populated during step-through execution.
   */
  outputRowCount?: number;
}

// ============================================================================
// Query Plan
// ============================================================================

/**
 * Represents a complete query execution plan.
 *
 * The plan is a tree structure where the root node represents the
 * final operation, and leaf nodes represent table scans. Data flows
 * from leaves to root during execution.
 *
 * @example
 * ```typescript
 * const plan: QueryPlan = {
 *   root: projectionNode,  // Top of the tree
 *   originalQuery: 'SELECT name, age FROM students WHERE age > 21',
 *   nodeCount: 3  // TABLE_SCAN -> SELECTION -> PROJECTION
 * };
 * ```
 */
export interface QueryPlan {
  /**
   * The root node of the execution plan tree.
   * This node produces the final query result.
   */
  root: PlanNode;

  /**
   * The original SQL query string that was parsed to create this plan.
   */
  originalQuery: string;

  /**
   * Total number of nodes in the plan tree.
   * Useful for progress indication during step-through.
   */
  nodeCount: number;
}

// ============================================================================
// Parse Error
// ============================================================================

/**
 * Represents an error encountered while parsing a SQL query.
 *
 * Includes both technical error details and user-friendly messages
 * with suggestions for fixing the query.
 *
 * @example
 * ```typescript
 * const error: ParseError = {
 *   message: "Unexpected token 'FORM' at line 1, column 8",
 *   friendlyMessage: "Did you mean 'FROM' instead of 'FORM'?",
 *   line: 1,
 *   column: 8,
 *   suggestions: [
 *     "Check the spelling of SQL keywords",
 *     "The FROM clause specifies which table to query"
 *   ]
 * };
 * ```
 */
export interface ParseError {
  /**
   * Technical error message from the parser.
   * May include internal details useful for debugging.
   */
  message: string;

  /**
   * User-friendly error message explaining the problem.
   * Should be understandable by SQL beginners.
   */
  friendlyMessage: string;

  /**
   * Line number where the error occurred (1-indexed).
   */
  line?: number;

  /**
   * Column number where the error occurred (1-indexed).
   */
  column?: number;

  /**
   * Array of suggestions for fixing the error.
   * Helps users understand how to correct their query.
   */
  suggestions?: string[];

  /**
   * The problematic token in the query.
   */
  token?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for query plan parsing operations.
 * Either contains a successful plan or an error.
 */
export type ParseResult =
  | { success: true; plan: QueryPlan }
  | { success: false; error: ParseError };

/**
 * Maps operation types to their mathematical symbols.
 */
export const OPERATION_SYMBOLS: Record<OperationType, string> = {
  TABLE_SCAN: '⊙',
  SELECTION: 'σ',
  PROJECTION: 'π',
  JOIN: '⋈',
  CROSS_JOIN: '×',
  GROUP_BY: 'γ',
  DISTINCT: 'δ',
  SORT: 'τ',
  LIMIT: 'λ',
  UNION: '∪',
  INTERSECT: '∩',
  EXCEPT: '−',
  SUBQUERY: '⊂',
  AGGREGATE: 'Σ',
};

/**
 * Maps operation types to their display labels.
 */
export const OPERATION_LABELS: Record<OperationType, string> = {
  TABLE_SCAN: 'Table Scan',
  SELECTION: 'Selection',
  PROJECTION: 'Projection',
  JOIN: 'Join',
  CROSS_JOIN: 'Cross Join',
  GROUP_BY: 'Group By',
  DISTINCT: 'Distinct',
  SORT: 'Sort',
  LIMIT: 'Limit',
  UNION: 'Union',
  INTERSECT: 'Intersect',
  EXCEPT: 'Except',
  SUBQUERY: 'Subquery',
  AGGREGATE: 'Aggregate',
};
