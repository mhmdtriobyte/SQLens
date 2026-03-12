/**
 * @fileoverview Schema type definitions for SQLens database structures.
 *
 * This module defines the core types for representing database schemas,
 * tables, columns, relationships, and preset database configurations.
 *
 * @module types/schema
 */

// ============================================================================
// Column Types
// ============================================================================

/**
 * Supported SQL column data types.
 *
 * These types map to common SQL database column types:
 * - INT/INTEGER: Whole numbers
 * - TEXT: Variable-length character strings
 * - REAL: Floating-point numbers
 * - BOOLEAN: True/false values
 * - DATE: Calendar dates (YYYY-MM-DD)
 * - DATETIME: Date and time combined
 */
export type ColumnType = 'INT' | 'INTEGER' | 'TEXT' | 'REAL' | 'BOOLEAN' | 'DATE' | 'DATETIME';

/**
 * Represents a column definition within a database table.
 *
 * A column defines the structure of data that can be stored in a single
 * field of a table row, including its name, data type, and constraints.
 *
 * @example
 * ```typescript
 * const idColumn: Column = {
 *   name: 'id',
 *   type: 'INTEGER',
 *   primaryKey: true,
 *   notNull: true
 * };
 *
 * const emailColumn: Column = {
 *   name: 'email',
 *   type: 'TEXT',
 *   notNull: true,
 *   unique: true
 * };
 * ```
 */
export interface Column {
  /**
   * The name of the column.
   * Must be a valid SQL identifier.
   */
  name: string;

  /**
   * The data type of the column.
   * Determines what kind of values can be stored.
   */
  type: ColumnType | string;

  /**
   * Whether this column is part of the table's primary key.
   * Primary key columns uniquely identify each row.
   * @default false
   */
  primaryKey?: boolean;

  /**
   * Whether this column allows NULL values.
   * When true, every row must have a value for this column.
   * @default false
   */
  notNull?: boolean;

  /**
   * Whether values in this column must be unique across all rows.
   * @default false
   */
  unique?: boolean;

  /**
   * The default value for this column when no value is provided during INSERT.
   * Can be a string, number, or null.
   */
  defaultValue?: string | number | null;

  /**
   * Array of constraint strings for this column.
   * Examples: 'PRIMARY KEY', 'NOT NULL', 'REFERENCES table(column)'
   */
  constraints: string[];
}

// ============================================================================
// Relationship Types
// ============================================================================

/**
 * Represents a foreign key relationship between tables.
 *
 * Foreign keys establish referential integrity by linking a column
 * in one table to a column (usually the primary key) in another table.
 *
 * @example
 * ```typescript
 * const studentCourseFk: ForeignKey = {
 *   column: 'student_id',
 *   referencesTable: 'students',
 *   referencesColumn: 'id'
 * };
 * ```
 */
export interface ForeignKey {
  /**
   * The column name in the current table that holds the foreign key.
   */
  column: string;

  /**
   * The name of the table being referenced.
   */
  referencesTable: string;

  /**
   * The column name in the referenced table (usually the primary key).
   */
  referencesColumn: string;
}

// ============================================================================
// Table Types
// ============================================================================

/**
 * Represents a complete table definition within a database schema.
 *
 * A table consists of columns that define its structure, along with
 * constraints like primary keys and foreign key relationships.
 *
 * @example
 * ```typescript
 * const studentsTable: Table = {
 *   name: 'students',
 *   columns: [
 *     { name: 'id', type: 'INTEGER', primaryKey: true, notNull: true },
 *     { name: 'name', type: 'TEXT', notNull: true },
 *     { name: 'email', type: 'TEXT', unique: true },
 *     { name: 'enrollment_date', type: 'DATE' }
 *   ],
 *   primaryKey: ['id']
 * };
 * ```
 */
export interface Table {
  /**
   * The name of the table.
   * Must be a valid SQL identifier and unique within the schema.
   */
  name: string;

  /**
   * Array of column definitions for this table.
   * Order matters for display and default column ordering.
   */
  columns: Column[];

  /**
   * Array of column names that form the primary key.
   * Supports composite primary keys with multiple columns.
   */
  primaryKey?: string[];

