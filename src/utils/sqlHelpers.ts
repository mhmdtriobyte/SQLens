/**
 * SQL helper utility functions for SQLens
 * Provides SQL-specific utilities for validation, parsing, and formatting
 */

/**
 * Comprehensive list of SQL keywords for syntax highlighting and autocomplete
 */
const SQL_KEYWORDS: string[] = [
  // Data Query Language (DQL)
  'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
  'DISTINCT', 'ALL', 'AS', 'UNION', 'INTERSECT', 'EXCEPT', 'MINUS',

  // Joins
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS', 'NATURAL',
  'ON', 'USING',

  // Data Manipulation Language (DML)
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'MERGE',
  'REPLACE', 'UPSERT',

  // Data Definition Language (DDL)
  'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME', 'COMMENT',
  'TABLE', 'VIEW', 'INDEX', 'DATABASE', 'SCHEMA', 'SEQUENCE',
  'TRIGGER', 'PROCEDURE', 'FUNCTION', 'TYPE', 'DOMAIN',
  'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'UNIQUE', 'CHECK', 'DEFAULT', 'NOT', 'NULL', 'AUTO_INCREMENT',
  'IDENTITY', 'GENERATED', 'ALWAYS', 'STORED', 'VIRTUAL',

  // Data Control Language (DCL)
  'GRANT', 'REVOKE', 'DENY',

  // Transaction Control
  'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'TRANSACTION',
  'START', 'END', 'WORK',

  // Clauses and Operators
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'IS', 'ANY', 'SOME', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'NULLIF', 'COALESCE', 'CAST', 'CONVERT', 'OVER', 'PARTITION',
  'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW',

  // Sorting and Limiting
  'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'TOP', 'FETCH', 'NEXT', 'ONLY',
  'PERCENT', 'WITH', 'TIES',

  // Common Table Expressions
  'WITH', 'RECURSIVE',

  // Conditional
  'IF', 'ELSEIF', 'ELSIF', 'LOOP', 'WHILE', 'FOR', 'FOREACH',
  'CONTINUE', 'EXIT', 'RETURN', 'DECLARE', 'CURSOR',

  // Data Types
  'INT', 'INTEGER', 'SMALLINT', 'BIGINT', 'TINYINT', 'MEDIUMINT',
  'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'DOUBLE', 'PRECISION',
  'CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR', 'NTEXT',
  'BINARY', 'VARBINARY', 'BLOB', 'CLOB',
  'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR', 'INTERVAL',
  'BOOLEAN', 'BOOL', 'BIT', 'JSON', 'JSONB', 'XML', 'UUID',
  'MONEY', 'SMALLMONEY', 'SERIAL', 'BIGSERIAL',
  'ARRAY', 'ENUM', 'SET',

  // Boolean Literals
  'TRUE', 'FALSE', 'UNKNOWN',

  // Set Operations
  'UNION', 'INTERSECT', 'EXCEPT', 'MINUS',

  // Subquery
  'LATERAL', 'UNNEST',

  // Misc
  'EXPLAIN', 'ANALYZE', 'VERBOSE', 'PLAN', 'FORMAT',
  'SHOW', 'DESCRIBE', 'DESC', 'USE', 'DATABASE', 'DATABASES',
  'TABLES', 'COLUMNS', 'INDEXES', 'KEYS', 'STATUS',
  'VACUUM', 'REINDEX', 'CLUSTER', 'REFRESH',
  'MATERIALIZED', 'TEMPORARY', 'TEMP', 'UNLOGGED',
  'CASCADE', 'RESTRICT', 'NO', 'ACTION', 'DEFERRABLE',
  'INITIALLY', 'DEFERRED', 'IMMEDIATE',
  'COLLATE', 'COLLATION', 'CHARACTER', 'VARYING',
  'ZONE', 'WITHOUT', 'LOCAL', 'GLOBAL',
  'ESCAPE', 'SIMILAR', 'TO', 'REGEXP', 'RLIKE',
  'MATCH', 'AGAINST', 'CONTAINS', 'FREETEXT',
];

