/**
 * SQLens Database Engine
 *
 * This module wraps sql.js (SQLite compiled to WASM) for in-browser SQL execution.
 * It provides a singleton database instance with methods for querying, schema
 * introspection, and data manipulation.
 *
 * @module engine/database
 */

import type {
  Schema,
  Table,
  Column,
  QueryResult,
  ResultColumn,
  ResultRow,
  DatabasePreset,
} from '@/types';

// Type definitions for sql.js (loaded dynamically)
interface SqlJsDatabase {
  run(sql: string, params?: any[]): void;
  exec(sql: string): { columns: string[]; values: any[][] }[];
  prepare(sql: string): {
    run(params?: any[]): void;
    free(): void;
  };
  getRowsModified(): number;
  close(): void;
}

interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

// =============================================================================
// MODULE STATE
// =============================================================================

/** Singleton sql.js library instance */
let SQL: SqlJsStatic | null = null;

/** Singleton database instance */
let db: SqlJsDatabase | null = null;

/** Flag indicating initialization is in progress */
let isInitializing = false;

/** Promise for tracking initialization completion */
let initPromise: Promise<void> | null = null;

/** WASM file location */
const WASM_CDN_URL = 'https://sql.js.org/dist/';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize sql.js and create a new database instance.
 * This must be called before any database operations.
 *
 * The function is idempotent - calling it multiple times will return
 * the same promise and not reinitialize the database.
 *
 * @returns Promise that resolves when initialization is complete
 * @throws Error if WASM initialization fails
 */
export async function initDatabase(): Promise<void> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Already initialized
  if (db) {
    return;
  }

  // Initialization in progress - return existing promise
  if (initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      // Dynamically load sql.js from CDN to avoid bundling issues
      const initSqlJs = await loadSqlJs();

      SQL = await initSqlJs({
        locateFile: (file: string) => `${WASM_CDN_URL}${file}`,
      });

      db = new SQL.Database();

      // Enable foreign key support by default
      db.run('PRAGMA foreign_keys = ON;');
    } catch (error) {
      // Reset state on failure
      SQL = null;
      db = null;
      initPromise = null;

      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize SQL engine: ${message}`);
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Dynamically load sql.js from CDN
 */
async function loadSqlJs(): Promise<(config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).initSqlJs) {
      resolve((window as any).initSqlJs);
      return;
    }

    const script = document.createElement('script');
    script.src = `${WASM_CDN_URL}sql-wasm.js`;
    script.async = true;

    script.onload = () => {
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs);
      } else {
        reject(new Error('sql.js loaded but initSqlJs not found'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load sql.js from CDN'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Check if the database is ready for operations.
 *
 * @returns true if database is initialized and ready
 */
export function isDatabaseReady(): boolean {
  return db !== null;
}

/**
 * Check if initialization is in progress.
 *
 * @returns true if currently initializing
 */
export function isInitializingDatabase(): boolean {
  return isInitializing;
}

// =============================================================================
// QUERY EXECUTION
// =============================================================================

/**
 * Execute a SQL query and return structured results.
 *
 * This function handles all query types including SELECT, INSERT, UPDATE, DELETE,
 * and DDL statements. It captures execution time and formats results consistently.
 *
 * @param sql - SQL query to execute
 * @returns QueryResult with columns, rows, timing, and any error
 */
export function executeQuery(sql: string): QueryResult {
  if (!db) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
      error: 'Database not initialized. Call initDatabase() first.',
    };
  }

  const trimmedSql = sql.trim();
  if (!trimmedSql) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: 0,
      error: 'Empty query provided.',
    };
  }

  const startTime = performance.now();

  try {
    // Check if this is a modification query
    const isModification = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/i.test(trimmedSql);

    const results = db.exec(trimmedSql);
    const executionTime = performance.now() - startTime;

    // Handle queries that don't return results (DDL, modifications, etc.)
    if (results.length === 0) {
      const rowsAffected = isModification ? db.getRowsModified() : 0;

      return {
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        rowsAffected,
        executionTime,
      };
    }

    // Process the first result set
    const result = results[0];
    if (!result) {
      return {
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
      };
    }

    // Map column names to ResultColumn format
    const columns: ResultColumn[] = result.columns.map((name) => ({
      name,
      type: 'TEXT', // sql.js doesn't provide column types in exec results
    }));

    // Map values to ResultRow format
    const rows: ResultRow[] = result.values.map((row) => {
      const resultRow: ResultRow = {};
      result.columns.forEach((colName, index) => {
        const value = row[index];
        // Handle Uint8Array (BLOB) conversion for display
        if (value instanceof Uint8Array) {
          resultRow[colName] = `[BLOB: ${value.length} bytes]`;
        } else {
          resultRow[colName] = value as string | number | null;
        }
      });
      return resultRow;
    });

    return {
      success: true,
      columns,
      rows,
      rowCount: rows.length,
      executionTime,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime,
      error: message,
    };
  }
}

/**
 * Execute raw SQL and get the raw result format.
 * Useful for internal operations and step-through engine.
 *
 * @param sql - SQL query to execute
 * @returns Raw result from sql.js
 */
export function executeRaw(sql: string): { columns: string[]; values: any[][] }[] {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db.exec(sql);
}

/**
 * Execute multiple SQL statements without returning results.
 * Useful for setup scripts, migrations, and batch operations.
 *
 * @param sql - SQL statements to execute (can include multiple statements)
 * @throws Error if database is not initialized or execution fails
 */
export function executeStatements(sql: string): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const trimmedSql = sql.trim();
  if (!trimmedSql) {
    return;
  }

  try {
    db.run(trimmedSql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute statements: ${message}`);
  }
}