  /**
   * Array of foreign key relationships from this table to others.
   */
  foreignKeys?: ForeignKey[];
}

// ============================================================================
// Schema Types
// ============================================================================

/**
 * Represents a complete database schema containing multiple tables.
 *
 * The schema is the top-level container for all table definitions
 * and serves as the blueprint for the database structure.
 *
 * @example
 * ```typescript
 * const universitySchema: Schema = {
 *   tables: [studentsTable, coursesTable, enrollmentsTable]
 * };
 * ```
 */
export interface Schema {
  /**
   * Array of all tables in the database schema.
   */
  tables: Table[];
}

// ============================================================================
// Example Query Types
// ============================================================================

/**
 * Categories for organizing example SQL queries by complexity and topic.
 */
export type QueryCategory = 'Basic' | 'Joins' | 'Aggregation' | 'Subqueries' | 'Advanced';

/**
 * Represents an example SQL query with metadata for learning purposes.
 *
 * Example queries demonstrate various SQL concepts and serve as
 * starting points for users to learn query visualization.
 *
 * @example
 * ```typescript
 * const basicSelect: ExampleQuery = {
 *   id: 'basic-select-all',
 *   title: 'Select All Students',
 *   description: 'Retrieves all columns from the students table',
 *   category: 'Basic',
 *   sql: 'SELECT * FROM students;'
 * };
 * ```
 */
export interface ExampleQuery {
  /**
   * Unique identifier for the query.
   * Used for referencing and tracking query usage.
   * If not provided, one will be auto-generated.
   */
  id?: string;

  /**
   * Short, descriptive title for the query.
   * Displayed in query selection lists.
   */
  title: string;

  /**
   * Detailed description explaining what the query does.
   * Helps users understand the purpose and learning objective.
   */
  description: string;

  /**
   * Category classification for organizing queries by topic.
   */
  category: QueryCategory;

  /**
   * The actual SQL query string.
   * Should be valid SQL that works with the associated schema.
   */
  sql: string;
}

// ============================================================================
// Database Preset Types
// ============================================================================

/**
 * Type representing seed data for database tables.
 * Maps table names to arrays of row data (each row is an array of values).
 *
 * @example
 * ```typescript
 * const seedData: SeedData = {
 *   students: [
 *     [1, 'Alice', 'alice@example.com'],
 *     [2, 'Bob', 'bob@example.com']
 *   ],
 *   courses: [
 *     [101, 'Database Systems', 3],
 *     [102, 'Algorithms', 4]
 *   ]
 * };
 * ```
 */
export type SeedData = Record<string, any[][]>;

/**
 * Represents a complete database preset with schema, data, and examples.
 *
 * Presets provide ready-to-use database configurations for different
 * domains (e.g., university, e-commerce) complete with sample data
 * and curated example queries for learning.
 *
 * @example
 * ```typescript
 * const universityPreset: DatabasePreset = {
 *   id: 'university',
 *   name: 'University Database',
 *   description: 'A sample university database with students, courses, and enrollments',
 *   schema: universitySchema,
 *   seedData: {
 *     students: [[1, 'Alice', 'alice@uni.edu'], [2, 'Bob', 'bob@uni.edu']],
 *     courses: [[101, 'CS101', 3], [102, 'MATH201', 4]]
 *   },
 *   exampleQueries: [basicSelectQuery, joinQuery, aggregationQuery]
 * };
 * ```
 */
export interface DatabasePreset {
  /**
   * Unique identifier for the preset.
   * Used for selection and storage references.
   */
  id: string;

  /**
   * Human-readable name of the preset.
   * Displayed in preset selection UI.
   */
  name: string;

  /**
   * Detailed description of the preset's domain and contents.
   * Helps users choose the appropriate preset for their learning goals.
   */
  description: string;

  /**
   * The database schema definition for this preset.
   */
  schema: Schema;

  /**
   * Sample data to populate the tables.
   * Keys are table names, values are arrays of row data.
   * Row data order must match the column order in the table definition.
   */
  seedData: SeedData;

  /**
   * Curated example queries demonstrating various SQL concepts.
   * Organized by category for progressive learning.
   */
  exampleQueries: ExampleQuery[];
}