/**
 * Comprehensive list of SQL aggregate functions
 */
const AGGREGATE_FUNCTIONS: string[] = [
  // Standard Aggregate Functions
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'TOTAL', 'GROUP_CONCAT', 'STRING_AGG', 'ARRAY_AGG', 'JSON_AGG', 'JSONB_AGG',

  // Statistical Functions
  'STDDEV', 'STDDEV_POP', 'STDDEV_SAMP',
  'VARIANCE', 'VAR_POP', 'VAR_SAMP',
  'CORR', 'COVAR_POP', 'COVAR_SAMP',
  'REGR_AVGX', 'REGR_AVGY', 'REGR_COUNT', 'REGR_INTERCEPT',
  'REGR_R2', 'REGR_SLOPE', 'REGR_SXX', 'REGR_SXY', 'REGR_SYY',

  // Boolean Aggregates
  'BOOL_AND', 'BOOL_OR', 'EVERY',

  // Bitwise Aggregates
  'BIT_AND', 'BIT_OR', 'BIT_XOR',

  // Window Functions (can be used as aggregates)
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
  'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
  'PERCENT_RANK', 'CUME_DIST', 'PERCENTILE_CONT', 'PERCENTILE_DISC',

  // Array and JSON Aggregates
  'ARRAY_TO_STRING', 'JSON_OBJECT_AGG', 'JSONB_OBJECT_AGG',

  // Other Aggregates
  'LISTAGG', 'XMLAGG', 'COLLECT', 'MEDIAN', 'MODE',
];

/**
 * Common SQL scalar functions for autocomplete
 */
const SCALAR_FUNCTIONS: string[] = [
  // String Functions
  'CONCAT', 'CONCAT_WS', 'LENGTH', 'CHAR_LENGTH', 'CHARACTER_LENGTH',
  'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM', 'LPAD', 'RPAD',
  'SUBSTRING', 'SUBSTR', 'LEFT', 'RIGHT', 'REPLACE', 'REVERSE',
  'REPEAT', 'SPACE', 'ASCII', 'CHR', 'CHAR', 'INSTR', 'LOCATE',
  'POSITION', 'SPLIT_PART', 'INITCAP', 'QUOTE', 'FORMAT',

  // Numeric Functions
  'ABS', 'CEIL', 'CEILING', 'FLOOR', 'ROUND', 'TRUNC', 'TRUNCATE',
  'MOD', 'POWER', 'POW', 'SQRT', 'EXP', 'LOG', 'LOG10', 'LOG2', 'LN',
  'SIGN', 'PI', 'RANDOM', 'RAND', 'GREATEST', 'LEAST',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
  'DEGREES', 'RADIANS',

  // Date/Time Functions
  'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
  'DATE', 'TIME', 'DATETIME', 'TIMESTAMP',
  'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'DAYOFWEEK', 'DAYOFMONTH', 'DAYOFYEAR', 'WEEK', 'WEEKDAY',
  'QUARTER', 'EXTRACT', 'DATE_PART', 'DATE_TRUNC',
  'DATE_ADD', 'DATE_SUB', 'DATEADD', 'DATEDIFF', 'TIMESTAMPDIFF',
  'AGE', 'MAKE_DATE', 'MAKE_TIME', 'MAKE_TIMESTAMP',
  'TO_DATE', 'TO_TIMESTAMP', 'TO_CHAR',

  // Conditional Functions
  'COALESCE', 'NULLIF', 'IFNULL', 'NVL', 'NVL2', 'IIF', 'DECODE',
  'CASE', 'IF', 'CHOOSE',

  // Type Conversion
  'CAST', 'CONVERT', 'TRY_CAST', 'TRY_CONVERT',

  // NULL Functions
  'ISNULL', 'ISNOTNULL',

  // JSON Functions
  'JSON_EXTRACT', 'JSON_VALUE', 'JSON_QUERY', 'JSON_OBJECT',
  'JSON_ARRAY', 'JSON_KEYS', 'JSON_LENGTH', 'JSON_TYPE',
  'JSON_VALID', 'JSON_CONTAINS', 'JSON_SEARCH',

  // UUID Functions
  'UUID', 'GEN_RANDOM_UUID', 'UUID_GENERATE_V4', 'NEWID',

  // Hash Functions
  'MD5', 'SHA1', 'SHA256', 'SHA512', 'HASH',

  // Other Functions
  'ROW', 'ROWNUM', 'ROWID',
];

