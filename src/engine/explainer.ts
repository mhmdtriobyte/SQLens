/**
 * @fileoverview Plain English explanation generator for SQLens.
 *
 * This module generates clear, educational explanations for each step
 * in query execution. Explanations are designed to help students
 * understand what each relational algebra operation does and how
 * it transforms the data.
 *
 * @module engine/explainer
 */

import type {
  PlanNode,
  IntermediateResult,
  StepExplanation,
  JoinType,
  AggregateDefinition
} from '@/types';

// ============================================================================
// Main Explanation Generator
// ============================================================================

/**
 * Generate a plain English explanation for a step.
 *
 * Creates an educational explanation that describes what the operation
 * does, how many rows are affected, and provides helpful details about
 * the transformation.
 *
 * @param node - The plan node being executed
 * @param inputs - Input intermediate results from child nodes
 * @param output - Output intermediate result from this node
 * @returns A structured explanation with title, description, and details
 *
 * @example
 * ```typescript
 * const explanation = generateExplanation(selectionNode, [inputResult], outputResult);
 * console.log(explanation.title);       // "Filtering rows with WHERE clause"
 * console.log(explanation.description); // "The WHERE clause `age > 21`..."
 * ```
 */
export function generateExplanation(
  node: PlanNode,
  inputs: IntermediateResult[],
  output: IntermediateResult
): StepExplanation {
  // Calculate row counts
  const beforeCount = inputs.reduce(
    (sum, i) => sum + i.rows.filter(r => r.status === 'included').length,
    0
  );
  const afterCount = output.rows.filter(r => r.status === 'included').length;

  switch (node.type) {
    case 'TABLE_SCAN':
      return generateTableScanExplanation(node, afterCount);

    case 'SELECTION':
      return generateSelectionExplanation(node, beforeCount, afterCount);

    case 'PROJECTION':
      return generateProjectionExplanation(node, beforeCount, afterCount);

    case 'JOIN':
      return generateJoinExplanation(node, inputs, afterCount);

    case 'CROSS_JOIN':
      return generateCrossJoinExplanation(node, inputs, afterCount);

    case 'GROUP_BY':
      return generateGroupByExplanation(node, beforeCount, output);

    case 'AGGREGATE':
      return generateAggregateExplanation(node, beforeCount);

    case 'DISTINCT':
      return generateDistinctExplanation(beforeCount, afterCount);

    case 'SORT':
      return generateSortExplanation(node, afterCount);

    case 'LIMIT':
      return generateLimitExplanation(node, beforeCount, afterCount);

    case 'UNION':
      return generateUnionExplanation(inputs, afterCount);

    case 'INTERSECT':
      return generateIntersectExplanation(inputs, afterCount);

    case 'EXCEPT':
      return generateExceptExplanation(inputs, afterCount);

    case 'SUBQUERY':
      return generateSubqueryExplanation(afterCount);

    default:
      return generateDefaultExplanation(node, beforeCount, afterCount);
  }
}

// ============================================================================
// Operation-Specific Explanation Generators
// ============================================================================

/**
 * Generate explanation for TABLE_SCAN operation.
 */
function generateTableScanExplanation(
  node: PlanNode,
  rowCount: number
): StepExplanation {
  const tableName = node.tableName || 'unknown';
  const alias = node.tableAlias;

  const aliasText = alias ? ` (aliased as "${alias}")` : '';

  return {
    title: `Reading from ${tableName}`,
    description: `Loading all ${rowCount} rows from the "${tableName}" table${aliasText}.`,
    beforeCount: 0,
    afterCount: rowCount,
    operation: 'Table Scan',
    details: [
      `This is the starting point - we read the raw data from the table.`,
      `All ${rowCount} rows are available for the next operation.`,
      rowCount === 0
        ? `The table is currently empty.`
        : `Each row contains the full record with all columns from "${tableName}".`
    ]
  };
}

/**
 * Generate explanation for SELECTION (WHERE) operation.
 */
