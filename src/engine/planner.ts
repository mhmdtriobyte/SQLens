/**
 * @fileoverview Query Plan Generator for SQLens
 *
 * This module converts parsed SQL AST into a visual query execution plan.
 * The plan represents the logical execution order of SQL operations as a tree
 * structure that can be visualized and stepped through.
 *
 * Features:
 * - Convert AST to query plan tree
 * - Support all major SQL operations (SELECT, JOIN, GROUP BY, etc.)
 * - Handle subqueries and set operations (UNION, INTERSECT, EXCEPT)
 * - Provide execution order for step-through visualization
 * - Layout calculation for tree rendering
 *
 * @module engine/planner
 */

import type {
  QueryPlan,
  PlanNode,
  OperationType,
  JoinType,
  AggregateDefinition,
  AggregateFunction,
  SortDefinition,
  SortDirection,
} from '@/types';
import { generateId } from '@/utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Parser AST types (simplified for our needs)
 */
interface ParserAST {
  type: string;
  columns?: ColumnRef[] | '*';
  from?: FromClause[];
  where?: Expression;
  groupby?: GroupByItem[];
  having?: Expression;
  orderby?: OrderByItem[];
  limit?: LimitClause;
  distinct?: string;
  _next?: ParserAST;
  set_op?: string;
  union?: ParserAST;
  set?: SetItem[];
  values?: unknown[][];
  table?: TableRef[];
  into?: string | { table: string };
  with?: CteClause[];
}

interface ColumnRef {
  expr: Expression;
  as?: string;
  type?: string;
}

interface FromClause {
  db?: string;
  table?: string;
  as?: string;
  join?: string;
  on?: Expression;
  using?: string[];
  expr?: { ast?: ParserAST };
}

interface Expression {
  type: string;
  operator?: string;
  left?: Expression;
  right?: Expression;
  value?: unknown;
  column?: string;
  table?: string;
  name?: string;
  args?: { value?: Expression[]; expr?: Expression; distinct?: string };
  ast?: ParserAST;
  when?: Array<{ cond: Expression; result: Expression }>;
  else?: Expression;
  target?: { dataType: string };
  expr?: Expression;
}

interface GroupByItem {
  column?: string;
  table?: string;
  type?: string;
  expr?: Expression;
}

