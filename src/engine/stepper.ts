/**
 * @fileoverview Step-through execution engine for SQLens.
 *
 * This module provides the core execution engine that processes query plans
 * step-by-step, producing intermediate results with row highlighting for
 * educational visualization. Each step corresponds to a relational algebra
 * operation in the query plan tree.
 *
 * @module engine/stepper
 */

import type {
  PlanNode,
  QueryPlan,
  ExecutionStep,
  IntermediateResult,
  HighlightedRow,
  RowStatus,
  JoinType,
  AggregateDefinition
} from '@/types';
import { executeQuery } from './database';
import { generateExplanation } from './explainer';

// ============================================================================
// Main Execution Functions
// ============================================================================

/**
 * Execute a query plan step by step, returning intermediate results.
 *
 * Processes the plan tree in bottom-up order (leaves first), executing
 * each node and capturing the intermediate results for visualization.
 *
 * @param plan - The query plan to execute
 * @returns Array of execution steps with intermediate results
 *
 * @example
 * ```typescript
 * const steps = executeSteps(queryPlan);
 * steps.forEach((step, index) => {
 *   console.log(`Step ${index + 1}: ${step.explanation.title}`);
 *   console.log(`  Rows: ${step.output.rows.length}`);
 * });
 * ```
 */
export function executeSteps(plan: QueryPlan): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const nodeResults = new Map<string, IntermediateResult>();

  // Get nodes in execution order (bottom-up, leaves first)
  const executionOrder = getExecutionOrder(plan.root);

  let stepNumber = 0;
  for (const node of executionOrder) {
    stepNumber++;
    const step = executeNode(node, nodeResults, stepNumber);
    steps.push(step);
    nodeResults.set(node.id, step.output);
  }

  return steps;
}

/**
 * Execute a single node given results from children.
 *
 * @param node - The plan node to execute
 * @param childResults - Map of child node IDs to their results
 * @param stepNumber - The sequential step number
 * @returns The execution step with input, output, and explanation
 */
function executeNode(
  node: PlanNode,
  childResults: Map<string, IntermediateResult>,
  stepNumber: number
): ExecutionStep {
  // Get inputs from children
  const inputs = node.children.map(child =>
    childResults.get(child.id) || createEmptyResult()
  );

  let output: IntermediateResult;

  switch (node.type) {
    case 'TABLE_SCAN':
      output = executeTableScan(node);
      break;
    case 'SELECTION':
      output = executeSelection(node, inputs[0] || createEmptyResult());
      break;
    case 'PROJECTION':
      output = executeProjection(node, inputs[0] || createEmptyResult());
      break;
    case 'JOIN':
      output = executeJoin(
        node,
        inputs[0] || createEmptyResult(),
        inputs[1] || createEmptyResult()
      );
      break;
    case 'CROSS_JOIN':
      output = executeCrossJoin(
        node,
        inputs[0] || createEmptyResult(),
        inputs[1] || createEmptyResult()
      );
      break;
    case 'GROUP_BY':
      output = executeGroupBy(node, inputs[0] || createEmptyResult());
      break;
    case 'AGGREGATE':
      output = executeAggregate(node, inputs[0] || createEmptyResult());
      break;
    case 'DISTINCT':
      output = executeDistinct(node, inputs[0] || createEmptyResult());
      break;
    case 'SORT':
      output = executeSort(node, inputs[0] || createEmptyResult());
      break;
    case 'LIMIT':
      output = executeLimit(node, inputs[0] || createEmptyResult());
      break;
    case 'UNION':
      output = executeUnion(
        inputs[0] || createEmptyResult(),
        inputs[1] || createEmptyResult()
      );
      break;
    case 'INTERSECT':
      output = executeIntersect(
        inputs[0] || createEmptyResult(),
        inputs[1] || createEmptyResult()
      );
      break;
    case 'EXCEPT':
      output = executeExcept(
        inputs[0] || createEmptyResult(),
        inputs[1] || createEmptyResult()
      );
      break;
    case 'SUBQUERY':
      output = inputs[0] || createEmptyResult();
      break;
    default:
      output = inputs[0] || createEmptyResult();
  }

  // Update node with row counts
  node.inputRowCount = inputs.reduce(
    (sum, i) => sum + (i?.rows.filter(r => r.status === 'included').length || 0),
    0
  );
  node.outputRowCount = output.rows.filter(r => r.status === 'included').length;

  return {
    stepNumber,
    nodeId: node.id,
    node,
    inputs,
    output,
    explanation: generateExplanation(node, inputs, output),
    isComplete: true
  };
}

