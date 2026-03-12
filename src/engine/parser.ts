/**
 * @fileoverview SQL Parser for SQLens
 *
 * This module provides SQL parsing functionality using node-sql-parser,
 * converting SQL queries into Abstract Syntax Trees (AST) and extracting
 * metadata about tables, columns, and query structure.
 *
 * Features:
 * - Parse SQL queries to AST with SQLite dialect support
 * - Extract table and column references
 * - Generate student-friendly error messages with suggestions
 * - Validate queries against database schema
 *
 * @module engine/parser
 */

import { Parser } from 'node-sql-parser';
import type { ParseError, Schema } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Query type classification
 */
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'create' | 'drop' | 'alter' | 'other';

/**
 * Parsed query result with extracted metadata
 */
export interface ParsedQuery {
  /** The raw AST from node-sql-parser */
  ast: any;
  /** The type of SQL statement */
  type: QueryType;
  /** List of tables referenced in the query */
  tables: string[];
  /** List of columns referenced in the query */
  columns: string[];
  /** Table aliases mapped to table names */
  aliases: Map<string, string>;
  /** Whether the query is read-only (SELECT) */
  isReadOnly: boolean;
}

/**
 * Parse result - either success with parsed query or failure with error
 */
export type ParseResultType =
  | { success: true; result: ParsedQuery }
  | { success: false; error: ParseError };

// Legacy interface for backward compatibility
export interface ParseResult {
  success: boolean;
  result?: { ast: any };
  error?: ParseError;
}

// =============================================================================
// PARSER INSTANCE
// =============================================================================

/** Singleton parser instance configured for SQLite */
let parserInstance: Parser | null = null;

/**
 * Get or create the parser instance
 */
function getParser(): Parser {
  if (!parserInstance) {
    parserInstance = new Parser();
  }
  return parserInstance;
}

// =============================================================================
// COMMON SQL ERROR PATTERNS
// =============================================================================