interface OrderByItem {
  expr: Expression;
  type?: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

interface LimitClause {
  value?: number | Expression[];
  nb?: number;
  limit?: number;
  offset?: { value: number } | number;
  seperator?: string;
}

interface SetItem {
  column: string;
  value: Expression;
  table?: string;
}

interface TableRef {
  db?: string;
  table: string;
  as?: string;
}

interface CteClause {
  name: string;
  stmt: { ast?: ParserAST };
  columns?: string[];
}

/**
 * Layout configuration for tree visualization
 */
interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT: LayoutConfig = {
  nodeWidth: 140,
  nodeHeight: 70,
  horizontalSpacing: 30,
  verticalSpacing: 60,
};

/**
 * Operation symbols (mathematical/Greek)
 */
const OPERATION_SYMBOLS: Record<OperationType, string> = {
  TABLE_SCAN: '\u2299',    // Circled dot operator
  SELECTION: '\u03C3',     // Sigma (lowercase)
  PROJECTION: '\u03C0',    // Pi (lowercase)
  JOIN: '\u22C8',          // Bowtie
  CROSS_JOIN: '\u00D7',    // Multiplication sign
  GROUP_BY: '\u0393',      // Gamma (uppercase)
  DISTINCT: '\u03B4',      // Delta (lowercase)
  SORT: '\u03C4',          // Tau (lowercase)
  LIMIT: '\u03BB',         // Lambda (lowercase)
  UNION: '\u222A',         // Union
  INTERSECT: '\u2229',     // Intersection
  EXCEPT: '\u2216',        // Set minus
  SUBQUERY: '\u2286',      // Subset
  AGGREGATE: '\u03A3',     // Sigma (uppercase)
};

/**
 * Operation labels for display
 */
const OPERATION_LABELS: Record<OperationType, string> = {
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

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Create a query plan from a parsed AST
 *
 * @param ast - The AST from node-sql-parser
 * @param originalQuery - Optional original SQL query string
 * @returns A QueryPlan with the execution plan tree
 *
 * @example
 * ```typescript
 * const result = parseQuery('SELECT name FROM students WHERE age > 20');
 * if (result.success) {
 *   const plan = createQueryPlan(result.result.ast, 'SELECT name FROM students WHERE age > 20');
 *   console.log('Plan has', plan.nodeCount, 'nodes');
 * }
 * ```
 */
export function createQueryPlan(ast: unknown, originalQuery: string = ''): QueryPlan {
  const parserAST = ast as ParserAST;
  const root = buildPlanTree(parserAST);

  return {
    root,
    originalQuery,
    nodeCount: countNodes(root),
  };
}

// =============================================================================
// PLAN TREE BUILDING
// =============================================================================

/**
 * Build the query plan tree from AST
 */
function buildPlanTree(ast: ParserAST): PlanNode {
  if (!ast) {
    return createEmptyNode();
  }

  const type = (ast.type || '').toUpperCase();

  // Handle set operations first (UNION/INTERSECT/EXCEPT)
  if (ast._next || ast.union) {
    return buildSetOperationPlan(ast);
  }

  switch (type) {
    case 'SELECT':
      return buildSelectPlan(ast);
    case 'INSERT':
      return buildInsertPlan(ast);
    case 'UPDATE':
      return buildUpdatePlan(ast);
    case 'DELETE':
      return buildDeletePlan(ast);
    default:
      return createEmptyNode(`Unsupported: ${type}`);
  }
}

/**
 * Build plan for SELECT statement
 *
 * Execution order (bottom-up):
 * 1. Table scans (FROM clause)
 * 2. JOINs (if present)
 * 3. WHERE (SELECTION)
 * 4. GROUP BY with aggregates
 * 5. HAVING
 * 6. PROJECTION (SELECT columns)
 * 7. DISTINCT
 * 8. ORDER BY (SORT)
 * 9. LIMIT/OFFSET
 */
function buildSelectPlan(ast: ParserAST): PlanNode {
  // Step 1: Build FROM clause (table scans and joins)
  let currentNode: PlanNode;

  if (ast.from && ast.from.length > 0) {
    currentNode = buildFromClause(ast.from);
  } else {
    // Handle SELECT without FROM (e.g., SELECT 1 + 1)
    currentNode = createValuesNode();
  }

  // Step 2: WHERE clause (SELECTION)
  if (ast.where) {
    currentNode = createSelectionNode(ast.where, currentNode);
  }

  // Step 3: GROUP BY with aggregates
  if (ast.groupby && ast.groupby.length > 0) {
    currentNode = createGroupByNode(ast.groupby, ast.columns, currentNode);

    // Step 4: HAVING clause (filter after grouping)
    if (ast.having) {
      currentNode = createHavingNode(ast.having, currentNode);
    }
  } else if (hasAggregates(ast.columns)) {
    // Aggregates without GROUP BY - aggregate entire result set
    currentNode = createAggregateNode(ast.columns, currentNode);
  }

  // Step 5: PROJECTION (SELECT columns)
  // Only add if we have columns to project and haven't already handled via aggregation
  if (ast.columns && ast.columns !== '*') {
    currentNode = createProjectionNode(ast.columns, currentNode);
  } else if (ast.columns === '*') {
    // SELECT * - still create a projection node to show all columns
    currentNode = createProjectionNode('*', currentNode);
  }

  // Step 6: DISTINCT
  if (ast.distinct === 'DISTINCT') {
    currentNode = createDistinctNode(currentNode);
  }

  // Step 7: ORDER BY (SORT)
  if (ast.orderby && ast.orderby.length > 0) {
    currentNode = createSortNode(ast.orderby, currentNode);
  }

  // Step 8: LIMIT/OFFSET
  if (ast.limit) {
    currentNode = createLimitNode(ast.limit, currentNode);
  }

  return currentNode;
}

/**
 * Build plan for set operations (UNION, INTERSECT, EXCEPT)
 */
function buildSetOperationPlan(ast: ParserAST): PlanNode {
  // Build left side (current statement without the set operation)
  const leftNode = buildSelectPlanWithoutSetOp(ast);

  // Find the set operation type and right side
  let setOp: 'UNION' | 'INTERSECT' | 'EXCEPT' = 'UNION';
  let rightAst: ParserAST | null = null;

  if (ast._next) {
    const next = ast._next;
    const op = (next.set_op || 'UNION').toUpperCase();
    setOp = op === 'INTERSECT' ? 'INTERSECT' : op === 'EXCEPT' ? 'EXCEPT' : 'UNION';
    rightAst = next;
  } else if (ast.union) {
    rightAst = ast.union;
    setOp = 'UNION';
  }

  if (!rightAst) {
    return leftNode;
  }

  // Build right side
  const rightNode = buildPlanTree(rightAst);

  // Create set operation node
  const type: OperationType = setOp;

  return {
    id: generateId(),
    type,
    symbol: OPERATION_SYMBOLS[type],
    label: OPERATION_LABELS[type],
    children: [leftNode, rightNode],
  };
}

/**
 * Build SELECT plan without processing set operations
 */
function buildSelectPlanWithoutSetOp(ast: ParserAST): PlanNode {
  const cleanAst: ParserAST = { ...ast };
  delete cleanAst._next;
  delete cleanAst.union;
  return buildSelectPlan(cleanAst);
}

/**
 * Build INSERT plan
 */
function buildInsertPlan(ast: ParserAST): PlanNode {
  let tableName = 'unknown';

  if (ast.table && ast.table[0]) {
    tableName = ast.table[0].table;
  } else if (ast.into) {
    tableName = typeof ast.into === 'string' ? ast.into : ast.into.table;
  }

  // Source node (VALUES or SELECT subquery)
  let sourceNode: PlanNode;

  if (ast.values && ast.values.length > 0) {
    sourceNode = {
      id: generateId(),
      type: 'TABLE_SCAN',
      symbol: '\u2234', // Therefore symbol for values
      label: `Values (${ast.values.length} rows)`,
      children: [],
    };
  } else {
    // INSERT ... SELECT
    sourceNode = createEmptyNode('Source Query');
  }

  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: '\u2295', // Circled plus for insert
    label: `Insert: ${tableName}`,
    tableName,
    children: [sourceNode],
  };
}

/**
 * Build UPDATE plan
 */
function buildUpdatePlan(ast: ParserAST): PlanNode {
  let tableName = 'unknown';

  if (ast.table && ast.table[0]) {
    tableName = ast.table[0].table;
  }

  // Build table scan
  let currentNode = createTableScanNode(tableName);

  // Add WHERE filter
  if (ast.where) {
    currentNode = createSelectionNode(ast.where, currentNode);
  }

  // Build SET expression string
  const setExpr = ast.set
    ? ast.set.map(s => `${s.column} = ${expressionToString(s.value)}`).join(', ')
    : '';

  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: '\u21BA', // Anticlockwise arrow for update
    label: `Update: ${tableName}`,
    tableName,
    condition: setExpr,
    children: [currentNode],
  };
}