function generateSelectionExplanation(
  node: PlanNode,
  beforeCount: number,
  afterCount: number
): StepExplanation {
  const condition = node.condition || 'unknown condition';
  const excluded = beforeCount - afterCount;
  const percentKept = beforeCount > 0
    ? Math.round((afterCount / beforeCount) * 100)
    : 100;

  const details: string[] = [];

  if (excluded > 0) {
    details.push(`${excluded} row${excluded === 1 ? '' : 's'} did not match the condition and ${excluded === 1 ? 'is' : 'are'} filtered out.`);
    details.push(`${afterCount} row${afterCount === 1 ? '' : 's'} passed the filter and continue to the next step.`);
    details.push(`Filter selectivity: ${percentKept}% of rows kept.`);
  } else if (beforeCount > 0) {
    details.push(`All ${beforeCount} rows matched the condition.`);
    details.push(`No rows were filtered out - every row passes this condition.`);
  } else {
    details.push(`No input rows to filter.`);
  }

  // Add condition-specific hints
  const conditionHints = getConditionHints(condition);
  if (conditionHints.length > 0) {
    details.push(...conditionHints);
  }

  return {
    title: 'Filtering rows with WHERE clause',
    description: `The WHERE clause \`${condition}\` filters out ${excluded} rows. ${afterCount} of ${beforeCount} rows remain.`,
    beforeCount,
    afterCount,
    operation: `Selection (sigma): ${condition}`,
    details
  };
}

/**
 * Generate explanation for PROJECTION (SELECT columns) operation.
 */
function generateProjectionExplanation(
  node: PlanNode,
  beforeCount: number,
  afterCount: number
): StepExplanation {
  const columns = node.columns || [];
  const columnList = columns.length <= 5
    ? columns.join(', ')
    : `${columns.slice(0, 4).join(', ')}, ... (${columns.length} total)`;

  return {
    title: 'Selecting columns',
    description: `Keeping only the columns: ${columnList}. Row count stays at ${afterCount}.`,
    beforeCount,
    afterCount,
    operation: `Projection (pi): ${columnList}`,
    details: [
      `The SELECT clause specifies which columns to include in the output.`,
      `Other columns are discarded from the result.`,
      `This doesn't change the number of rows, just which columns are visible.`,
      columns.length === 1
        ? `Only 1 column is selected.`
        : `${columns.length} columns are selected in total.`
    ]
  };
}

/**
 * Generate explanation for JOIN operation.
 */
function generateJoinExplanation(
  node: PlanNode,
  inputs: IntermediateResult[],
  afterCount: number
): StepExplanation {
  const joinType = node.joinType || 'INNER';
  const condition = node.joinCondition || '';

  const leftCount = inputs[0]?.rows.filter(r => r.status === 'included').length || 0;
  const rightCount = inputs[1]?.rows.filter(r => r.status === 'included').length || 0;

  const details = generateJoinDetails(
    joinType as JoinType,
    leftCount,
    rightCount,
    afterCount
  );

  const joinTypeDisplay = formatJoinType(joinType as JoinType);

  return {
    title: `${joinTypeDisplay} JOIN`,
    description: `Joining ${leftCount} rows with ${rightCount} rows on \`${condition}\`. Result: ${afterCount} matched rows.`,
    beforeCount: leftCount + rightCount,
    afterCount,
    operation: `Join (bowtie): ${condition}`,
    details
  };
}

/**
 * Generate explanation for CROSS JOIN operation.
 */
function generateCrossJoinExplanation(
  node: PlanNode,
  inputs: IntermediateResult[],
  afterCount: number
): StepExplanation {
  const leftCount = inputs[0]?.rows.filter(r => r.status === 'included').length || 0;
  const rightCount = inputs[1]?.rows.filter(r => r.status === 'included').length || 0;
  const expectedCount = leftCount * rightCount;

  return {
    title: 'Cross Join (Cartesian Product)',
    description: `Creating all ${afterCount} combinations of ${leftCount} left rows with ${rightCount} right rows.`,
    beforeCount: leftCount + rightCount,
    afterCount,
    operation: 'Cross Join (times)',
    details: [
      `A CROSS JOIN produces the Cartesian product of two tables.`,
      `Every row from the left table is combined with every row from the right table.`,
      `${leftCount} x ${rightCount} = ${expectedCount} total combinations.`,
      afterCount === expectedCount
        ? `All ${expectedCount} combinations are included in the result.`
        : `Result has ${afterCount} rows (some may have been filtered).`,
      `Warning: CROSS JOINs can produce very large result sets!`
    ]
  };
}

/**
 * Generate explanation for GROUP BY operation.
 */