/**
 * Common SQL error patterns with friendly messages and suggestions
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  friendlyMessage: (match: RegExpMatchArray, sql: string) => string;
  suggestions: (match: RegExpMatchArray, sql: string) => string[];
}> = [
  // Syntax error near specific token
  {
    pattern: /syntax error at or near ["']?(\w+)["']?/i,
    friendlyMessage: (match) => `There's a syntax error near '${match[1] || 'unknown'}'. This usually means something is missing or misspelled before this word.`,
    suggestions: (match) => {
      const token = (match[1] || '').toUpperCase();
      const suggestions: string[] = [];

      // Check for common misspellings
      const corrections = getSpellingCorrections(token);
      if (corrections.length > 0) {
        suggestions.push(`Did you mean '${corrections[0]}'?`);
      }

      suggestions.push('Check that all SQL keywords are spelled correctly');
      suggestions.push('Make sure you have proper punctuation (commas between columns, semicolon at end)');

      return suggestions;
    }
  },

  // Missing FROM clause
  {
    pattern: /expecting.*FROM/i,
    friendlyMessage: () => 'Your SELECT statement needs a FROM clause to specify which table to query.',
    suggestions: () => [
      'Add a FROM clause after your column list: SELECT column FROM table',
      'If you want to test expressions, use: SELECT 1 + 1'
    ]
  },

  // Ambiguous column reference
  {
    pattern: /column ["']?(\w+)["']? is ambiguous/i,
    friendlyMessage: (match) => `The column '${match[1] || 'unknown'}' exists in multiple tables. You need to specify which table it belongs to.`,
    suggestions: (match) => [
      `Use table.${match[1] || 'unknown'} or alias.${match[1] || 'unknown'} to specify the source`,
      'Example: students.name instead of just name',
      'Add table aliases and prefix all columns: SELECT s.name FROM students s'
    ]
  },

  // No such table
  {
    pattern: /no such table:?\s*["']?(\w+)["']?/i,
    friendlyMessage: (match) => `The table '${match[1] || 'unknown'}' doesn't exist in the database.`,
    suggestions: (match) => [
      `Check the spelling of '${match[1] || 'unknown'}'`,
      'Use the schema browser to see available tables',
      'Table names are case-sensitive in some databases'
    ]
  },

  // No such column
  {
    pattern: /no such column:?\s*["']?(\w+)["']?/i,
    friendlyMessage: (match) => `The column '${match[1] || 'unknown'}' doesn't exist in the specified table.`,
    suggestions: (match) => [
      `Check the spelling of '${match[1] || 'unknown'}'`,
      'Click on a table in the schema browser to see its columns',
      'Column names are case-sensitive in some databases'
    ]
  },

  // Unexpected end of input
  {
    pattern: /unexpected end of input|incomplete input|unexpected end/i,
    friendlyMessage: () => 'Your SQL query appears to be incomplete.',
    suggestions: () => [
      'Make sure all clauses are complete (SELECT...FROM...)',
      'Check for unclosed parentheses',
      'Ensure string literals have closing quotes',
      'Add a semicolon at the end of your query'
    ]
  },

  // Mismatched parentheses
  {
    pattern: /unmatched.*parenthes[ie]s|expected.*\)/i,
    friendlyMessage: () => 'There are mismatched parentheses in your query.',
    suggestions: () => [
      'Count opening ( and closing ) parentheses - they should match',
      'Check subqueries and function calls',
      'Use proper indentation to spot mismatches'
    ]
  },

  // Invalid token/unexpected token
  {
    pattern: /unexpected token ["']?(\w+)["']?/i,
    friendlyMessage: (match) => `Unexpected '${match[1] || 'unknown'}' found in query. This word appears in an invalid position.`,
    suggestions: (match) => {
      const suggestions: string[] = [];
      const token = (match[1] || '').toUpperCase();

      // Check for common mistakes
      if (token === 'AND' || token === 'OR') {
        suggestions.push('AND/OR must be used between conditions in WHERE clause');
        suggestions.push('Make sure the condition before AND/OR is complete');
      } else if (token === 'WHERE') {
        suggestions.push('WHERE should come after FROM clause');
        suggestions.push('You can only have one WHERE clause per query');
      } else if (token === 'SELECT') {
        suggestions.push('Subqueries need parentheses: (SELECT ...)');
      }

      suggestions.push('Check the order of SQL clauses: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT');
      return suggestions;
    }
  },

  // Missing comma
  {
    pattern: /expecting.*,|missing.*comma/i,
    friendlyMessage: () => 'A comma appears to be missing between items.',
    suggestions: () => [
      'Separate column names with commas: SELECT col1, col2, col3',
      'Separate table names with commas in FROM clause',
      'Check that all items in lists are comma-separated'
    ]
  },

  // Invalid GROUP BY
  {
    pattern: /must appear in.*GROUP BY|not in.*aggregate|aggregate function/i,
    friendlyMessage: () => 'When using GROUP BY, all columns in SELECT must either be in GROUP BY or inside an aggregate function.',
    suggestions: () => [
      'Add the column to GROUP BY clause',
      'Or wrap it in an aggregate: MAX(column), MIN(column), etc.',
      'Example: SELECT department, COUNT(*) FROM employees GROUP BY department'
    ]
  },

  // Invalid HAVING without GROUP BY
  {
    pattern: /HAVING.*without.*GROUP BY/i,
    friendlyMessage: () => 'HAVING is used to filter groups but you haven\'t grouped anything.',
    suggestions: () => [
      'Add a GROUP BY clause before HAVING',
      'If you want to filter rows, use WHERE instead',
      'HAVING is for filtering after aggregation, WHERE is for filtering before'
    ]
  },

  // Invalid ORDER BY column
  {
    pattern: /ORDER BY.*not in.*select list/i,
    friendlyMessage: () => 'When using DISTINCT, ORDER BY columns must appear in SELECT list.',
    suggestions: () => [
      'Add the ORDER BY column to your SELECT list',
      'Or remove DISTINCT if not needed'
    ]
  },

  // Division by zero potential
  {
    pattern: /division by zero/i,
    friendlyMessage: () => 'Your query might divide by zero, which is undefined.',
    suggestions: () => [
      'Use NULLIF(divisor, 0) to prevent division by zero',
      'Example: value / NULLIF(divisor, 0)',
      'Use CASE WHEN to handle zero values'
    ]
  },

  // Invalid date/time
  {
    pattern: /invalid.*date|date.*format/i,
    friendlyMessage: () => 'There\'s an issue with a date value in your query.',
    suggestions: () => [
      'Use standard date format: YYYY-MM-DD (e.g., 2024-03-15)',
      'Use standard datetime format: YYYY-MM-DD HH:MM:SS',
      'Use date functions: DATE(), DATETIME(), STRFTIME()'
    ]
  },

  // Unsupported feature
  {
    pattern: /not supported|unsupported/i,
    friendlyMessage: () => 'This SQL feature is not supported in SQLite.',
    suggestions: () => [
      'SQLite has limited support for some SQL features',
      'Check SQLite documentation for alternatives',
      'Some features like RIGHT JOIN can be rewritten as LEFT JOIN'
    ]
  },

  // Unclosed string
  {
    pattern: /unterminated|unclosed/i,
    friendlyMessage: () => 'There\'s an unclosed string in your query.',
    suggestions: () => [
      'Make sure all strings are enclosed in single quotes (\' \')',
      'Check for missing closing quotes',
      'Example: WHERE name = \'John\''
    ]
  }
];

// =============================================================================
// MAIN PARSE FUNCTION
// =============================================================================

/**
 * Parse a SQL query into an Abstract Syntax Tree (AST)
 *
 * @param sql - The SQL query string to parse
 * @returns ParseResultType with either the parsed query or an error
 *
 * @example
 * ```typescript
 * const result = parseQuery('SELECT name, age FROM students WHERE age > 20');
 * if (result.success) {
 *   console.log('Tables:', result.result.tables);
 *   console.log('Columns:', result.result.columns);
 * } else {
 *   console.log('Error:', result.error.friendlyMessage);
 * }
 * ```
 */