/**
 * Build DELETE plan
 */
function buildDeletePlan(ast: ParserAST): PlanNode {
  let tableName = 'unknown';

  if (ast.table && ast.table[0]) {
    tableName = ast.table[0].table;
  } else if (ast.from && ast.from[0] && ast.from[0].table) {
    tableName = ast.from[0].table;
  }

  // Build table scan
  let currentNode = createTableScanNode(tableName);

  // Add WHERE filter
  if (ast.where) {
    currentNode = createSelectionNode(ast.where, currentNode);
  }

  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: '\u2296', // Circled minus for delete
    label: `Delete: ${tableName}`,
    tableName,
    children: [currentNode],
  };
}

// =============================================================================
// FROM CLAUSE HANDLING
// =============================================================================

/**
 * Build nodes for FROM clause (tables and joins)
 */
function buildFromClause(from: FromClause[]): PlanNode {
  if (from.length === 0) {
    return createValuesNode();
  }

  const firstFrom = from[0];
  if (!firstFrom) {
    return createValuesNode();
  }

  // Build first table/subquery
  let leftNode: PlanNode;

  if (firstFrom.expr && firstFrom.expr.ast) {
    // Subquery in FROM
    leftNode = buildPlanTree(firstFrom.expr.ast);
    leftNode = wrapWithSubqueryNode(leftNode, firstFrom.as);
  } else if (firstFrom.table) {
    // Regular table
    leftNode = createTableScanNode(firstFrom.table, firstFrom.as);
  } else {
    leftNode = createValuesNode();
  }

  // Process additional tables (JOINs or implicit cross joins)
  for (let i = 1; i < from.length; i++) {
    const joinItem = from[i];
    if (!joinItem) continue;

    // Build right side
    let rightNode: PlanNode;

    if (joinItem.expr && joinItem.expr.ast) {
      rightNode = buildPlanTree(joinItem.expr.ast);
      rightNode = wrapWithSubqueryNode(rightNode, joinItem.as);
    } else if (joinItem.table) {
      rightNode = createTableScanNode(joinItem.table, joinItem.as);
    } else {
      continue;
    }

    // Determine join type and create join node
    const joinType = normalizeJoinType(joinItem.join);
    const joinCondition = joinItem.on
      ? expressionToString(joinItem.on)
      : joinItem.using
        ? `USING (${joinItem.using.join(', ')})`
        : undefined;

    leftNode = createJoinNode(leftNode, rightNode, joinType, joinCondition);
  }

  return leftNode;
}

