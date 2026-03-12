/**
 * SQLens Database Store
 *
 * Zustand store for managing database state including initialization,
 * preset loading, schema management, and data operations.
 *
 * @module stores/databaseStore
 */

import { create } from 'zustand';
import type { Schema, Table, DatabasePreset } from '@/types';
import { databases } from '@/data';
import {
  initDatabase,
  loadPreset as dbLoadPreset,
  getSchema,
  createTable as dbCreateTable,
  dropTable as dbDropTable,
  importCsv as dbImportCsv,
  exportAsSql,
  importFromSql,
  resetDatabase as dbResetDatabase,
  executeStatements
} from '@/engine/database';

// =============================================================================
// CONSTANTS
// =============================================================================

/** LocalStorage key for persisted database state */
const DB_PERSISTENCE_KEY = 'sqlens-database-state';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Database store state interface
 */
interface DatabaseState {
  /** Whether the database engine has been initialized */
  isInitialized: boolean;
  /** Whether a database operation is in progress */
  isLoading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
  /** Currently loaded database preset */
  currentPreset: DatabasePreset | null;
  /** Current database schema */
  schema: Schema | null;
  /** List of available database presets */
  availablePresets: DatabasePreset[];

  // Actions
  /** Initialize the database engine and load default preset */
  initialize: () => Promise<void>;
  /** Load a specific database preset by ID */
  loadPreset: (presetId: string) => Promise<void>;
  /** Refresh the schema from the database */
  refreshSchema: () => void;
  /** Create a new table in the database */
  createTable: (table: Table) => void;
  /** Drop a table from the database */
  dropTable: (tableName: string) => void;
  /** Import CSV data into a table */
  importCsv: (tableName: string, csv: string) => void;
  /** Export the database as SQL */
  exportSql: () => string;
  /** Import SQL into the database */
  importSql: (sql: string) => void;
  /** Reset the database to empty state */
  reset: () => void;
  /** Clear the current error */
  clearError: () => void;
  /** Save database state to localStorage */
  saveDatabaseState: () => void;
  /** Load saved database state from localStorage */
  loadSavedDatabaseState: () => Promise<boolean>;
  /** Check if there's a saved database state */
  hasSavedDatabaseState: () => boolean;
  /** Clear saved database state from localStorage */
  clearSavedDatabaseState: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

/**
 * Database store - manages all database-related state
 *
 * @example
 * ```typescript
 * const { schema, currentPreset, initialize, loadPreset } = useDatabaseStore();
 *
 * // Initialize the database on app start
 * await initialize();
 *
 * // Load a different preset
 * await loadPreset('ecommerce');
 *
 * // Access schema
 * const tables = schema?.tables || [];
 * ```
 */
export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  error: null,
  currentPreset: null,
  schema: null,
  availablePresets: databases,