// =============================================================================
// SCHEMA INTROSPECTION
// =============================================================================

/**
 * Get the complete database schema including all tables, columns, and relationships.
 *
 * @returns Schema object containing all table definitions
 * @throws Error if database is not initialized
 */
export function getSchema(): Schema {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const tables = getTableNames().map((name) => getTableInfo(name));

  return { tables };
}

/**
 * Get all table names in the database.
 *
 * @returns Array of table names (excludes SQLite internal tables)
 * @throws Error if database is not initialized
 */
export function getTableNames(): string[] {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  try {
    const results = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);

    if (results.length === 0 || !results[0]) {
      return [];
    }

    return results[0].values.map((row) => String(row[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[SQLens] Failed to get table names:', message);
    return [];
  }
}

/**
 * Get detailed information about a specific table.
 *
 * @param tableName - Name of the table to inspect
 * @returns Table object with columns and foreign key information
 * @throws Error if database is not initialized or table doesn't exist
 */
export function getTableInfo(tableName: string): Table {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  // Validate table name to prevent SQL injection
  const sanitizedName = sanitizeIdentifier(tableName);

  try {
    // Get column information using PRAGMA
    const columnResults = db.exec(`PRAGMA table_info("${sanitizedName}");`);

    if (columnResults.length === 0 || !columnResults[0]) {
      throw new Error(`Table "${tableName}" not found`);
    }

    const columns: Column[] = columnResults[0].values.map((row) => {
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      const name = String(row[1]);
      const type = String(row[2]) || 'TEXT';
      const notNull = row[3] === 1;
      const defaultValue = row[4];
      const isPrimaryKey = row[5] === 1;

      const constraints: string[] = [];

      if (isPrimaryKey) {
        constraints.push('PRIMARY KEY');
      }
      if (notNull) {
        constraints.push('NOT NULL');
      }
      if (defaultValue !== null) {
        constraints.push(`DEFAULT ${defaultValue}`);
      }

      return { name, type, constraints };
    });

    // Get foreign key information using PRAGMA
    const fkResults = db.exec(`PRAGMA foreign_key_list("${sanitizedName}");`);

    if (fkResults.length > 0 && fkResults[0]) {
      // PRAGMA foreign_key_list returns: id, seq, table, from, to, on_update, on_delete, match
      for (const fkRow of fkResults[0].values) {
        const fromColumn = String(fkRow[3]);
        const toTable = String(fkRow[2]);
        const toColumn = String(fkRow[4]);

        // Add FK constraint to the column
        const column = columns.find((c) => c.name === fromColumn);
        if (column) {
          column.constraints.push(`REFERENCES ${toTable}(${toColumn})`);
        }
      }
    }

    return { name: tableName, columns };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get table info for "${tableName}": ${message}`);
  }
}

/**
 * Get the row count for a specific table.
 *
 * @param tableName - Name of the table
 * @returns Number of rows in the table
 * @throws Error if database is not initialized or table doesn't exist
 */
export function getRowCount(tableName: string): number {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const sanitizedName = sanitizeIdentifier(tableName);

  try {
    const results = db.exec(`SELECT COUNT(*) FROM "${sanitizedName}";`);

    if (results.length === 0 || !results[0] || results[0].values.length === 0) {
      return 0;
    }

    const count = results[0].values[0]?.[0];
    return typeof count === 'number' ? count : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get row count for "${tableName}": ${message}`);
  }
}

/**
 * Get sample rows from a table.
 *
 * @param tableName - Name of the table
 * @param limit - Maximum number of rows to return (default: 10)
 * @returns Array of rows, each row is an array of cell values
 * @throws Error if database is not initialized or table doesn't exist
 */
export function getSampleRows(
  tableName: string,
  limit: number = 10
): (string | number | null)[][] {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const sanitizedName = sanitizeIdentifier(tableName);
  const safeLimit = Math.max(1, Math.min(limit, 1000));

  try {
    const results = db.exec(`SELECT * FROM "${sanitizedName}" LIMIT ${safeLimit};`);

    if (results.length === 0 || !results[0]) {
      return [];
    }

    return results[0].values.map((row) =>
      row.map((cell) => {
        if (cell instanceof Uint8Array) {
          return `[BLOB: ${cell.length} bytes]`;
        }
        return cell as string | number | null;
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get sample rows from "${tableName}": ${message}`);
  }
}

// =============================================================================
// TABLE OPERATIONS
// =============================================================================

/**
 * Create a table from a Table definition.
 *
 * @param table - Table definition with name, columns, and constraints
 * @throws Error if database is not initialized or creation fails
 */
export function createTable(table: Table): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const sanitizedName = sanitizeIdentifier(table.name);

  // Separate column definitions from foreign key constraints
  const columnDefs: string[] = [];
  const foreignKeys: string[] = [];

  for (const col of table.columns) {
    const sanitizedColName = sanitizeIdentifier(col.name);

    // Extract non-FK constraints
    const nonFkConstraints = col.constraints
      .filter((c) => !c.startsWith('REFERENCES'))
      .join(' ');

    columnDefs.push(
      `"${sanitizedColName}" ${col.type}${nonFkConstraints ? ` ${nonFkConstraints}` : ''}`
    );

    // Extract FK constraints
    const fkConstraint = col.constraints.find((c) => c.startsWith('REFERENCES'));
    if (fkConstraint) {
      foreignKeys.push(`FOREIGN KEY ("${sanitizedColName}") ${fkConstraint}`);
    }
  }

  const allDefs = [...columnDefs, ...foreignKeys];
  const sql = `CREATE TABLE IF NOT EXISTS "${sanitizedName}" (\n  ${allDefs.join(',\n  ')}\n);`;

  try {
    db.run(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create table "${table.name}": ${message}`);
  }
}

/**
 * Insert data into a table.
 *
 * @param tableName - Name of the target table
 * @param columns - Array of column names
 * @param rows - Array of rows, each row is an array of values matching columns
 * @throws Error if database is not initialized or insertion fails
 */
export function insertData(
  tableName: string,
  columns: string[],
  rows: (string | number | boolean | null)[][]
): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  if (rows.length === 0) {
    return;
  }

  const sanitizedTable = sanitizeIdentifier(tableName);
  const sanitizedColumns = columns.map(sanitizeIdentifier);

  // Use parameterized queries for safety and performance
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO "${sanitizedTable}" ("${sanitizedColumns.join('", "')}") VALUES (${placeholders});`;

  try {
    const stmt = db.prepare(sql);

    for (const row of rows) {
      // Convert boolean to integer for SQLite
      const convertedRow = row.map(val => {
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val;
      });
      stmt.run(convertedRow);
    }

    stmt.free();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to insert data into "${tableName}": ${message}`);
  }
}