/**
 * Normalize join type string to JoinType
 */
function normalizeJoinType(join?: string): JoinType {
  if (!join) return 'INNER';

  const normalized = join.toUpperCase().replace(/\s+/g, ' ').trim();

  if (normalized.includes('LEFT')) return 'LEFT';
  if (normalized.includes('RIGHT')) return 'RIGHT';
  if (normalized.includes('FULL')) return 'FULL';
  if (normalized.includes('CROSS')) return 'CROSS';

  return 'INNER';
}

// =============================================================================
// NODE CREATION FUNCTIONS
// =============================================================================

/**
 * Create an empty/placeholder node
 */
function createEmptyNode(label: string = 'Empty'): PlanNode {
  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: '\u2205', // Empty set
    label,
    children: [],
  };
}

/**
 * Create a VALUES node (for literal values)
 */
function createValuesNode(): PlanNode {
  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: '\u2234', // Therefore
    label: 'Values',
    children: [],
  };
}

/**
 * Create a TABLE_SCAN node
 */
function createTableScanNode(tableName: string, alias?: string): PlanNode {
  const displayName = alias ? `${tableName} (${alias})` : tableName;

  return {
    id: generateId(),
    type: 'TABLE_SCAN',
    symbol: OPERATION_SYMBOLS.TABLE_SCAN,
    label: `Scan: ${displayName}`,
    tableName,
    tableAlias: alias,
    children: [],
  };
}

/**
 * Wrap a subquery with a SUBQUERY node
 */
function wrapWithSubqueryNode(child: PlanNode, alias?: string): PlanNode {
  return {
    id: generateId(),
    type: 'SUBQUERY',
    symbol: OPERATION_SYMBOLS.SUBQUERY,
    label: alias ? `Subquery (${alias})` : 'Subquery',
    tableAlias: alias,
    children: [child],
  };
}

/**
 * Create a SELECTION (WHERE) node
 */
function createSelectionNode(whereExpr: Expression, child: PlanNode): PlanNode {
  return {
    id: generateId(),
    type: 'SELECTION',
    symbol: OPERATION_SYMBOLS.SELECTION,
    label: 'Selection',
    condition: expressionToString(whereExpr),
    children: [child],
  };
}

/**
 * Create a HAVING node (filter after GROUP BY)
 */
function createHavingNode(havingExpr: Expression, child: PlanNode): PlanNode {
  return {
    id: generateId(),
    type: 'SELECTION',
    symbol: OPERATION_SYMBOLS.SELECTION,
    label: 'Having',
    condition: expressionToString(havingExpr),
    children: [child],
  };
}

/**
 * Create a PROJECTION node
 */
function createProjectionNode(columns: ColumnRef[] | '*', child: PlanNode): PlanNode {
  let columnList: string[];

  if (columns === '*') {
    columnList = ['*'];
  } else {
    columnList = columns.map(col => {
      if (col.as) return col.as;
      if (col.expr) return expressionToString(col.expr);
      return '?';
    });
  }

  return {
    id: generateId(),
    type: 'PROJECTION',
    symbol: OPERATION_SYMBOLS.PROJECTION,
    label: 'Projection',
    columns: columnList,
    children: [child],
  };
}

/**
 * Create a JOIN node
 */