export function parseQuery(sql: string): ParseResultType {
  // Handle empty or whitespace-only input
  if (!sql || !sql.trim()) {
    return {
      success: false,
      error: {
        message: 'Empty query',
        friendlyMessage: 'Please enter a SQL query to analyze.',
        suggestions: [
          'Try a simple query like: SELECT * FROM students',
          'Click on an example query to get started'
        ]
      }
    };
  }

  try {
    const parser = getParser();

    // Parse the SQL using node-sql-parser with SQLite dialect
    const ast = parser.astify(sql, { database: 'SQLite' });

    // Handle multiple statements - we only support single statements for visualization
    const singleAst = Array.isArray(ast) ? ast[0] : ast;

    if (!singleAst) {
      return {
        success: false,
        error: {
          message: 'Empty AST',
          friendlyMessage: 'Could not parse the SQL query.',
          suggestions: ['Check your SQL syntax']
        }
      };
    }

    // Extract query metadata
    const queryType = getQueryType(singleAst);
    const tables = extractTables(singleAst);
    const columns = extractColumns(singleAst);
    const aliases = extractAliases(singleAst);

    return {
      success: true,
      result: {
        ast: singleAst,
        type: queryType,
        tables,
        columns,
        aliases,
        isReadOnly: queryType === 'select'
      }
    };
  } catch (e: any) {
    return {
      success: false,
      error: createFriendlyError(e, sql)
    };
  }
}

/**
 * Async version for backward compatibility
 */
export async function parseQueryAsync(sql: string): Promise<ParseResult> {
  const result = parseQuery(sql);
  if (result.success) {
    return {
      success: true,
      result: { ast: result.result.ast }
    };
  }
  return {
    success: false,
    error: result.error
  };
}

/**
 * Synchronous version alias
 */
export const parseQuerySync = parseQuery;

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Convert a parser error to a student-friendly message
 */