// Create a Set for faster lookups
const SQL_KEYWORDS_SET = new Set(SQL_KEYWORDS.map(k => k.toUpperCase()));
const AGGREGATE_FUNCTIONS_SET = new Set(AGGREGATE_FUNCTIONS.map(f => f.toUpperCase()));

/**
 * Check if a string is a SQL keyword
 * @param word - The word to check
 * @returns True if the word is a SQL keyword
 */
export function isSqlKeyword(word: string): boolean {
  if (!word || typeof word !== 'string') {
    return false;
  }
  return SQL_KEYWORDS_SET.has(word.toUpperCase().trim());
}

/**
 * Get all SQL keywords for autocomplete
 * @returns Array of SQL keywords in uppercase
 */
export function getSqlKeywords(): string[] {
  return [...SQL_KEYWORDS];
}

/**
 * Get all aggregate functions for autocomplete
 * @returns Array of aggregate function names in uppercase
 */
export function getAggregateFunctions(): string[] {
  return [...AGGREGATE_FUNCTIONS];
}

/**
 * Get all scalar functions for autocomplete
 * @returns Array of scalar function names in uppercase
 */
export function getScalarFunctions(): string[] {
  return [...SCALAR_FUNCTIONS];
}

/**
 * Check if a function name is an aggregate function
 * @param name - The function name to check
 * @returns True if it's an aggregate function
 */
export function isAggregateFunction(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return AGGREGATE_FUNCTIONS_SET.has(name.toUpperCase().trim());
}

/**
 * Validate a table name
 * Table names must start with a letter or underscore, followed by letters, numbers, or underscores
 * @param name - The table name to validate
 * @returns True if the name is valid
 */