function createJoinNode(
  left: PlanNode,
  right: PlanNode,
  joinType: JoinType,
  condition?: string
): PlanNode {
  const type: OperationType = joinType === 'CROSS' ? 'CROSS_JOIN' : 'JOIN';
  const typeLabel = joinType === 'INNER' ? 'Inner' : joinType;

  return {
    id: generateId(),
    type,
    symbol: OPERATION_SYMBOLS[type],
    label: `${typeLabel} Join`,
    joinType,
    joinCondition: condition,
    children: [left, right],
  };
}

/**
 * Create a GROUP BY node
 */
function createGroupByNode(
  groupBy: GroupByItem[],
  columns: ColumnRef[] | '*' | undefined,
  child: PlanNode
): PlanNode {
  // Extract grouping columns
  const groupByColumns = groupBy.map(g => {
    if (g.column) return g.table ? `${g.table}.${g.column}` : g.column;
    if (g.expr) return expressionToString(g.expr);
    return '?';
  });

  // Extract aggregates from SELECT columns
  const aggregates = extractAggregates(columns);

  return {
    id: generateId(),
    type: 'GROUP_BY',
    symbol: OPERATION_SYMBOLS.GROUP_BY,
    label: 'Group By',
    groupByColumns,
    aggregates,
    children: [child],
  };
}

/**
 * Create an AGGREGATE node (without GROUP BY)
 */
function createAggregateNode(
  columns: ColumnRef[] | '*' | undefined,
  child: PlanNode
): PlanNode {
  const aggregates = extractAggregates(columns);

  return {
    id: generateId(),
    type: 'AGGREGATE',
    symbol: OPERATION_SYMBOLS.AGGREGATE,
    label: 'Aggregate',
    aggregates,
    children: [child],
  };
}

/**
 * Create a DISTINCT node
 */
function createDistinctNode(child: PlanNode): PlanNode {
  return {
    id: generateId(),
    type: 'DISTINCT',
    symbol: OPERATION_SYMBOLS.DISTINCT,
    label: 'Distinct',
    children: [child],
  };
}

/**
 * Create a SORT (ORDER BY) node
 */
function createSortNode(orderBy: OrderByItem[], child: PlanNode): PlanNode {
  const orderSpecs: SortDefinition[] = orderBy.map(item => ({
    column: expressionToString(item.expr),
    direction: (item.type || 'ASC').toUpperCase() as SortDirection,
  }));

  return {
    id: generateId(),
    type: 'SORT',
    symbol: OPERATION_SYMBOLS.SORT,
    label: 'Sort',
    orderBy: orderSpecs,
    children: [child],
  };
}

/**
 * Create a LIMIT node
 */
function createLimitNode(limitClause: LimitClause, child: PlanNode): PlanNode {
  let limitCount: number | undefined;
  let offsetCount: number | undefined;

  // Handle different limit clause formats from node-sql-parser
  if (typeof limitClause.value === 'number') {
    limitCount = limitClause.value;
  } else if (Array.isArray(limitClause.value)) {
    // Format: [offset, limit] or [limit]
    if (limitClause.value.length >= 1) {
      const first = limitClause.value[0] as { value?: number };
      if (limitClause.value.length >= 2) {
        // [offset, limit] format
        const second = limitClause.value[1] as { value?: number };
        if (limitClause.seperator === ',') {
          offsetCount = first.value;
          limitCount = second.value;
        } else {
          limitCount = first.value;
          offsetCount = second.value;
        }
      } else {
        limitCount = first.value;
      }
    }
  } else if (limitClause.nb !== undefined) {
    limitCount = limitClause.nb;
  } else if (limitClause.limit !== undefined) {
    limitCount = limitClause.limit;
  }

  // Handle offset
  if (limitClause.offset !== undefined) {
    if (typeof limitClause.offset === 'number') {
      offsetCount = limitClause.offset;
    } else if (typeof limitClause.offset === 'object' && limitClause.offset.value !== undefined) {
      offsetCount = limitClause.offset.value;
    }
  }

  const label = offsetCount !== undefined
    ? `Limit ${limitCount} Offset ${offsetCount}`
    : `Limit ${limitCount}`;

  return {
    id: generateId(),
    type: 'LIMIT',
    symbol: OPERATION_SYMBOLS.LIMIT,
    label,
    limit: limitCount,
    offset: offsetCount,
    children: [child],
  };
}

// =============================================================================
// EXPRESSION HANDLING
// =============================================================================