// ============================================================================
// Table Scan Execution
// ============================================================================

/**
 * Execute table scan - load all rows from table.
 *
 * @param node - The TABLE_SCAN node
 * @returns Intermediate result with all table rows
 */
function executeTableScan(node: PlanNode): IntermediateResult {
  const tableName = node.tableName || '';

  if (!tableName) {
    return createEmptyResult();
  }

  const result = executeQuery(`SELECT * FROM ${sanitizeIdentifier(tableName)}`);

  if (!result.success || !result.columns) {
    return createEmptyResult();
  }

  const columns = result.columns.map(c => c.name);
  const rows: HighlightedRow[] = result.rows.map(row => ({
    data: { ...row },
    status: 'included' as RowStatus
  }));

  return { columns, rows };
}

// ============================================================================
// Selection (WHERE) Execution
// ============================================================================

/**
 * Execute selection (WHERE) - mark filtered rows.
 *
 * Evaluates the condition against each row, marking rows that pass
 * as 'included' and rows that fail as 'excluded'.
 *
 * @param node - The SELECTION node with condition
 * @param input - Input intermediate result
 * @returns Result with rows marked by filter status
 */
function executeSelection(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const condition = node.condition || '';

  if (!condition) {
    return input;
  }

  const rows = input.rows.map(row => {
    // Only evaluate rows that were previously included
    if (row.status !== 'included') {
      return row;
    }

    const passes = evaluateCondition(condition, row.data);
    return {
      ...row,
      status: passes ? 'included' : 'excluded' as RowStatus
    };
  });

  return {
    columns: input.columns,
    rows
  };
}

// ============================================================================
// Projection (SELECT columns) Execution
// ============================================================================

/**
 * Execute projection (SELECT columns).
 *
 * Selects only the specified columns, potentially with computed expressions.
 *
 * @param node - The PROJECTION node with column list
 * @param input - Input intermediate result
 * @returns Result with only selected columns
 */
function executeProjection(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const selectedColumns = node.columns || input.columns;

  const rows = input.rows
    .filter(r => r.status === 'included')
    .map(row => ({
      data: Object.fromEntries(
        selectedColumns.map(col => {
          // Handle column aliases (e.g., "name AS student_name")
          const { sourceCol, aliasCol } = parseColumnExpression(col);
          const value = row.data[sourceCol] ?? row.data[col] ?? null;
          return [aliasCol, value];
        })
      ),
      status: 'included' as RowStatus
    }));

  // Use alias names for output columns
  const outputColumns = selectedColumns.map(col => {
    const { aliasCol } = parseColumnExpression(col);
    return aliasCol;
  });

  return { columns: outputColumns, rows };
}

// ============================================================================
// JOIN Execution
// ============================================================================

/**
 * Execute JOIN - match rows from two inputs.
 *
 * Supports INNER, LEFT, RIGHT, and FULL joins with condition evaluation.
 *
 * @param node - The JOIN node with join type and condition
 * @param left - Left input result
 * @param right - Right input result
 * @returns Joined result with matched rows
 */