function generateGroupByExplanation(
  node: PlanNode,
  beforeCount: number,
  output: IntermediateResult
): StepExplanation {
  const groupCols = node.groupByColumns || [];
  const aggregates = node.aggregates || [];
  const groupCount = output.rows.filter(r => r.status === 'included').length;

  const groupColList = groupCols.join(', ') || 'no columns (single group)';
  const aggDescriptions = aggregates
    .map(a => `${a.func}(${a.column})${a.alias !== `${a.func}(${a.column})` ? ` AS ${a.alias}` : ''}`)
    .join(', ');

  const avgRowsPerGroup = groupCount > 0
    ? Math.round(beforeCount / groupCount * 10) / 10
    : 0;

  return {
    title: 'Grouping rows',
    description: `Grouping ${beforeCount} rows by ${groupColList} creates ${groupCount} groups. Aggregates: ${aggDescriptions || 'none'}.`,
    beforeCount,
    afterCount: groupCount,
    operation: `Group By (gamma): ${groupColList}`,
    details: [
      `Rows with the same values in [${groupColList}] are grouped together.`,
      `Each group becomes one row in the output.`,
      `${beforeCount} input rows collapsed into ${groupCount} groups.`,
      avgRowsPerGroup > 1
        ? `Average of ${avgRowsPerGroup} rows per group.`
        : `Most groups contain a single row.`,
      aggregates.length > 0
        ? `Aggregate functions calculated for each group: ${aggDescriptions}.`
        : `No aggregate functions are applied.`
    ]
  };
}

/**
 * Generate explanation for AGGREGATE operation (without GROUP BY).
 */
function generateAggregateExplanation(
  node: PlanNode,
  beforeCount: number
): StepExplanation {
  const aggregates = node.aggregates || [];
  const aggDescriptions = aggregates
    .map(a => `${a.func}(${a.column})`)
    .join(', ');

  return {
    title: 'Calculating aggregate values',
    description: `Computing ${aggDescriptions} across all ${beforeCount} rows into a single result row.`,
    beforeCount,
    afterCount: 1,
    operation: `Aggregate: ${aggDescriptions}`,
    details: [
      `Without GROUP BY, aggregate functions process all rows as one group.`,
      `All ${beforeCount} rows are condensed into a single result row.`,
      `The result contains only the calculated aggregate values.`,
      ...aggregates.map(a => formatAggregateDescription(a))
    ]
  };
}

/**
 * Generate explanation for DISTINCT operation.
 */
function generateDistinctExplanation(
  beforeCount: number,
  afterCount: number
): StepExplanation {
  const duplicatesRemoved = beforeCount - afterCount;
  const percentUnique = beforeCount > 0
    ? Math.round((afterCount / beforeCount) * 100)
    : 100;

  const details: string[] = [];

  if (duplicatesRemoved > 0) {
    details.push(`${duplicatesRemoved} duplicate row${duplicatesRemoved === 1 ? ' was' : 's were'} removed.`);
    details.push(`${percentUnique}% of rows were unique.`);
  } else {
    details.push(`All ${beforeCount} rows were already unique.`);
    details.push(`No duplicates found - DISTINCT had no effect.`);
  }

  details.push(`DISTINCT compares all column values to identify duplicates.`);

  return {
    title: 'Removing duplicates',
    description: `Removing duplicate rows. ${beforeCount} rows reduced to ${afterCount} unique rows.`,
    beforeCount,
    afterCount,
    operation: 'Distinct (delta)',
    details
  };
}

/**
 * Generate explanation for SORT (ORDER BY) operation.
 */
function generateSortExplanation(
  node: PlanNode,
  rowCount: number
): StepExplanation {
  const orderBy = node.orderBy || [];
  const sortDescription = orderBy
    .map(o => `${o.column} ${o.direction}`)
    .join(', ');

  const sortDetails = orderBy.map(o => {
    const directionWord = o.direction === 'DESC' ? 'descending' : 'ascending';
    return `Sort by "${o.column}" in ${directionWord} order (${o.direction === 'DESC' ? 'Z-A, 9-0' : 'A-Z, 0-9'}).`;
  });

  return {
    title: 'Sorting rows',
    description: `Sorting ${rowCount} rows by ${sortDescription}.`,
    beforeCount: rowCount,
    afterCount: rowCount,
    operation: `Sort (tau): ${sortDescription}`,
    details: [
      `ORDER BY rearranges the rows but doesn't add or remove any.`,
      ...sortDetails,
      orderBy.length > 1
        ? `Multiple sort keys: first key has priority, ties broken by subsequent keys.`
        : `Rows are ordered by the single sort key.`,
      `NULL values typically sort last.`
    ]
  };
}

/**
 * Generate explanation for LIMIT/OFFSET operation.
 */