/**
 * Convert an expression AST to a human-readable string
 */
function expressionToString(expr: Expression | undefined): string {
  if (!expr) return '';

  // Handle primitive values
  if (typeof expr === 'string') return expr;
  if (typeof expr === 'number') return String(expr);
  if (typeof expr === 'boolean') return String(expr);

  const type = (expr.type || '').toLowerCase();

  switch (type) {
    case 'column_ref':
      return expr.table ? `${expr.table}.${expr.column}` : (expr.column || '?');

    case 'number':
    case 'bool':
      return String(expr.value);

    case 'string':
    case 'single_quote_string':
    case 'double_quote_string':
      return `'${expr.value}'`;

    case 'null':
      return 'NULL';

    case 'star':
      return expr.table ? `${expr.table}.*` : '*';

    case 'binary_expr': {
      const left = expressionToString(expr.left);
      const right = expressionToString(expr.right);
      const op = expr.operator || '=';
      return `${left} ${op} ${right}`;
    }

    case 'unary_expr': {
      const operand = expressionToString(expr.expr || expr.right);
      return `${expr.operator || ''} ${operand}`.trim();
    }

    case 'aggr_func': {
      const funcName = (expr.name || 'FUNC').toUpperCase();
      const distinct = expr.args?.distinct ? 'DISTINCT ' : '';
      let args = '*';

      if (expr.args?.expr) {
        args = expressionToString(expr.args.expr);
      } else if (expr.args?.value && expr.args.value.length > 0) {
        args = expr.args.value.map(a => expressionToString(a)).join(', ');
      }

      return `${funcName}(${distinct}${args})`;
    }

    case 'function': {
      const funcName = (expr.name || 'FUNC').toUpperCase();
      const args = expr.args?.value
        ? expr.args.value.map(a => expressionToString(a)).join(', ')
        : '';
      return `${funcName}(${args})`;
    }

    case 'case': {
      let result = 'CASE';
      if (expr.when) {
        for (const w of expr.when) {
          result += ` WHEN ${expressionToString(w.cond)} THEN ${expressionToString(w.result)}`;
        }
      }
      if (expr.else) {
        result += ` ELSE ${expressionToString(expr.else)}`;
      }
      result += ' END';
      return result;
    }

    case 'expr_list': {
      const values = expr.value
        ? (expr.value as Expression[]).map(v => expressionToString(v)).join(', ')
        : '';
      return `(${values})`;
    }

    case 'cast': {
      const value = expressionToString(expr.expr);
      const targetType = expr.target?.dataType || 'TYPE';
      return `CAST(${value} AS ${targetType})`;
    }

    case 'select':
      return '(subquery)';

    case 'exists':
      return 'EXISTS (subquery)';

    default:
      // Fallback: try to extract meaningful value
      if (expr.value !== undefined) return String(expr.value);
      if (expr.column) return expr.column;
      return '(expr)';
  }
}

/**
 * Extract aggregate definitions from SELECT columns
 */
function extractAggregates(columns: ColumnRef[] | '*' | undefined): AggregateDefinition[] {
  if (!columns || columns === '*') return [];

  const aggregates: AggregateDefinition[] = [];

  for (const col of columns) {
    const expr = col.expr;
    if (expr && expr.type === 'aggr_func' && expr.name) {
      const funcName = expr.name.toUpperCase() as AggregateFunction;
      let columnArg = '*';

      if (expr.args?.expr) {
        columnArg = expressionToString(expr.args.expr);
      } else if (expr.args?.value && expr.args.value.length > 0) {
        columnArg = expressionToString(expr.args.value[0]);
      }

      aggregates.push({
        func: funcName,
        column: columnArg,
        alias: col.as || `${funcName}(${columnArg})`,
      });
    }
  }

  return aggregates;
}

/**
 * Check if columns contain any aggregate functions
 */
function hasAggregates(columns: ColumnRef[] | '*' | undefined): boolean {
  if (!columns || columns === '*') return false;

  return columns.some(col => {
    const expr = col.expr;
    return expr && expr.type === 'aggr_func';
  });
}

// =============================================================================
// TREE UTILITIES
// =============================================================================

/**
 * Count total nodes in the plan tree
 */