function executeJoin(
  node: PlanNode,
  left: IntermediateResult,
  right: IntermediateResult
): IntermediateResult {
  const joinType: JoinType = node.joinType || 'INNER';
  const condition = node.joinCondition || '';

  const outputRows: HighlightedRow[] = [];
  const columns = [...left.columns, ...right.columns];

  const leftIncluded = left.rows.filter(r => r.status === 'included');
  const rightIncluded = right.rows.filter(r => r.status === 'included');

  // Track which rows have been matched (for outer joins)
  const leftMatched = new Set<number>();
  const rightMatched = new Set<number>();

  // Process all left-right combinations
  leftIncluded.forEach((leftRow, leftIdx) => {
    rightIncluded.forEach((rightRow, rightIdx) => {
      const matches = evaluateJoinCondition(condition, leftRow.data, rightRow.data);

      if (matches) {
        leftMatched.add(leftIdx);
        rightMatched.add(rightIdx);

        outputRows.push({
          data: { ...leftRow.data, ...rightRow.data },
          status: 'included',
          matchedWith: [leftIdx, rightIdx]
        });
      }
    });
  });

  // LEFT JOIN - include unmatched left rows with nulls
  if (joinType === 'LEFT' || joinType === 'FULL') {
    leftIncluded.forEach((leftRow, leftIdx) => {
      if (!leftMatched.has(leftIdx)) {
        const nullRight = Object.fromEntries(
          right.columns.map(col => [col, null])
        );
        outputRows.push({
          data: { ...leftRow.data, ...nullRight },
          status: 'included',
          matchedWith: [leftIdx, -1]
        });
      }
    });
  }

  // RIGHT JOIN - include unmatched right rows with nulls
  if (joinType === 'RIGHT' || joinType === 'FULL') {
    rightIncluded.forEach((rightRow, rightIdx) => {
      if (!rightMatched.has(rightIdx)) {
        const nullLeft = Object.fromEntries(
          left.columns.map(col => [col, null])
        );
        outputRows.push({
          data: { ...nullLeft, ...rightRow.data },
          status: 'included',
          matchedWith: [-1, rightIdx]
        });
      }
    });
  }

  return { columns, rows: outputRows };
}

/**
 * Execute CROSS JOIN - Cartesian product of two inputs.
 *
 * @param node - The CROSS_JOIN node
 * @param left - Left input result
 * @param right - Right input result
 * @returns Cartesian product result
 */
function executeCrossJoin(
  node: PlanNode,
  left: IntermediateResult,
  right: IntermediateResult
): IntermediateResult {
  const outputRows: HighlightedRow[] = [];
  const columns = [...left.columns, ...right.columns];

  const leftIncluded = left.rows.filter(r => r.status === 'included');
  const rightIncluded = right.rows.filter(r => r.status === 'included');

  leftIncluded.forEach((leftRow, leftIdx) => {
    rightIncluded.forEach((rightRow, rightIdx) => {
      outputRows.push({
        data: { ...leftRow.data, ...rightRow.data },
        status: 'included',
        matchedWith: [leftIdx, rightIdx]
      });
    });
  });

  return { columns, rows: outputRows };
}

// ============================================================================
// GROUP BY Execution
// ============================================================================

/**
 * Execute GROUP BY with aggregation.
 *
 * Groups rows by the specified columns and calculates aggregate values
 * for each group.
 *
 * @param node - The GROUP_BY node with columns and aggregates
 * @param input - Input intermediate result
 * @returns Grouped and aggregated result
 */