function generateLimitExplanation(
  node: PlanNode,
  beforeCount: number,
  afterCount: number
): StepExplanation {
  const limit = node.limit ?? 0;
  const offset = node.offset ?? 0;
  const cutOff = beforeCount - afterCount;

  const details: string[] = [];

  if (offset > 0) {
    details.push(`OFFSET ${offset}: Skip the first ${offset} rows.`);
  }

  details.push(`LIMIT ${limit}: Return at most ${limit} rows.`);

  if (cutOff > 0) {
    details.push(`${cutOff} row${cutOff === 1 ? ' was' : 's were'} cut off.`);
  } else if (beforeCount <= limit) {
    details.push(`All ${beforeCount} rows fit within the limit.`);
  }

  details.push(`LIMIT is often used with ORDER BY to get "top N" results.`);

  let description: string;
  if (offset > 0) {
    description = `Taking ${afterCount} rows after skipping ${offset}. ${beforeCount} rows down to ${afterCount} rows.`;
  } else {
    description = `Taking the first ${afterCount} of ${beforeCount} rows.`;
  }

  return {
    title: 'Limiting results',
    description,
    beforeCount,
    afterCount,
    operation: `LIMIT ${limit}${offset > 0 ? ` OFFSET ${offset}` : ''}`,
    details
  };
}

/**
 * Generate explanation for UNION operation.
 */
function generateUnionExplanation(
  inputs: IntermediateResult[],
  afterCount: number
): StepExplanation {
  const leftCount = inputs[0]?.rows.filter(r => r.status === 'included').length || 0;
  const rightCount = inputs[1]?.rows.filter(r => r.status === 'included').length || 0;
  const totalInput = leftCount + rightCount;
  const duplicatesRemoved = totalInput - afterCount;

  return {
    title: 'Combining result sets with UNION',
    description: `Combining ${leftCount} + ${rightCount} = ${totalInput} rows${duplicatesRemoved > 0 ? `, removing ${duplicatesRemoved} duplicates` : ''}. Result: ${afterCount} rows.`,
    beforeCount: totalInput,
    afterCount,
    operation: 'Union (cup)',
    details: [
      `UNION combines the results of two queries.`,
      `First query contributes ${leftCount} rows.`,
      `Second query contributes ${rightCount} rows.`,
      duplicatesRemoved > 0
        ? `UNION removes ${duplicatesRemoved} duplicate rows (use UNION ALL to keep duplicates).`
        : `No duplicate rows found between the two result sets.`,
      `Both queries must have the same number of columns with compatible types.`
    ]
  };
}

/**
 * Generate explanation for INTERSECT operation.
 */
function generateIntersectExplanation(
  inputs: IntermediateResult[],
  afterCount: number
): StepExplanation {
  const leftCount = inputs[0]?.rows.filter(r => r.status === 'included').length || 0;
  const rightCount = inputs[1]?.rows.filter(r => r.status === 'included').length || 0;

  return {
    title: 'Finding common rows with INTERSECT',
    description: `Finding rows that appear in both result sets. ${afterCount} common rows found.`,
    beforeCount: leftCount + rightCount,
    afterCount,
    operation: 'Intersect (cap)',
    details: [
      `INTERSECT returns only rows that appear in BOTH queries.`,
      `First query has ${leftCount} rows.`,
      `Second query has ${rightCount} rows.`,
      `${afterCount} rows are common to both.`,
      afterCount === 0
        ? `No matching rows found between the two result sets.`
        : `These ${afterCount} rows have identical values in all columns.`
    ]
  };
}

/**
 * Generate explanation for EXCEPT operation.
 */
function generateExceptExplanation(
  inputs: IntermediateResult[],
  afterCount: number
): StepExplanation {
  const leftCount = inputs[0]?.rows.filter(r => r.status === 'included').length || 0;
  const rightCount = inputs[1]?.rows.filter(r => r.status === 'included').length || 0;
  const removed = leftCount - afterCount;

  return {
    title: 'Finding difference with EXCEPT',
    description: `Keeping rows from first query that don't appear in second. ${leftCount} - ${removed} matching = ${afterCount} rows.`,
    beforeCount: leftCount + rightCount,
    afterCount,
    operation: 'Except (minus)',
    details: [
      `EXCEPT returns rows from the first query that are NOT in the second query.`,
      `First query has ${leftCount} rows.`,
      `Second query has ${rightCount} rows.`,
      `${removed} rows from the first query were found in the second and removed.`,
      `${afterCount} rows remain that are unique to the first query.`
    ]
  };
}

/**
 * Generate explanation for SUBQUERY operation.
 */