export function countNodes(node: PlanNode): number {
  if (!node) return 0;

  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Get execution order (post-order traversal - children before parents)
 *
 * This gives the order in which operations would be executed:
 * - Leaf nodes (table scans) first
 * - Then their parents, working up to the root
 */
export function getExecutionOrder(plan: QueryPlan): PlanNode[] {
  const order: PlanNode[] = [];

  function traverse(node: PlanNode): void {
    if (!node) return;

    // Visit children first (left to right)
    for (const child of node.children) {
      traverse(child);
    }

    // Then visit this node
    order.push(node);
  }

  traverse(plan.root);
  return order;
}

/**
 * Get execution order as node IDs
 */
export function getExecutionOrderIds(plan: QueryPlan): string[] {
  return getExecutionOrder(plan).map(node => node.id);
}

/**
 * Get nodes in pre-order (parents before children)
 */
export function getPreOrder(plan: QueryPlan): PlanNode[] {
  const order: PlanNode[] = [];

  function traverse(node: PlanNode): void {
    if (!node) return;
    order.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(plan.root);
  return order;
}

/**
 * Get nodes at a specific level/depth
 */
export function getNodesAtLevel(plan: QueryPlan, level: number): PlanNode[] {
  const result: PlanNode[] = [];

  function collect(node: PlanNode, currentLevel: number): void {
    if (!node) return;

    if (currentLevel === level) {
      result.push(node);
      return;
    }

    for (const child of node.children) {
      collect(child, currentLevel + 1);
    }
  }

  collect(plan.root, 0);
  return result;
}

/**
 * Get the depth/height of the plan tree
 */
export function getTreeDepth(plan: QueryPlan): number {
  function getDepth(node: PlanNode): number {
    if (!node || node.children.length === 0) return 1;

    let maxChildDepth = 0;
    for (const child of node.children) {
      maxChildDepth = Math.max(maxChildDepth, getDepth(child));
    }

    return 1 + maxChildDepth;
  }

  return getDepth(plan.root);
}

/**
 * Find a node by its ID
 */
export function getNodeById(plan: QueryPlan, nodeId: string): PlanNode | null {
  function find(node: PlanNode): PlanNode | null {
    if (!node) return null;
    if (node.id === nodeId) return node;

    for (const child of node.children) {
      const found = find(child);
      if (found) return found;
    }

    return null;
  }

  return find(plan.root);
}

/**
 * Get all nodes in the plan as a flat array
 */
export function getAllNodes(plan: QueryPlan): PlanNode[] {
  const nodes: PlanNode[] = [];

  function collect(node: PlanNode): void {
    if (!node) return;
    nodes.push(node);
    for (const child of node.children) {
      collect(child);
    }
  }

  collect(plan.root);
  return nodes;
}

/**
 * Reset node ID counter (for testing)
 */
export function resetNodeIdCounter(): void {
  // No-op - we use generateId from utils which handles uniqueness
}

// =============================================================================
// LAYOUT CALCULATION
// =============================================================================

/**
 * Calculate positions for all nodes in the tree for visualization
 * Uses a top-down layout where root is at the top
 */
export function layoutPlanTree(node: PlanNode, config: LayoutConfig = DEFAULT_LAYOUT): void {
  if (!node) return;

  // Calculate subtree widths
  const widths = new Map<string, number>();
  calculateSubtreeWidths(node, widths, config);

  // Position nodes starting from root
  positionNodes(node, 0, 0, widths, config);
}

/**
 * Calculate the width needed for each subtree
 */
function calculateSubtreeWidths(
  node: PlanNode,
  widths: Map<string, number>,
  config: LayoutConfig
): number {
  if (!node) return 0;

  if (node.children.length === 0) {
    // Leaf node
    widths.set(node.id, config.nodeWidth);
    return config.nodeWidth;
  }

  // Calculate children widths
  let totalWidth = 0;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child) {
      totalWidth += calculateSubtreeWidths(child, widths, config);
      if (i < node.children.length - 1) {
        totalWidth += config.horizontalSpacing;
      }
    }
  }

  // Node's subtree width is max of its own width and children's total width
  const width = Math.max(config.nodeWidth, totalWidth);
  widths.set(node.id, width);
  return width;
}

/**
 * Position nodes in the tree
 */