function executeGroupBy(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const groupCols = node.groupByColumns || [];
  const aggregates = node.aggregates || [];

  // Group rows by groupBy columns
  const groups = new Map<string, HighlightedRow[]>();

  const includedRows = input.rows.filter(r => r.status === 'included');

  includedRows.forEach(row => {
    const key = groupCols.map(c => String(row.data[c] ?? 'NULL')).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  // Calculate aggregates for each group
  const outputRows: HighlightedRow[] = [];
  let groupId = 0;

  groups.forEach((groupRows) => {
    const data: Record<string, unknown> = {};

    // Add group by column values
    groupCols.forEach(col => {
      data[col] = groupRows[0]?.data[col];
    });

    // Calculate aggregates
    aggregates.forEach(agg => {
      data[agg.alias] = calculateAggregate(agg.func, agg.column, groupRows);
    });

    outputRows.push({
      data,
      status: 'included',
      groupId: groupId++
    });
  });

  const columns = [...groupCols, ...aggregates.map(a => a.alias)];
  return { columns, rows: outputRows };
}

// ============================================================================
// AGGREGATE Execution (without GROUP BY)
// ============================================================================

/**
 * Execute AGGREGATE functions without GROUP BY.
 *
 * Calculates aggregate values over all rows, producing a single row result.
 *
 * @param node - The AGGREGATE node with aggregate definitions
 * @param input - Input intermediate result
 * @returns Single-row aggregated result
 */
function executeAggregate(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const aggregates = node.aggregates || [];
  const includedRows = input.rows.filter(r => r.status === 'included');

  const data: Record<string, unknown> = {};

  aggregates.forEach(agg => {
    data[agg.alias] = calculateAggregate(agg.func, agg.column, includedRows);
  });

  const columns = aggregates.map(a => a.alias);
  const rows: HighlightedRow[] = [{
    data,
    status: 'new' as RowStatus
  }];

  return { columns, rows };
}

// ============================================================================
// DISTINCT Execution
// ============================================================================

/**
 * Execute DISTINCT - remove duplicate rows.
 *
 * @param node - The DISTINCT node
 * @param input - Input intermediate result
 * @returns Result with duplicates removed
 */
function executeDistinct(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const seen = new Set<string>();
  const outputRows: HighlightedRow[] = [];

  input.rows.forEach(row => {
    if (row.status !== 'included') {
      outputRows.push({ ...row, status: 'excluded' });
      return;
    }

    // Create a unique key from all column values
    const key = input.columns
      .map(col => JSON.stringify(row.data[col]))
      .join('|');

    if (seen.has(key)) {
      outputRows.push({ ...row, status: 'excluded' });
    } else {
      seen.add(key);
      outputRows.push({ ...row, status: 'included' });
    }
  });

  return { columns: input.columns, rows: outputRows };
}

// ============================================================================
// SORT (ORDER BY) Execution
// ============================================================================

/**
 * Execute SORT (ORDER BY) - reorder rows.
 *
 * @param node - The SORT node with order specifications
 * @param input - Input intermediate result
 * @returns Sorted result
 */
function executeSort(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const orderBy = node.orderBy || [];

  if (orderBy.length === 0) {
    return input;
  }

  // Separate included and excluded rows
  const includedRows = input.rows.filter(r => r.status === 'included');
  const excludedRows = input.rows.filter(r => r.status !== 'included');

  // Sort included rows
  const sortedRows = [...includedRows].sort((a, b) => {
    for (const sort of orderBy) {
      const aVal = a.data[sort.column];
      const bVal = b.data[sort.column];

      let comparison = 0;

      // Handle nulls (nulls sort last)
      if (aVal === null && bVal === null) {
        comparison = 0;
      } else if (aVal === null) {
        comparison = 1;
      } else if (bVal === null) {
        comparison = -1;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      // Apply direction
      if (sort.direction === 'DESC') {
        comparison = -comparison;
      }

      if (comparison !== 0) {
        return comparison;
      }
    }
    return 0;
  });

  return {
    columns: input.columns,
    rows: [...sortedRows, ...excludedRows]
  };
}

// ============================================================================
// LIMIT/OFFSET Execution
// ============================================================================

/**
 * Execute LIMIT/OFFSET - restrict result rows.
 *
 * @param node - The LIMIT node with limit and offset values
 * @param input - Input intermediate result
 * @returns Limited result
 */
function executeLimit(
  node: PlanNode,
  input: IntermediateResult
): IntermediateResult {
  const limit = node.limit ?? Infinity;
  const offset = node.offset ?? 0;

  const includedRows = input.rows.filter(r => r.status === 'included');
  const outputRows: HighlightedRow[] = [];

  includedRows.forEach((row, idx) => {
    if (idx < offset) {
      // Rows before offset are excluded
      outputRows.push({ ...row, status: 'excluded' });
    } else if (idx < offset + limit) {
      // Rows within limit are included
      outputRows.push({ ...row, status: 'included' });
    } else {
      // Rows after limit are excluded
      outputRows.push({ ...row, status: 'excluded' });
    }
  });

  return { columns: input.columns, rows: outputRows };
}

// ============================================================================
// Set Operations (UNION, INTERSECT, EXCEPT)
// ============================================================================

/**
 * Execute UNION - combine two result sets.
 *
 * @param left - First input result
 * @param right - Second input result
 * @returns Combined result
 */
function executeUnion(
  left: IntermediateResult,
  right: IntermediateResult
): IntermediateResult {
  const leftIncluded = left.rows.filter(r => r.status === 'included');
  const rightIncluded = right.rows.filter(r => r.status === 'included');

  // Use left columns as output columns
  const columns = left.columns;

  // Combine all rows
  const allRows: HighlightedRow[] = [
    ...leftIncluded.map(r => ({ ...r, status: 'included' as RowStatus })),
    ...rightIncluded.map(r => ({ ...r, status: 'new' as RowStatus }))
  ];

  return { columns, rows: allRows };
}

/**
 * Execute INTERSECT - find common rows.
 *
 * @param left - First input result
 * @param right - Second input result
 * @returns Intersection result
 */
function executeIntersect(
  left: IntermediateResult,
  right: IntermediateResult
): IntermediateResult {
  const leftIncluded = left.rows.filter(r => r.status === 'included');
  const rightIncluded = right.rows.filter(r => r.status === 'included');
  const columns = left.columns;

  // Create set of right row keys
  const rightKeys = new Set(
    rightIncluded.map(r =>
      columns.map(c => JSON.stringify(r.data[c])).join('|')
    )
  );

  // Keep only left rows that exist in right
  const outputRows: HighlightedRow[] = leftIncluded.map(row => {
    const key = columns.map(c => JSON.stringify(row.data[c])).join('|');
    return {
      ...row,
      status: rightKeys.has(key) ? 'included' : 'excluded' as RowStatus
    };
  });

  return { columns, rows: outputRows };
}

/**
 * Execute EXCEPT - find rows in left not in right.
 *
 * @param left - First input result
 * @param right - Second input result
 * @returns Difference result
 */
function executeExcept(
  left: IntermediateResult,
  right: IntermediateResult
): IntermediateResult {
  const leftIncluded = left.rows.filter(r => r.status === 'included');
  const rightIncluded = right.rows.filter(r => r.status === 'included');
  const columns = left.columns;

  // Create set of right row keys
  const rightKeys = new Set(
    rightIncluded.map(r =>
      columns.map(c => JSON.stringify(r.data[c])).join('|')
    )
  );

  // Keep only left rows that do NOT exist in right
  const outputRows: HighlightedRow[] = leftIncluded.map(row => {
    const key = columns.map(c => JSON.stringify(row.data[c])).join('|');
    return {
      ...row,
      status: rightKeys.has(key) ? 'excluded' : 'included' as RowStatus
    };
  });

  return { columns, rows: outputRows };
}

// ============================================================================
// Aggregate Calculation
// ============================================================================

/**
 * Calculate aggregate value for a group of rows.
 *
 * @param func - The aggregate function name
 * @param column - The column to aggregate
 * @param rows - The rows in the group
 * @returns The calculated aggregate value
 */
function calculateAggregate(
  func: string,
  column: string,
  rows: HighlightedRow[]
): number | null {
  // For COUNT(*), count all rows
  if (func === 'COUNT' && column === '*') {
    return rows.length;
  }

  // Get non-null values for the column
  const values = rows
    .map(r => r.data[column])
    .filter((v): v is number | string => v !== null && v !== undefined);

  // Convert to numbers for numeric aggregates
  const numericValues = values.map(v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  });

  switch (func.toUpperCase()) {
    case 'COUNT':
      return values.length;

    case 'SUM':
      return numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0)
        : null;

    case 'AVG':
      return numericValues.length > 0
        ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        : null;

    case 'MIN':
      if (numericValues.length === 0) return null;
      return Math.min(...numericValues);

    case 'MAX':
      if (numericValues.length === 0) return null;
      return Math.max(...numericValues);

    default:
      return null;
  }
}

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Evaluate a WHERE condition against a row.
 *
 * Supports various condition types:
 * - Comparisons: =, <>, !=, <, >, <=, >=
 * - LIKE patterns with % and _ wildcards
 * - IN (list) membership
 * - IS NULL / IS NOT NULL
 * - BETWEEN ... AND ...
 * - Boolean operators: AND, OR, NOT
 *
 * @param condition - The condition string
 * @param row - The row data to evaluate
 * @returns True if the row passes the condition
 */
export function evaluateCondition(
  condition: string,
  row: Record<string, unknown>
): boolean {
  try {
    // Parse and evaluate the condition
    const normalizedCondition = normalizeCondition(condition);
    return evaluateExpression(normalizedCondition, row);
  } catch (error) {
    // On parse error, include the row (conservative approach)
    console.warn(`Failed to evaluate condition: ${condition}`, error);
    return true;
  }
}

/**
 * Normalize a SQL condition for evaluation.
 */
function normalizeCondition(condition: string): string {
  return condition
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluate a boolean expression against row data.
 */
function evaluateExpression(
  expr: string,
  row: Record<string, unknown>
): boolean {
  // Handle OR (lowest precedence)
  const orParts = splitByOperator(expr, ' OR ');
  if (orParts.length > 1) {
    return orParts.some(part => evaluateExpression(part.trim(), row));
  }

  // Handle AND
  const andParts = splitByOperator(expr, ' AND ');
  if (andParts.length > 1) {
    return andParts.every(part => evaluateExpression(part.trim(), row));
  }

  // Handle NOT
  const notMatch = expr.match(/^\s*NOT\s+(.+)$/i);
  if (notMatch && notMatch[1]) {
    return !evaluateExpression(notMatch[1].trim(), row);
  }

  // Handle parentheses
  if (expr.startsWith('(') && expr.endsWith(')')) {
    return evaluateExpression(expr.slice(1, -1), row);
  }

  // Handle IS NULL / IS NOT NULL
  const isNullMatch = expr.match(/^(.+?)\s+IS\s+(NOT\s+)?NULL$/i);
  if (isNullMatch) {
    const colName = isNullMatch[1]?.trim() || '';
    const value = getColumnValue(colName, row);
    const isNull = value === null || value === undefined;
    return isNullMatch[2] ? !isNull : isNull;
  }

  // Handle BETWEEN
  const betweenMatch = expr.match(/^(.+?)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
  if (betweenMatch) {
    const colName = betweenMatch[1]?.trim() || '';
    const lowStr = betweenMatch[2]?.trim() || '';
    const highStr = betweenMatch[3]?.trim() || '';

    const value = Number(getColumnValue(colName, row));
    const low = Number(parseLiteralValue(lowStr));
    const high = Number(parseLiteralValue(highStr));

    return !isNaN(value) && !isNaN(low) && !isNaN(high) &&
           value >= low && value <= high;
  }

  // Handle IN (list)
  const inMatch = expr.match(/^(.+?)\s+(NOT\s+)?IN\s*\((.+)\)$/i);
  if (inMatch) {
    const colName = inMatch[1]?.trim() || '';
    const notIn = !!inMatch[2];
    const listStr = inMatch[3] || '';

    const value = getColumnValue(colName, row);
    const listValues = listStr.split(',').map(v => parseLiteralValue(v.trim()));

    const found = listValues.some(lv => compareValues(value, lv) === 0);
    return notIn ? !found : found;
  }

  // Handle LIKE
  const likeMatch = expr.match(/^(.+?)\s+(NOT\s+)?LIKE\s+'([^']*)'$/i);
  if (likeMatch) {
    const colName = likeMatch[1]?.trim() || '';
    const notLike = !!likeMatch[2];
    const pattern = likeMatch[3] || '';

    const value = String(getColumnValue(colName, row) ?? '');
    const matches = matchLikePattern(value, pattern);

    return notLike ? !matches : matches;
  }

  // Handle comparison operators
  const comparisonMatch = expr.match(/^(.+?)\s*(=|<>|!=|<=|>=|<|>)\s*(.+)$/);
  if (comparisonMatch) {
    const leftExpr = comparisonMatch[1]?.trim() || '';
    const operator = comparisonMatch[2] || '';
    const rightExpr = comparisonMatch[3]?.trim() || '';

    const leftValue = getExpressionValue(leftExpr, row);
    const rightValue = getExpressionValue(rightExpr, row);

    return compareWithOperator(leftValue, operator, rightValue);
  }

  // If we can't parse, return true (conservative)
  return true;
}

/**
 * Split an expression by an operator, respecting parentheses.
 */
function splitByOperator(expr: string, operator: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  const upperExpr = expr.toUpperCase();
  const upperOp = operator.toUpperCase();

  let i = 0;
  while (i < expr.length) {
    if (expr[i] === '(') {
      depth++;
      current += expr[i];
    } else if (expr[i] === ')') {
      depth--;
      current += expr[i];
    } else if (depth === 0 && upperExpr.substring(i).startsWith(upperOp)) {
      parts.push(current);
      current = '';
      i += operator.length - 1;
    } else {
      current += expr[i];
    }
    i++;
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Get a column value from row data.
 */
function getColumnValue(
  colName: string,
  row: Record<string, unknown>
): unknown {
  // Handle table.column format
  const parts = colName.split('.');
  const actualCol = parts.length > 1 ? parts[1] : parts[0];

  if (actualCol && actualCol in row) {
    return row[actualCol];
  }

  // Try original name
  if (colName in row) {
    return row[colName];
  }

  // Case-insensitive fallback
  const lowerName = colName.toLowerCase();
  for (const key of Object.keys(row)) {
    if (key.toLowerCase() === lowerName) {
      return row[key];
    }
  }

  return undefined;
}

/**
 * Get value for an expression (column name or literal).
 */
function getExpressionValue(
  expr: string,
  row: Record<string, unknown>
): unknown {
  // String literal
  if ((expr.startsWith("'") && expr.endsWith("'")) ||
      (expr.startsWith('"') && expr.endsWith('"'))) {
    return expr.slice(1, -1);
  }

  // Numeric literal
  const num = Number(expr);
  if (!isNaN(num) && expr.trim() !== '') {
    return num;
  }

  // NULL literal
  if (expr.toUpperCase() === 'NULL') {
    return null;
  }

  // TRUE/FALSE literal
  if (expr.toUpperCase() === 'TRUE') return true;
  if (expr.toUpperCase() === 'FALSE') return false;

  // Column reference
  return getColumnValue(expr, row);
}

/**
 * Parse a literal value from a string.
 */
function parseLiteralValue(str: string): unknown {
  const trimmed = str.trim();

  // String literal
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }

  // Numeric literal
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }

  // NULL
  if (trimmed.toUpperCase() === 'NULL') {
    return null;
  }

  return trimmed;
}

/**
 * Compare two values using an operator.
 */
function compareWithOperator(
  left: unknown,
  operator: string,
  right: unknown
): boolean {
  // Handle NULL comparisons
  if (left === null || left === undefined ||
      right === null || right === undefined) {
    // In SQL, NULL comparisons return NULL (treated as false)
    return false;
  }

  const cmp = compareValues(left, right);

  switch (operator) {
    case '=':
      return cmp === 0;
    case '<>':
    case '!=':
      return cmp !== 0;
    case '<':
      return cmp < 0;
    case '>':
      return cmp > 0;
    case '<=':
      return cmp <= 0;
    case '>=':
      return cmp >= 0;
    default:
      return false;
  }
}

/**
 * Compare two values for ordering.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareValues(a: unknown, b: unknown): number {
  // Numeric comparison
  const aNum = Number(a);
  const bNum = Number(b);

  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum < bNum ? -1 : (aNum > bNum ? 1 : 0);
  }

  // String comparison
  const aStr = String(a);
  const bStr = String(b);

  return aStr.localeCompare(bStr);
}

/**
 * Match a LIKE pattern against a value.
 *
 * % matches any sequence of characters
 * _ matches any single character
 */
function matchLikePattern(value: string, pattern: string): boolean {
  // Convert SQL LIKE pattern to regex
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/%/g, '.*')                      // % -> .*
    .replace(/_/g, '.');                      // _ -> .

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(value);
}

// ============================================================================
// Join Condition Evaluation
// ============================================================================

/**
 * Evaluate a JOIN condition against left and right rows.
 *
 * @param condition - The join condition (e.g., "left.id = right.student_id")
 * @param left - Left row data
 * @param right - Right row data
 * @returns True if the join condition is satisfied
 */
export function evaluateJoinCondition(
  condition: string,
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  if (!condition) {
    // No condition = cross join (always true)
    return true;
  }

  try {
    // Merge left and right data for evaluation
    // In case of column name conflicts, right overwrites left
    const mergedRow = { ...left, ...right };

    return evaluateCondition(condition, mergedRow);
  } catch (error) {
    console.warn(`Failed to evaluate join condition: ${condition}`, error);
    return false;
  }
}

// ============================================================================
// Tree Traversal
// ============================================================================

/**
 * Get nodes in execution order (post-order traversal).
 *
 * Returns nodes in the order they should be executed:
 * leaf nodes (TABLE_SCAN) first, root node last.
 *
 * @param root - The root node of the plan tree
 * @returns Array of nodes in execution order
 */
export function getExecutionOrder(root: PlanNode): PlanNode[] {
  const order: PlanNode[] = [];

  function traverse(node: PlanNode) {
    // Process children first (post-order)
    node.children.forEach(traverse);
    // Then process this node
    order.push(node);
  }

  traverse(root);
  return order;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an empty intermediate result.
 */
function createEmptyResult(): IntermediateResult {
  return { columns: [], rows: [] };
}

/**
 * Sanitize a SQL identifier to prevent injection.
 */
function sanitizeIdentifier(name: string): string {
  // Only allow alphanumeric and underscore
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Parse a column expression that may include an alias.
 *
 * Examples:
 * - "name" -> { sourceCol: "name", aliasCol: "name" }
 * - "name AS student_name" -> { sourceCol: "name", aliasCol: "student_name" }
 * - "students.name" -> { sourceCol: "name", aliasCol: "name" }
 */
function parseColumnExpression(
  expr: string
): { sourceCol: string; aliasCol: string } {
  // Handle AS alias
  const asMatch = expr.match(/^(.+?)\s+AS\s+(.+)$/i);
  if (asMatch) {
    const source = asMatch[1]?.trim() || expr;
    const alias = asMatch[2]?.trim() || expr;
    // Handle table.column in source
    const sourceParts = source.split('.');
    return {
      sourceCol: sourceParts.length > 1 ? sourceParts[1] || source : source,
      aliasCol: alias
    };
  }

  // Handle table.column
  const parts = expr.split('.');
  const colName = parts.length > 1 ? parts[1] || expr : expr;

  return {
    sourceCol: colName,
    aliasCol: colName
  };
}

/**
 * Get sample rows from a table (for preview purposes).
 *
 * @param tableName - The table to sample
 * @param limit - Maximum number of rows to return
 * @returns Array of highlighted rows
 */
export function getSampleRows(
  tableName: string,
  limit: number = 10
): HighlightedRow[] {
  const result = executeQuery(
    `SELECT * FROM ${sanitizeIdentifier(tableName)} LIMIT ${limit}`
  );

  if (!result.success) {
    return [];
  }

  return result.rows.map(row => ({
    data: { ...row },
    status: 'included' as RowStatus
  }));
}

// ============================================================================
// Exports for Testing
// ============================================================================

export {
  executeNode,
  executeTableScan,
  executeSelection,
  executeProjection,
  executeJoin,
  executeGroupBy,
  executeDistinct,
  executeSort,
  executeLimit,
  calculateAggregate
};