function createFriendlyError(error: any, sql: string): ParseError {
  const message = error.message || 'Unknown parsing error';

  // Try to extract line and column information
  const locationMatch = message.match(/line (\d+)/i);
  const columnMatch = message.match(/column (\d+)/i);
  const positionMatch = message.match(/at position (\d+)/i);

  let line = locationMatch ? parseInt(locationMatch[1], 10) : undefined;
  let column = columnMatch ? parseInt(columnMatch[1], 10) : undefined;

  // Calculate line/column from position if available
  if (!line && positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    const lines = sql.substring(0, position).split('\n');
    line = lines.length;
    column = (lines[lines.length - 1]?.length || 0) + 1;
  }

  // Extract problematic token
  const tokenMatch = message.match(/near "([^"]+)"/i) ||
                     message.match(/unexpected "([^"]+)"/i) ||
                     message.match(/expecting .+ got "([^"]+)"/i);
  const token = tokenMatch ? tokenMatch[1] : undefined;

  return {
    message,
    friendlyMessage: generateFriendlyMessage(message, sql),
    suggestions: generateSuggestions(message, sql),
    line,
    column,
    token
  };
}

/**
 * Generate a student-friendly error message
 */
function generateFriendlyMessage(errorMsg: string, sql: string): string {
  // Try to match known error patterns
  for (const { pattern, friendlyMessage } of ERROR_PATTERNS) {
    const match = errorMsg.match(pattern);
    if (match) {
      return friendlyMessage(match, sql);
    }
  }

  // Check for common missing clause errors
  const lowerSql = sql.toLowerCase();
  if (lowerSql.includes('select') && !lowerSql.includes('from')) {
    return 'Your SELECT statement is missing a FROM clause.';
  }

  // Generic fallback messages based on keywords
  if (errorMsg.toLowerCase().includes('syntax')) {
    return 'There\'s a syntax error in your SQL query. Check for typos, missing keywords, or incorrect punctuation.';
  }

  if (errorMsg.toLowerCase().includes('token')) {
    return 'The parser found something unexpected in your query. Check for typos or misplaced keywords.';
  }

  if (errorMsg.toLowerCase().includes('parse')) {
    return 'The SQL parser couldn\'t understand your query. Make sure you\'re using valid SQL syntax.';
  }

  // Default message
  return `SQL Error: ${errorMsg}. Check your query syntax and try again.`;
}

/**
 * Generate suggestions for fixing common mistakes
 */
function generateSuggestions(errorMsg: string, sql: string): string[] {
  const suggestions: string[] = [];

  // Try to match known error patterns
  for (const { pattern, suggestions: getSuggestions } of ERROR_PATTERNS) {
    const match = errorMsg.match(pattern);
    if (match) {
      return getSuggestions(match, sql);
    }
  }

  // Generic suggestions based on query analysis
  const upperSql = sql.toUpperCase();

  if (!upperSql.includes('SELECT') && !upperSql.includes('INSERT') &&
      !upperSql.includes('UPDATE') && !upperSql.includes('DELETE')) {
    suggestions.push('Start your query with SELECT, INSERT, UPDATE, or DELETE');
  }

  if (upperSql.includes('SELECT') && !upperSql.includes('FROM')) {
    suggestions.push('Add a FROM clause to specify which table to query');
    suggestions.push('Example: SELECT column_name FROM table_name');
  }

  // Check for common typos
  const typoSuggestions = findCommonTypos(sql);
  suggestions.push(...typoSuggestions);

  // Default suggestions
  if (suggestions.length === 0) {
    suggestions.push('Check for typos in table and column names');
    suggestions.push('Verify that all SQL keywords are spelled correctly');
    suggestions.push('Make sure parentheses and quotes are balanced');
    suggestions.push('Use single quotes for string values');
  }

  return suggestions;
}

/**
 * Find common typos in SQL and suggest corrections
 */