/**
 * Drop a table from the database.
 *
 * @param tableName - Name of the table to drop
 * @throws Error if database is not initialized or drop fails
 */
export function dropTable(tableName: string): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const sanitizedName = sanitizeIdentifier(tableName);

  try {
    db.run(`DROP TABLE IF EXISTS "${sanitizedName}";`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to drop table "${tableName}": ${message}`);
  }
}

/**
 * Reset the database by dropping all user tables.
 * This preserves the database instance but removes all data.
 *
 * @throws Error if database is not initialized
 */
export function resetDatabase(): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  try {
    // Disable foreign keys temporarily to avoid constraint violations during drop
    db.run('PRAGMA foreign_keys = OFF;');

    const tableNames = getTableNames();

    for (const tableName of tableNames) {
      dropTable(tableName);
    }

    // Re-enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');
  } catch (error) {
    // Re-enable foreign keys even on error
    try {
      db.run('PRAGMA foreign_keys = ON;');
    } catch {
      // Ignore errors during cleanup
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reset database: ${message}`);
  }
}

// =============================================================================
// PRESET LOADING
// =============================================================================

/**
 * Load a database preset, creating tables and inserting seed data.
 *
 * @param preset - DatabasePreset containing schema and seed data
 * @throws Error if database is not initialized or loading fails
 */