export function isValidTableName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  // Check length
  if (trimmed.length === 0 || trimmed.length > 128) {
    return false;
  }

  // Check for quoted identifiers
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`'))) {
    // Quoted identifiers are more permissive
    const inner = trimmed.slice(1, -1);
    const quoteChar = trimmed[0] || '';
    return inner.length > 0 && !inner.includes(quoteChar);
  }

  // Standard identifier rules
  // Must start with letter or underscore
  // Can contain letters, numbers, underscores
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  if (!validPattern.test(trimmed)) {
    return false;
  }

  // Cannot be a reserved keyword (optional strict check)
  // Some databases allow keywords as identifiers, but it's not recommended

  return true;
}

/**
 * Validate a column name
 * Column names follow the same rules as table names
 * @param name - The column name to validate
 * @returns True if the name is valid
 */
export function isValidColumnName(name: string): boolean {
  // Column names follow the same rules as table names
  return isValidTableName(name);
}

/**
 * Escape a SQL string value to prevent SQL injection
 * @param str - The string to escape
 * @returns Escaped string safe for SQL
 */
export function escapeSqlString(str: string): string {
  if (str === null || str === undefined) {
    return 'NULL';
  }

  if (typeof str !== 'string') {
    str = String(str);
  }

  // Escape single quotes by doubling them
  // Also escape backslashes for databases that use them
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Parse a column reference (e.g., "table.column" or just "column")
 * @param ref - The column reference string
 * @returns Object with optional table and column properties
 */
export function parseColumnRef(ref: string): { table?: string; column: string } {
  if (!ref || typeof ref !== 'string') {
    return { column: '' };
  }

  const trimmed = ref.trim();

  // Handle quoted identifiers
  // Match patterns like: "table"."column", [table].[column], `table`.`column`
  const quotedPattern = /^(?:(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\])\.)?(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([a-zA-Z_][a-zA-Z0-9_]*))$/;
  const match = trimmed.match(quotedPattern);

  if (match) {
    const table = match[1] || match[2] || match[3];
    const column = match[4] || match[5] || match[6] || match[7];

    if (table) {
      return { table, column: column || '' };
    }
    return { column: column || '' };
  }

  // Simple unquoted pattern: table.column or column
  const parts = trimmed.split('.');

  if (parts.length === 1) {
    return { column: parts[0] };
  }

  if (parts.length === 2) {
    return { table: parts[0], column: parts[1] };
  }

  // Handle schema.table.column (return table.column)
  if (parts.length === 3) {
    return { table: `${parts[0]}.${parts[1]}`, column: parts[2] };
  }

  // Fallback: treat everything before last dot as table
  const lastDotIndex = trimmed.lastIndexOf('.');
  return {
    table: trimmed.substring(0, lastDotIndex),
    column: trimmed.substring(lastDotIndex + 1),
  };
}

/**
 * Infer SQL column type from a JavaScript value
 * @param value - The value to analyze
 * @returns Inferred SQL type name
 */
export function inferColumnType(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  const type = typeof value;

  switch (type) {
    case 'number':
      if (Number.isInteger(value)) {
        if (value >= -2147483648 && value <= 2147483647) {
          return 'INTEGER';
        }
        return 'BIGINT';
      }
      return 'REAL';

    case 'boolean':
      return 'BOOLEAN';

    case 'string':
      // Try to detect specific string formats

      // UUID pattern
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return 'UUID';
      }

      // ISO date pattern
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'DATE';
      }

      // ISO datetime pattern
      if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'TIMESTAMP';
      }

      // Time pattern
      if (/^\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'TIME';
      }

      // JSON object or array
      if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
        try {
          JSON.parse(value);
          return 'JSON';
        } catch {
          // Not valid JSON, treat as text
        }
      }

      // Regular string
      if (value.length <= 255) {
        return 'VARCHAR';
      }
      return 'TEXT';

    case 'object':
      if (value instanceof Date) {
        return 'TIMESTAMP';
      }
      if (Array.isArray(value)) {
        return 'ARRAY';
      }
      if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
        return 'BLOB';
      }
      return 'JSON';

    case 'bigint':
      return 'BIGINT';

    default:
      return 'TEXT';
  }
}

/**
 * Format a SQL query with basic pretty printing
 * @param sql - The SQL query to format
 * @returns Formatted SQL query
 */
export function formatSql(sql: string): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  let formatted = sql.trim();

  // Normalize whitespace
  formatted = formatted.replace(/\s+/g, ' ');

  // Keywords that should start on a new line
  const newLineKeywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
    'HAVING', 'LIMIT', 'OFFSET', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
    'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN', 'ON', 'UNION',
    'INTERSECT', 'EXCEPT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE',
    'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  ];

  // Sort by length (longest first) to avoid partial replacements
  const sortedKeywords = [...newLineKeywords].sort((a, b) => b.length - a.length);

  for (const keyword of sortedKeywords) {
    // Create regex that matches the keyword as a whole word (case insensitive)
    const regex = new RegExp(`\\b(${keyword.replace(/\s+/g, '\\s+')})\\b`, 'gi');
    formatted = formatted.replace(regex, '\n$1');
  }

  // Remove leading newline
  formatted = formatted.replace(/^\n+/, '');

  // Add indentation for certain keywords
  const indentKeywords = ['AND', 'OR', 'ON', 'WHEN', 'THEN', 'ELSE'];

  const lines = formatted.split('\n');
  const indentedLines = lines.map(line => {
    const trimmedLine = line.trim();
    const upperLine = trimmedLine.toUpperCase();

    for (const keyword of indentKeywords) {
      if (upperLine.startsWith(keyword + ' ') || upperLine === keyword) {
        return '  ' + trimmedLine;
      }
    }

    return trimmedLine;
  });

  return indentedLines.join('\n');
}

/**
 * Extract table names from a SQL query
 * Note: This is a simple parser and may not handle all complex queries
 * @param sql - The SQL query to parse
 * @returns Array of table names found in the query
 */
export function extractTableNames(sql: string): string[] {
  if (!sql || typeof sql !== 'string') {
    return [];
  }

  const tables: Set<string> = new Set();

  // Normalize the SQL
  const normalizedSql = sql
    .replace(/--[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Pattern to match table names after FROM, JOIN, INTO, UPDATE, TABLE keywords
  const patterns = [
    // FROM table or FROM schema.table
    /\bFROM\s+([`"\[]?[\w.]+[`"\]]?(?:\s*,\s*[`"\[]?[\w.]+[`"\]]?)*)/gi,
    // JOIN table
    /\bJOIN\s+([`"\[]?[\w.]+[`"\]]?)/gi,
    // INSERT INTO table
    /\bINTO\s+([`"\[]?[\w.]+[`"\]]?)/gi,
    // UPDATE table
    /\bUPDATE\s+([`"\[]?[\w.]+[`"\]]?)/gi,
    // DELETE FROM table
    /\bDELETE\s+FROM\s+([`"\[]?[\w.]+[`"\]]?)/gi,
    // CREATE/ALTER/DROP TABLE table
    /\bTABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?([`"\[]?[\w.]+[`"\]]?)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(normalizedSql)) !== null) {
      const tablesPart = match[1];

      // Handle comma-separated tables (for FROM clause)
      const tableList = tablesPart.split(',');

      for (const table of tableList) {
        // Clean up the table name
        let tableName = table.trim()
          .replace(/^[`"\[]/g, '')
          .replace(/[`"\]]$/g, '')
          .split(/\s+/)[0]; // Remove aliases

        // Skip if it looks like a subquery or keyword
        if (tableName && !tableName.startsWith('(') && !isSqlKeyword(tableName)) {
          tables.add(tableName);
        }
      }
    }
  }

  return Array.from(tables);
}

/**
 * Check if a SQL query is read-only (SELECT, SHOW, DESCRIBE, EXPLAIN)
 * @param sql - The SQL query to check
 * @returns True if the query is read-only
 */
export function isReadOnlyQuery(sql: string): boolean {
  if (!sql || typeof sql !== 'string') {
    return false;
  }

  // Normalize and get the first significant word
  const normalizedSql = sql
    .replace(/--[^\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .trim()
    .toUpperCase();

  // Handle WITH (CTE) - need to check the main query
  let sqlToCheck = normalizedSql;
  if (normalizedSql.startsWith('WITH')) {
    // Find the main query after the CTE
    // This is a simplified check - look for SELECT after the CTE definition
    const selectMatch = normalizedSql.match(/\)\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/);
    if (selectMatch) {
      sqlToCheck = selectMatch[1];
    }
  }

  // Read-only statement starters
  const readOnlyStarters = [
    'SELECT',
    'SHOW',
    'DESCRIBE',
    'DESC',
    'EXPLAIN',
    'ANALYZE', // When used alone for analysis, not modifying
    'PRAGMA', // SQLite pragma for reading settings
  ];

  // Check if the query starts with a read-only keyword
  for (const starter of readOnlyStarters) {
    if (sqlToCheck.startsWith(starter + ' ') || sqlToCheck === starter) {
      return true;
    }
  }

  // Check for potentially dangerous operations
  const writeOperations = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TRUNCATE', 'REPLACE', 'UPSERT', 'MERGE', 'GRANT', 'REVOKE',
    'RENAME', 'VACUUM', 'REINDEX', 'ATTACH', 'DETACH',
  ];

  for (const op of writeOperations) {
    if (normalizedSql.includes(op + ' ') || normalizedSql.includes(op + '\n')) {
      return false;
    }
  }

  // Default to false for safety if we can't determine
  return false;
}

/**
 * Get all SQL-related terms for autocomplete (keywords + functions)
 * @returns Array of all SQL terms
 */
export function getAllSqlTerms(): string[] {
  return [...new Set([...SQL_KEYWORDS, ...AGGREGATE_FUNCTIONS, ...SCALAR_FUNCTIONS])];
}