function findCommonTypos(sql: string): string[] {
  const suggestions: string[] = [];
  const words = sql.toUpperCase().split(/\s+/);

  const typoMap: Record<string, string> = {
    'SLECT': 'SELECT',
    'SELEC': 'SELECT',
    'SELET': 'SELECT',
    'SELCT': 'SELECT',
    'FORM': 'FROM',
    'FRON': 'FROM',
    'WHER': 'WHERE',
    'WHRE': 'WHERE',
    'WEHRE': 'WHERE',
    'WERE': 'WHERE',
    'GROUPBY': 'GROUP BY',
    'ORDERBY': 'ORDER BY',
    'INNERJOIN': 'INNER JOIN',
    'LEFTJOIN': 'LEFT JOIN',
    'RIGHTJOIN': 'RIGHT JOIN',
    'GRUOP': 'GROUP',
    'ORDR': 'ORDER',
    'LIMT': 'LIMIT',
    'LIMTI': 'LIMIT',
    'DISTICT': 'DISTINCT',
    'DINSTINCT': 'DISTINCT',
    'COUND': 'COUNT',
    'CONUT': 'COUNT',
    'AVRAGE': 'AVG',
    'BETWEE': 'BETWEEN',
    'BETWEN': 'BETWEEN',
    'HAVIGN': 'HAVING',
    'HAIVNG': 'HAVING'
  };

  for (const word of words) {
    if (typoMap[word]) {
      suggestions.push(`Did you mean '${typoMap[word]}' instead of '${word}'?`);
    }
  }

  return suggestions;
}

/**
 * Get spelling corrections for a token
 */
function getSpellingCorrections(token: string): string[] {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'ON',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'DISTINCT', 'AS', 'NULL', 'IS', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
    'UNION', 'INTERSECT', 'EXCEPT', 'ALL', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
  ];

  return keywords.filter(keyword => {
    // Simple Levenshtein distance approximation
    if (Math.abs(keyword.length - token.length) > 2) return false;

    let differences = 0;
    const minLen = Math.min(keyword.length, token.length);

    for (let i = 0; i < minLen; i++) {
      if (keyword[i] !== token[i]) differences++;
    }

    differences += Math.abs(keyword.length - token.length);

    return differences <= 2 && differences > 0;
  });
}

// =============================================================================
// QUERY TYPE DETECTION
// =============================================================================

/**
 * Determine the type of SQL query from its AST
 */
export function getQueryType(ast: any): QueryType {
  if (!ast || !ast.type) {
    return 'other';
  }

  const type = String(ast.type).toLowerCase();

  switch (type) {
    case 'select':
      return 'select';
    case 'insert':
      return 'insert';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    case 'create':
      return 'create';
    case 'drop':
      return 'drop';
    case 'alter':
      return 'alter';
    default:
      return 'other';
  }
}

// =============================================================================
// TABLE EXTRACTION
// =============================================================================

/**
 * Extract all table names from an AST
 */
export function extractTables(ast: any): string[] {
  const tables: Set<string> = new Set();

  if (!ast) return [];

  extractTablesRecursive(ast, tables);

  return Array.from(tables);
}

/**
 * Recursively extract table names from AST nodes
 */
function extractTablesRecursive(node: any, tables: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  // Handle arrays
  if (Array.isArray(node)) {
    for (const item of node) {
      extractTablesRecursive(item, tables);
    }
    return;
  }

  // Handle FROM clause
  if (node.from) {
    extractFromClauseTables(node.from, tables);
  }

  // Handle table references
  if (node.table && typeof node.table === 'string') {
    tables.add(node.table);
  }

  // Handle INTO for INSERT
  if (node.into) {
    if (typeof node.into === 'string') {
      tables.add(node.into);
    } else if (node.into.table) {
      tables.add(node.into.table);
    }
  }

  // Handle UPDATE table
  if (node.type === 'update' && node.table) {
    if (Array.isArray(node.table)) {
      for (const t of node.table) {
        if (t && t.table) tables.add(t.table);
      }
    } else if (typeof node.table === 'object' && node.table.table) {
      tables.add(node.table.table);
    }
  }

  // Handle DELETE table
  if (node.type === 'delete' && node.from) {
    extractFromClauseTables(node.from, tables);
  }

  // Handle subqueries in expressions
  if (node.ast) {
    extractTablesRecursive(node.ast, tables);
  }

  // Handle WITH clause CTEs
  if (node.with) {
    for (const cte of node.with) {
      if (cte.stmt) {
        extractTablesRecursive(cte.stmt, tables);
      }
    }
  }

  // Handle UNION/INTERSECT/EXCEPT
  if (node._next) {
    extractTablesRecursive(node._next, tables);
  }

  // Handle set operations
  if (node.union) {
    extractTablesRecursive(node.union, tables);
  }

  // Recurse into select-related structures
  if (node.where) extractTablesRecursive(node.where, tables);
  if (node.having) extractTablesRecursive(node.having, tables);
  if (node.columns) extractTablesRecursive(node.columns, tables);
  if (node.values) extractTablesRecursive(node.values, tables);
  if (node.set) extractTablesRecursive(node.set, tables);

  // Recurse into expressions
  if (node.left) extractTablesRecursive(node.left, tables);
  if (node.right) extractTablesRecursive(node.right, tables);
  if (node.expr) extractTablesRecursive(node.expr, tables);
  if (node.args) extractTablesRecursive(node.args, tables);
}