export async function loadPreset(preset: DatabasePreset): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  try {
    // Clear existing data
    resetDatabase();

    // Create all tables from schema
    for (const table of preset.schema.tables) {
      createTable(table);
    }

    // Insert seed data for each table
    for (const [tableName, rows] of Object.entries(preset.seedData)) {
      const table = preset.schema.tables.find((t) => t.name === tableName);

      if (table && rows && rows.length > 0) {
        const columnNames = table.columns.map((c) => c.name);
        insertData(tableName, columnNames, rows as (string | number | boolean | null)[][]);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load preset "${preset.name}": ${message}`);
  }
}

// =============================================================================
// IMPORT / EXPORT
// =============================================================================

/**
 * Export the entire database as a SQL dump (CREATE TABLE + INSERT statements).
 *
 * @returns SQL string that can recreate the database
 * @throws Error if database is not initialized
 */
export function exportAsSql(): string {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const lines: string[] = [];
  lines.push('-- SQLens Database Export');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('');

  try {
    const tableNames = getTableNames();

    for (const tableName of tableNames) {
      // Get CREATE TABLE statement from sqlite_master
      const sanitizedName = sanitizeIdentifier(tableName);
      const createResults = db.exec(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = '${sanitizedName}';`
      );

      if (createResults.length > 0 && createResults[0] && createResults[0].values.length > 0) {
        const createSql = createResults[0].values[0]?.[0];
        if (createSql) {
          lines.push(`${createSql};`);
          lines.push('');
        }
      }

      // Get INSERT statements for data
      const dataResults = db.exec(`SELECT * FROM "${sanitizedName}";`);

      if (dataResults.length > 0 && dataResults[0] && dataResults[0].values.length > 0) {
        const result = dataResults[0];
        const columns = result.columns.map((c) => `"${c}"`).join(', ');

        for (const row of result.values) {
          const values = row
            .map((val) => {
              if (val === null) return 'NULL';
              if (typeof val === 'number') return String(val);
              if (typeof val === 'string') return `'${escapeString(val)}'`;
              if (val instanceof Uint8Array) return `X'${bufferToHex(val)}'`;
              return 'NULL';
            })
            .join(', ');

          lines.push(`INSERT INTO "${tableName}" (${columns}) VALUES (${values});`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to export database: ${message}`);
  }
}

/**
 * Import a database from a SQL dump.
 * This will reset the database and execute all statements in the dump.
 *
 * @param sql - SQL dump to import
 * @throws Error if database is not initialized or import fails
 */
export function importFromSql(sql: string): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  try {
    resetDatabase();
    executeStatements(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import database: ${message}`);
  }
}

/**
 * Import CSV data into a new table.
 * The first row is assumed to be headers (column names).
 * Column types are inferred from the data.
 *
 * @param tableName - Name for the new table
 * @param csvContent - CSV string content
 * @throws Error if database is not initialized or import fails
 */
export function importCsv(tableName: string, csvContent: string): void {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  const trimmedContent = csvContent.trim();
  if (!trimmedContent) {
    throw new Error('CSV content is empty');
  }

  try {
    const rows = parseCsv(trimmedContent);

    if (rows.length === 0) {
      throw new Error('CSV has no data rows');
    }

    const headerRow = rows[0];
    if (!headerRow || headerRow.length === 0) {
      throw new Error('CSV has no header columns');
    }

    const headers = headerRow;
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      throw new Error('CSV has no data rows after header');
    }

    // Infer column types from data
    const columnTypes = inferColumnTypes(headers, dataRows);

    // Create table definition
    const columns: Column[] = headers.map((name, index) => ({
      name: sanitizeColumnName(name),
      type: columnTypes[index] || 'TEXT',
      constraints: [],
    }));

    const table: Table = { name: tableName, columns };

    // Create table and insert data
    createTable(table);

    // Convert string values to appropriate types
    const typedRows = dataRows.map((row) =>
      row.map((cell, index) => {
        if (cell === '' || cell === null || cell === undefined) {
          return null;
        }

        const type = columnTypes[index];
        if (type === 'INTEGER') {
          const parsed = parseInt(cell, 10);
          return isNaN(parsed) ? null : parsed;
        }
        if (type === 'REAL') {
          const parsed = parseFloat(cell);
          return isNaN(parsed) ? null : parsed;
        }
        return cell;
      })
    );

    insertData(
      tableName,
      columns.map((c) => c.name),
      typedRows
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import CSV: ${message}`);
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sanitize a SQL identifier to prevent injection attacks.
 * Removes or escapes dangerous characters.
 *
 * @param identifier - Table or column name
 * @returns Sanitized identifier
 */
function sanitizeIdentifier(identifier: string): string {
  // Remove null bytes and escape double quotes
  return identifier.replace(/\0/g, '').replace(/"/g, '""');
}

/**
 * Escape a string value for SQL insertion.
 *
 * @param value - String value to escape
 * @returns Escaped string
 */
function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Convert a Uint8Array to a hex string.
 *
 * @param buffer - Uint8Array to convert
 * @returns Hexadecimal string
 */
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sanitize a column name from CSV headers.
 *
 * @param name - Original column name
 * @returns Sanitized column name
 */
function sanitizeColumnName(name: string): string {
  // Remove leading/trailing whitespace and replace special chars
  const sanitized = name
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  return sanitized || 'column';
}

/**
 * Parse CSV content into a 2D array.
 * Handles quoted fields and escaped quotes.
 *
 * @param content - CSV content string
 * @returns 2D array of cell values
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Don't forget the last cell
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

/**
 * Infer SQLite column types from data values.
 *
 * @param headers - Column headers
 * @param dataRows - Data rows to analyze
 * @returns Array of inferred types for each column
 */
function inferColumnTypes(headers: string[], dataRows: string[][]): string[] {
  const types: string[] = new Array(headers.length).fill('TEXT');

  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    let hasInteger = false;
    let hasReal = false;
    let hasText = false;

    for (const row of dataRows) {
      const cell = row[colIndex];

      if (cell === undefined || cell === null || cell === '') {
        continue;
      }

      // Check if it's a valid integer
      if (/^-?\d+$/.test(cell)) {
        hasInteger = true;
        continue;
      }

      // Check if it's a valid real number
      if (/^-?\d+\.\d+$/.test(cell) || /^-?\d+\.?\d*e[+-]?\d+$/i.test(cell)) {
        hasReal = true;
        continue;
      }

      // It's text
      hasText = true;
    }

    // Determine final type (most permissive wins)
    if (hasText) {
      types[colIndex] = 'TEXT';
    } else if (hasReal) {
      types[colIndex] = 'REAL';
    } else if (hasInteger) {
      types[colIndex] = 'INTEGER';
    }
  }

  return types;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Close the database connection and release resources.
 * Call this when the application is shutting down.
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch (error) {
      console.error('[SQLens] Error closing database:', error);
    } finally {
      db = null;
      SQL = null;
      initPromise = null;
    }
  }
}