  /**
   * Initialize the database engine
   * Loads the sql.js WASM module and sets up the default preset
   */
  initialize: async () => {
    const state = get();

    // Prevent double initialization
    if (state.isInitialized || state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Initialize the SQL.js engine
      await initDatabase();

      // Load the default preset (first available)
      const defaultPreset = databases[0];
      if (defaultPreset) {
        await get().loadPreset(defaultPreset.id);
      }

      set({
        isInitialized: true,
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize database';
      set({
        error: message,
        isLoading: false
      });
      console.error('[SQLens] Database initialization error:', message);
    }
  },

  /**
   * Load a database preset by ID
   * Clears existing data and loads the new preset's schema and seed data
   */
  loadPreset: async (presetId: string) => {
    const preset = databases.find(p => p.id === presetId);

    if (!preset) {
      set({ error: `Unknown preset: ${presetId}` });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      await dbLoadPreset(preset);

      // Refresh schema after loading
      const schema = getSchema();

      set({
        currentPreset: preset,
        schema,
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preset';
      set({
        error: message,
        isLoading: false
      });
      console.error('[SQLens] Preset load error:', message);
    }
  },

  /**
   * Refresh the schema from the current database state
   */
  refreshSchema: () => {
    try {
      const schema = getSchema();
      set({ schema, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh schema';
      set({ error: message });
    }
  },

  /**
   * Create a new table in the database
   */
  createTable: (table: Table) => {
    try {
      dbCreateTable(table);
      get().refreshSchema();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create table';
      set({ error: message });
    }
  },

  /**
   * Drop a table from the database
   */
  dropTable: (tableName: string) => {
    try {
      dbDropTable(tableName);
      get().refreshSchema();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to drop table';
      set({ error: message });
    }
  },

  /**
   * Import CSV data into a table
   * If the table doesn't exist, it will be created with inferred schema
   */
  importCsv: (tableName: string, csv: string) => {
    try {
      dbImportCsv(tableName, csv);
      get().refreshSchema();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import CSV';
      set({ error: message });
    }
  },

  /**
   * Export the entire database as SQL statements
   */
  exportSql: (): string => {
    try {
      return exportAsSql();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export SQL';
      set({ error: message });
      return '';
    }
  },

  /**
   * Import SQL statements into the database
   * This will reset the database before importing
   */
  importSql: (sql: string) => {
    set({ isLoading: true, error: null });

    try {
      importFromSql(sql);
      const schema = getSchema();

      set({
        schema,
        currentPreset: null, // Clear preset since we're using custom SQL
        isLoading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import SQL';
      set({
        error: message,
        isLoading: false
      });
    }
  },

  /**
   * Reset the database to empty state
   */
  reset: () => {
    try {
      dbResetDatabase();

      set({
        schema: { tables: [] },
        currentPreset: null,
        error: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset database';
      set({ error: message });
    }
  },

  /**
   * Clear the current error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Save the current database state to localStorage
   * Exports the database as SQL and stores it with metadata
   */
  saveDatabaseState: () => {
    try {
      const sql = exportAsSql();
      const state = get();

      const persistedState = {
        sql,
        presetId: state.currentPreset?.id ?? null,
        savedAt: new Date().toISOString()
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(DB_PERSISTENCE_KEY, JSON.stringify(persistedState));
      }
    } catch (error) {
      console.error('[SQLens] Failed to save database state:', error);
    }
  },

  /**
   * Load saved database state from localStorage
   * Returns true if state was loaded, false otherwise
   */
  loadSavedDatabaseState: async () => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }

      const saved = localStorage.getItem(DB_PERSISTENCE_KEY);
      if (!saved) {
        return false;
      }

      const persistedState = JSON.parse(saved);
      if (!persistedState.sql) {
        return false;
      }

      // Reset and import the saved SQL
      dbResetDatabase();
      executeStatements(persistedState.sql);

      // Refresh schema
      const schema = getSchema();

      // Try to restore the preset reference if it still exists
      const preset = persistedState.presetId
        ? databases.find(p => p.id === persistedState.presetId) ?? null
        : null;

      set({
        schema,
        currentPreset: preset,
        error: null
      });

      return true;
    } catch (error) {
      console.error('[SQLens] Failed to load saved database state:', error);
      return false;
    }
  },

  /**
   * Check if there's a saved database state in localStorage
   */
  hasSavedDatabaseState: () => {
    if (typeof window === 'undefined') {
      return false;
    }

    const saved = localStorage.getItem(DB_PERSISTENCE_KEY);
    if (!saved) {
      return false;
    }

    try {
      const persistedState = JSON.parse(saved);
      return !!persistedState.sql;
    } catch {
      return false;
    }
  },

  /**
   * Clear saved database state from localStorage
   */
  clearSavedDatabaseState: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DB_PERSISTENCE_KEY);
    }
  }
}));

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

/**
 * Get table names from the current schema
 */
export function useTableNames(): string[] {
  const schema = useDatabaseStore(state => state.schema);
  return schema?.tables.map(t => t.name) ?? [];
}

/**
 * Get a specific table by name
 */
export function useTable(tableName: string): Table | undefined {
  const schema = useDatabaseStore(state => state.schema);
  return schema?.tables.find(t => t.name === tableName);
}

/**
 * Check if database is ready for queries
 */
export function useIsDatabaseReady(): boolean {
  return useDatabaseStore(state => state.isInitialized && !state.isLoading);
}

/**
 * Get example queries for the current preset
 */
export function useExampleQueries() {
  const preset = useDatabaseStore(state => state.currentPreset);
  return preset?.exampleQueries ?? [];
}