/**
 * Extract tables from a FROM clause
 */
function extractFromClauseTables(from: any, tables: Set<string>): void {
  if (!from) return;

  const fromArray = Array.isArray(from) ? from : [from];

  for (const item of fromArray) {
    if (!item) continue;

    // Direct table reference
    if (item.table && typeof item.table === 'string') {
      tables.add(item.table);
    }

    // Subquery in FROM (derived table)
    if (item.expr) {
      if (item.expr.ast) {
        extractTablesRecursive(item.expr.ast, tables);
      } else {
        extractTablesRecursive(item.expr, tables);
      }
    }

    // Handle JOINs - the join property contains the right side of the join
    if (item.join) {
      const joinArray = Array.isArray(item.join) ? item.join : [item.join];
      for (const joinItem of joinArray) {
        if (joinItem && joinItem.table) {
          tables.add(joinItem.table);
        }
        if (joinItem && joinItem.expr) {
          extractTablesRecursive(joinItem.expr, tables);
        }
      }
    }
  }
}

// =============================================================================
// COLUMN EXTRACTION
// =============================================================================

/**
 * Extract all column references from an AST
 */
export function extractColumns(ast: any): string[] {
  const columns: Set<string> = new Set();

  if (!ast) return [];

  extractColumnsRecursive(ast, columns);

  // Filter out standalone * and return unique columns
  return Array.from(columns).filter(c => c !== '*');
}

/**
 * Recursively extract column references from AST nodes
 */
function extractColumnsRecursive(node: any, columns: Set<string>): void {
  if (!node || typeof node !== 'object') return;

  // Handle arrays
  if (Array.isArray(node)) {
    for (const item of node) {
      extractColumnsRecursive(item, columns);
    }
    return;
  }

  // Handle column_ref type
  if (node.type === 'column_ref') {
    const colName = node.column;
    if (colName && colName !== '*') {
      if (node.table) {
        columns.add(`${node.table}.${colName}`);
      }
      columns.add(colName);
    }
    return;
  }

  // Handle SELECT columns
  if (node.columns) {
    if (node.columns !== '*') {
      const colArray = Array.isArray(node.columns) ? node.columns : [node.columns];
      for (const col of colArray) {
        if (col && col.expr) {
          extractColumnsRecursive(col.expr, columns);
        }
      }
    }
  }

  // Handle WHERE clause
  if (node.where) {
    extractColumnsRecursive(node.where, columns);
  }

  // Handle GROUP BY
  if (node.groupby && Array.isArray(node.groupby)) {
    for (const group of node.groupby) {
      extractColumnsRecursive(group, columns);
    }
  }

  // Handle ORDER BY
  if (node.orderby && Array.isArray(node.orderby)) {
    for (const order of node.orderby) {
      extractColumnsRecursive(order.expr || order, columns);
    }
  }

  // Handle HAVING
  if (node.having) {
    extractColumnsRecursive(node.having, columns);
  }

  // Handle JOIN conditions
  if (node.on) {
    extractColumnsRecursive(node.on, columns);
  }

  // Handle SET clause for UPDATE
  if (node.set && Array.isArray(node.set)) {
    for (const setItem of node.set) {
      if (setItem.column) {
        columns.add(setItem.column);
      }
      if (setItem.value) {
        extractColumnsRecursive(setItem.value, columns);
      }
    }
  }

  // Handle INSERT columns
  if (node.type === 'insert' && node.columns && Array.isArray(node.columns)) {
    for (const col of node.columns) {
      if (typeof col === 'string') {
        columns.add(col);
      }
    }
  }

  // Handle expressions
  if (node.left) extractColumnsRecursive(node.left, columns);
  if (node.right) extractColumnsRecursive(node.right, columns);
  if (node.args) {
    if (node.args.value) {
      extractColumnsRecursive(node.args.value, columns);
    } else {
      extractColumnsRecursive(node.args, columns);
    }
  }
  if (node.expr && node.type !== 'column_ref') {
    extractColumnsRecursive(node.expr, columns);
  }

  // Handle CASE expressions
  if (node.args && node.args.when) {
    for (const whenItem of node.args.when) {
      extractColumnsRecursive(whenItem.cond, columns);
      extractColumnsRecursive(whenItem.result, columns);
    }
    if (node.args.else) {
      extractColumnsRecursive(node.args.else, columns);
    }
  }

  // Handle aggregate function arguments
  if (node.type === 'aggr_func' && node.args) {
    extractColumnsRecursive(node.args, columns);
  }

  // Handle function calls
  if (node.type === 'function' && node.args) {
    extractColumnsRecursive(node.args, columns);
  }
}