function positionNodes(
  node: PlanNode,
  x: number,
  y: number,
  widths: Map<string, number>,
  config: LayoutConfig
): void {
  if (!node) return;

  const subtreeWidth = widths.get(node.id) || config.nodeWidth;

  // Center this node in its subtree
  node.x = x + (subtreeWidth - config.nodeWidth) / 2;
  node.y = y;

  if (node.children.length === 0) return;

  // Position children below this node
  const childY = y + config.nodeHeight + config.verticalSpacing;
  let childX = x;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (!child) continue;
    const childWidth = widths.get(child.id) || config.nodeWidth;

    positionNodes(child, childX, childY, widths, config);

    childX += childWidth + config.horizontalSpacing;
  }
}

/**
 * Calculate bounding box for the entire tree
 */
export function getTreeBounds(plan: QueryPlan): {
  width: number;
  height: number;
  minX: number;
  minY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  function traverse(node: PlanNode): void {
    if (!node) return;

    if (node.x !== undefined && node.y !== undefined) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + DEFAULT_LAYOUT.nodeWidth);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + DEFAULT_LAYOUT.nodeHeight);
    }

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(plan.root);

  if (minX === Infinity) {
    return { width: 0, height: 0, minX: 0, minY: 0 };
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
  };
}

// =============================================================================
// PLAN DESCRIPTION
// =============================================================================

/**
 * Generate a human-readable description of a plan node
 */
export function describeNode(node: PlanNode): string {
  switch (node.type) {
    case 'TABLE_SCAN':
      if (node.tableName) {
        return `Read all rows from table "${node.tableName}"${node.tableAlias ? ` (alias: ${node.tableAlias})` : ''}`;
      }
      return node.label;

    case 'SELECTION':
      return `Filter rows where: ${node.condition || 'condition'}`;

    case 'PROJECTION':
      return `Select columns: ${node.columns?.join(', ') || 'all'}`;

    case 'JOIN':
      return `${node.joinType || 'Inner'} Join${node.joinCondition ? ` on ${node.joinCondition}` : ''}`;

    case 'CROSS_JOIN':
      return 'Cartesian product (Cross Join) of all rows from both inputs';

    case 'GROUP_BY':
      return `Group rows by: ${node.groupByColumns?.join(', ') || 'columns'}${node.aggregates?.length ? ' and calculate aggregates' : ''}`;

    case 'AGGREGATE':
      return `Calculate aggregates: ${node.aggregates?.map(a => `${a.func}(${a.column})`).join(', ') || 'aggregates'}`;

    case 'DISTINCT':
      return 'Remove duplicate rows from result';

    case 'SORT':
      return `Sort rows by: ${node.orderBy?.map(s => `${s.column} ${s.direction}`).join(', ') || 'columns'}`;

    case 'LIMIT':
      return `Limit to ${node.limit || '?'} rows${node.offset ? ` starting at offset ${node.offset}` : ''}`;

    case 'UNION':
      return 'Combine results from both inputs (Union)';

    case 'INTERSECT':
      return 'Keep only rows that appear in both inputs (Intersect)';

    case 'EXCEPT':
      return 'Keep rows from first input that are not in second input (Except)';

    case 'SUBQUERY':
      return `Execute nested subquery${node.tableAlias ? ` as "${node.tableAlias}"` : ''}`;

    default:
      return node.label;
  }
}

/**
 * Generate a complete plan description as steps
 */
export function describePlan(plan: QueryPlan): string[] {
  const order = getExecutionOrder(plan);
  return order.map((node, i) => `${i + 1}. ${describeNode(node)}`);
}

/**
 * Get a short summary of the plan
 */
export function getPlanSummary(plan: QueryPlan): string {
  const nodes = getAllNodes(plan);
  const types = new Set(nodes.map(n => n.type));

  const parts: string[] = [];

  if (types.has('TABLE_SCAN')) {
    const tables = nodes
      .filter(n => n.type === 'TABLE_SCAN' && n.tableName)
      .map(n => n.tableName);
    if (tables.length > 0) {
      parts.push(`Tables: ${tables.join(', ')}`);
    }
  }

  if (types.has('JOIN') || types.has('CROSS_JOIN')) {
    parts.push('with joins');
  }

  if (types.has('GROUP_BY') || types.has('AGGREGATE')) {
    parts.push('with aggregation');
  }

  if (types.has('SORT')) {
    parts.push('sorted');
  }

  return parts.join(', ') || 'Query plan';
}