function generateSubqueryExplanation(
  rowCount: number
): StepExplanation {
  return {
    title: 'Subquery result',
    description: `The nested query produced ${rowCount} rows.`,
    beforeCount: rowCount,
    afterCount: rowCount,
    operation: 'Subquery',
    details: [
      `This subquery is executed independently first.`,
      `Its ${rowCount} result rows are then used by the outer query.`,
      `Subqueries can appear in FROM, WHERE, or SELECT clauses.`
    ]
  };
}

/**
 * Generate default explanation for unknown operations.
 */
function generateDefaultExplanation(
  node: PlanNode,
  beforeCount: number,
  afterCount: number
): StepExplanation {
  return {
    title: node.label,
    description: `Executing ${node.label}.`,
    beforeCount,
    afterCount,
    operation: node.label,
    details: [
      `Processing ${beforeCount} input rows.`,
      `Producing ${afterCount} output rows.`
    ]
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate detailed explanation for JOIN operations.
 */
function generateJoinDetails(
  joinType: JoinType,
  leftCount: number,
  rightCount: number,
  resultCount: number
): string[] {
  const details: string[] = [];

  // Explain the join type
  switch (joinType) {
    case 'INNER':
      details.push(`INNER JOIN: Only rows with matching values in both tables are included.`);
      details.push(`Rows without a match in the other table are excluded.`);
      break;

    case 'LEFT':
      details.push(`LEFT JOIN: All rows from the left table are included.`);
      details.push(`Rows from the right table are included only if they match.`);
      details.push(`Unmatched left rows have NULL values for right table columns.`);
      break;

    case 'RIGHT':
      details.push(`RIGHT JOIN: All rows from the right table are included.`);
      details.push(`Rows from the left table are included only if they match.`);
      details.push(`Unmatched right rows have NULL values for left table columns.`);
      break;

    case 'FULL':
      details.push(`FULL OUTER JOIN: All rows from both tables are included.`);
      details.push(`Unmatched rows have NULL values for the other table's columns.`);
      break;

    case 'CROSS':
      details.push(`CROSS JOIN: Creates all possible combinations of rows.`);
      break;
  }

  // Add row count analysis
  const maxPossible = leftCount * rightCount;

  if (joinType === 'INNER') {
    const matchRate = maxPossible > 0
      ? Math.round((resultCount / maxPossible) * 100)
      : 0;
    details.push(`${resultCount} matches found out of ${maxPossible} possible combinations (${matchRate}% match rate).`);

    if (resultCount === 0) {
      details.push(`No matching rows found - check if the join condition is correct.`);
    } else if (resultCount > Math.max(leftCount, rightCount)) {
      details.push(`Result has more rows than inputs - some rows matched multiple times (many-to-many relationship).`);
    }
  } else if (joinType === 'LEFT') {
    details.push(`All ${leftCount} left rows appear in the result.`);
    const matched = resultCount - leftCount;
    if (matched > 0) {
      details.push(`${matched} additional rows from right table matches.`);
    }
  } else if (joinType === 'RIGHT') {
    details.push(`All ${rightCount} right rows appear in the result.`);
  }

  return details;
}

/**
 * Format join type for display.
 */
function formatJoinType(joinType: JoinType): string {
  const typeMap: Record<JoinType, string> = {
    'INNER': 'Inner',
    'LEFT': 'Left Outer',
    'RIGHT': 'Right Outer',
    'FULL': 'Full Outer',
    'CROSS': 'Cross'
  };
  return typeMap[joinType] || joinType;
}

/**
 * Format aggregate function description.
 */
function formatAggregateDescription(agg: AggregateDefinition): string {
  switch (agg.func) {
    case 'COUNT':
      return agg.column === '*'
        ? `COUNT(*): Counts all rows.`
        : `COUNT(${agg.column}): Counts non-NULL values in "${agg.column}".`;

    case 'SUM':
      return `SUM(${agg.column}): Adds up all values in "${agg.column}".`;

    case 'AVG':
      return `AVG(${agg.column}): Calculates the average of "${agg.column}".`;

    case 'MIN':
      return `MIN(${agg.column}): Finds the smallest value in "${agg.column}".`;

    case 'MAX':
      return `MAX(${agg.column}): Finds the largest value in "${agg.column}".`;
  }
}

/**
 * Get helpful hints based on the condition pattern.
 */
function getConditionHints(condition: string): string[] {
  const hints: string[] = [];
  const lowerCondition = condition.toLowerCase();

  // Check for common patterns and provide educational hints
  if (lowerCondition.includes(' like ')) {
    hints.push(`LIKE uses patterns: % matches any characters, _ matches single character.`);
  }

  if (lowerCondition.includes(' in (')) {
    hints.push(`IN checks if value matches any item in the list.`);
  }

  if (lowerCondition.includes(' between ')) {
    hints.push(`BETWEEN is inclusive: includes both boundary values.`);
  }

  if (lowerCondition.includes(' is null') || lowerCondition.includes(' is not null')) {
    hints.push(`NULL comparisons require IS NULL or IS NOT NULL (not = NULL).`);
  }

  if (lowerCondition.includes(' and ') && lowerCondition.includes(' or ')) {
    hints.push(`AND has higher precedence than OR. Use parentheses to be explicit.`);
  }

  return hints;
}

// ============================================================================
// Export Additional Utilities
// ============================================================================

/**
 * Generate a summary explanation for the entire query execution.
 *
 * @param steps - All execution steps
 * @returns A summary string describing the full execution
 */
export function generateExecutionSummary(
  steps: Array<{ node: PlanNode; output: IntermediateResult }>
): string {
  if (steps.length === 0) {
    return 'No execution steps.';
  }

  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];

  const initialRows = firstStep?.output.rows.filter(r => r.status === 'included').length || 0;
  const finalRows = lastStep?.output.rows.filter(r => r.status === 'included').length || 0;

  const tableScans = steps.filter(s => s.node.type === 'TABLE_SCAN').length;
  const joins = steps.filter(s => s.node.type === 'JOIN' || s.node.type === 'CROSS_JOIN').length;
  const filters = steps.filter(s => s.node.type === 'SELECTION').length;
  const groupings = steps.filter(s => s.node.type === 'GROUP_BY' || s.node.type === 'AGGREGATE').length;

  const parts: string[] = [];

  parts.push(`Query executed in ${steps.length} steps.`);

  if (tableScans > 0) {
    parts.push(`Read from ${tableScans} table${tableScans > 1 ? 's' : ''}.`);
  }

  if (joins > 0) {
    parts.push(`Performed ${joins} join${joins > 1 ? 's' : ''}.`);
  }

  if (filters > 0) {
    parts.push(`Applied ${filters} filter${filters > 1 ? 's' : ''}.`);
  }

  if (groupings > 0) {
    parts.push(`Used grouping/aggregation.`);
  }

  parts.push(`Started with ${initialRows} rows, ended with ${finalRows} rows.`);

  return parts.join(' ');
}

/**
 * Get the relational algebra symbol for an operation.
 *
 * @param operationType - The type of operation
 * @returns The mathematical symbol
 */
export function getOperationSymbol(operationType: string): string {
  const symbols: Record<string, string> = {
    'TABLE_SCAN': 'Scan',
    'SELECTION': 'sigma',
    'PROJECTION': 'pi',
    'JOIN': 'bowtie',
    'CROSS_JOIN': 'times',
    'GROUP_BY': 'gamma',
    'AGGREGATE': 'Sigma',
    'DISTINCT': 'delta',
    'SORT': 'tau',
    'LIMIT': 'lambda',
    'UNION': 'cup',
    'INTERSECT': 'cap',
    'EXCEPT': 'minus',
    'SUBQUERY': 'nested'
  };

  return symbols[operationType] || operationType;
}

/**
 * Get a short description of what an operation type does.
 *
 * @param operationType - The type of operation
 * @returns A brief description
 */
export function getOperationDescription(operationType: string): string {
  const descriptions: Record<string, string> = {
    'TABLE_SCAN': 'Reads all rows from a table',
    'SELECTION': 'Filters rows based on a condition (WHERE)',
    'PROJECTION': 'Selects specific columns (SELECT)',
    'JOIN': 'Combines rows from multiple tables',
    'CROSS_JOIN': 'Creates all possible row combinations',
    'GROUP_BY': 'Groups rows and calculates aggregates',
    'AGGREGATE': 'Calculates aggregate functions over all rows',
    'DISTINCT': 'Removes duplicate rows',
    'SORT': 'Orders rows by specified columns (ORDER BY)',
    'LIMIT': 'Restricts the number of rows returned (LIMIT)',
    'UNION': 'Combines results from multiple queries',
    'INTERSECT': 'Finds common rows between queries',
    'EXCEPT': 'Finds rows in first query not in second',
    'SUBQUERY': 'Executes a nested query'
  };

  return descriptions[operationType] || `Executes ${operationType} operation`;
}