// =============================================================================
// ALIAS EXTRACTION
// =============================================================================

/**
 * Extract table aliases from an AST
 */
export function extractAliases(ast: any): Map<string, string> {
  const aliases = new Map<string, string>();

  if (!ast) return aliases;

  extractAliasesRecursive(ast, aliases);

  return aliases;
}

/**
 * Recursively extract table aliases from AST nodes
 */
function extractAliasesRecursive(node: any, aliases: Map<string, string>): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      extractAliasesRecursive(item, aliases);
    }
    return;
  }

  // Handle FROM clause with aliases
  if (node.from) {
    const fromArray = Array.isArray(node.from) ? node.from : [node.from];

    for (const item of fromArray) {
      if (item && item.table && item.as) {
        aliases.set(item.as, item.table);
      }

      // Handle join aliases
      if (item && item.join) {
        const joinArray = Array.isArray(item.join) ? item.join : [item.join];
        for (const joinItem of joinArray) {
          if (joinItem && joinItem.table && joinItem.as) {
            aliases.set(joinItem.as, joinItem.table);
          }
        }
      }
    }
  }

  // Recurse into nested structures
  if (node._next) extractAliasesRecursive(node._next, aliases);
  if (node.union) extractAliasesRecursive(node.union, aliases);
}

// =============================================================================
// SCHEMA VALIDATION
// =============================================================================

/**
 * Validate a SQL query against a database schema
 *
 * @param sql - The SQL query to validate
 * @param schema - The database schema to validate against
 * @returns ParseError if validation fails, null if valid
 *
 * @example
 * ```typescript
 * const error = validateQuery('SELECT foo FROM bar', mySchema);
 * if (error) {
 *   console.log('Validation failed:', error.friendlyMessage);
 * }
 * ```
 */
export function validateQuery(sql: string, schema: Schema): ParseError | null {
  // First, parse the query
  const parseResult = parseQuery(sql);

  if (!parseResult.success) {
    return parseResult.error;
  }

  const { tables, columns, aliases } = parseResult.result;

  // Build a lookup of valid table names (case-insensitive)
  const validTables = new Map<string, string>();
  for (const table of schema.tables) {
    validTables.set(table.name.toLowerCase(), table.name);
  }

  // Build a lookup of valid column names per table
  const tableColumns = new Map<string, Set<string>>();
  const allColumns = new Set<string>();

  for (const table of schema.tables) {
    const colSet = new Set<string>();
    for (const col of table.columns) {
      colSet.add(col.name.toLowerCase());
      allColumns.add(col.name.toLowerCase());
    }
    tableColumns.set(table.name.toLowerCase(), colSet);
  }

  // Resolve aliases to table names
  const resolveTable = (name: string): string => {
    const aliasedTable = aliases.get(name);
    if (aliasedTable) return aliasedTable;
    return name;
  };

  // Validate tables exist
  for (const tableName of tables) {
    const resolved = resolveTable(tableName);
    if (!validTables.has(resolved.toLowerCase())) {
      const similarTables = findSimilarNames(resolved, Array.from(validTables.values()));

      return {
        message: `Table '${resolved}' does not exist`,
        friendlyMessage: `The table '${resolved}' doesn't exist in this database.`,
        suggestions: [
          similarTables.length > 0
            ? `Did you mean '${similarTables[0]}'?`
            : 'Check the schema browser for available tables',
          `Available tables: ${schema.tables.map(t => t.name).join(', ')}`
        ]
      };
    }
  }

  // Validate columns exist (for table.column references)
  for (const colRef of columns) {
    if (colRef.includes('.')) {
      const parts = colRef.split('.');
      const tablePart = parts[0] || '';
      const columnPart = parts[1] || '';
      const resolvedTable = resolveTable(tablePart);
      const tableColSet = tableColumns.get(resolvedTable.toLowerCase());

      if (tableColSet && columnPart && !tableColSet.has(columnPart.toLowerCase())) {
        const table = schema.tables.find(t => t.name.toLowerCase() === resolvedTable.toLowerCase());
        const tableColNames = table ? table.columns.map(c => c.name) : [];
        const similar = findSimilarNames(columnPart, tableColNames);

        return {
          message: `Column '${columnPart}' does not exist in table '${resolvedTable}'`,
          friendlyMessage: `The column '${columnPart}' doesn't exist in table '${resolvedTable}'.`,
          suggestions: [
            similar.length > 0 ? `Did you mean '${similar[0]}'?` : '',
            `Columns in ${resolvedTable}: ${tableColNames.join(', ')}`
          ].filter(Boolean)
        };
      }
    }
  }

  // Validation passed
  return null;
}

/**
 * Find similar names using simple string matching
 */
function findSimilarNames(target: string, candidates: string[]): string[] {
  const targetLower = target.toLowerCase();

  return candidates
    .filter(candidate => {
      const candidateLower = candidate.toLowerCase();

      // Exact match (different case)
      if (candidateLower === targetLower) return false;

      // Same start
      if (candidateLower.startsWith(targetLower.slice(0, 3))) return true;
      if (targetLower.startsWith(candidateLower.slice(0, 3))) return true;

      // Contains
      if (candidateLower.includes(targetLower)) return true;
      if (targetLower.includes(candidateLower)) return true;

      // Similar length and some matching characters
      if (Math.abs(candidate.length - target.length) <= 2) {
        let matches = 0;
        for (let i = 0; i < Math.min(candidateLower.length, targetLower.length); i++) {
          if (candidateLower[i] === targetLower[i]) matches++;
        }
        if (matches >= target.length / 2) return true;
      }

      return false;
    })
    .slice(0, 3); // Return top 3 suggestions
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if the given SQL is a valid SELECT query
 */
export function isSelectQuery(sql: string): boolean {
  const result = parseQuery(sql);
  return result.success && result.result.type === 'select';
}

/**
 * Get the parser instance for advanced usage
 */
export function getParserInstance(): Parser {
  return getParser();
}

/**
 * Convert AST back to SQL string
 */
export function astToSql(ast: any): string {
  try {
    const parser = getParser();
    return parser.sqlify(ast, { database: 'SQLite' });
  } catch {
    return '';
  }
}

/**
 * Ensure parser is initialized (no-op for sync version)
 */
export async function ensureParserInitialized(): Promise<void> {
  getParser();
}

/**
 * Extract table names from a SQL query (async for compatibility)
 */
export async function extractTableNames(sql: string): Promise<string[]> {
  const result = parseQuery(sql);
  if (result.success) {
    return result.result.tables;
  }
  return [];
}
