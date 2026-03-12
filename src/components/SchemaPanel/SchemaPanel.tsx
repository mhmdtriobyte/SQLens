'use client';

/**
 * @fileoverview Schema Panel component for SQLens
 *
 * This component displays the database schema structure including:
 * - Database preset selector dropdown
 * - List of tables with their columns
 * - Visual relationship indicators
 * - Import/Export/Reset toolbar
 *
 * @module components/SchemaPanel
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { Table, DatabasePreset, Schema } from '@/types';
import { TableCard } from './TableCard';
import { RelationshipLines } from './RelationshipLines';
import {
  ChevronDown,
  Database,
  Upload,
  Download,
  RefreshCw,
  AlertCircle,
  Search,
  X,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/utils';

// ============================================================================
// Types
// ============================================================================

interface SchemaPanelProps {
  /** Current database schema */
  schema?: Schema | null;
  /** Currently selected preset */
  currentPreset?: DatabasePreset | null;
  /** List of available database presets */
  availablePresets?: DatabasePreset[];
  /** Whether schema is loading */
  isLoading?: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Panel width in pixels or CSS value */
  width?: number | string;
  /** Callback when a preset is selected */
  onPresetChange?: (presetId: string) => void;
  /** Callback for CSV import */
  onImportCsv?: (file: File) => void;
  /** Callback for SQL export */
  onExportSql?: () => string;
  /** Callback for SQL import */
  onImportSql?: (sql: string) => void;
  /** Callback to reset database */
  onReset?: () => void;
  /** Callback when a table is selected */
  onTableSelect?: (tableName: string) => void;
  /** Currently selected table name */
  selectedTable?: string | null;
  /** Whether table persistence is enabled */
  persistTables?: boolean;
  /** Callback when persist tables toggle changes */
  onPersistTablesChange?: (enabled: boolean) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// ============================================================================
// Component
// ============================================================================

/**
 * Schema Panel displays the database structure in a collapsible side panel.
 *
 * Features:
 * - Database preset dropdown selector
 * - Searchable table list
 * - Expandable table cards with column details
 * - Visual indicators for primary and foreign keys
 * - Import CSV / Export SQL functionality
 * - Reset database to initial state
 *
 * @example
 * ```tsx
 * <SchemaPanel
 *   schema={databaseSchema}
 *   currentPreset={selectedPreset}
 *   availablePresets={presets}
 *   onPresetChange={handlePresetChange}
 *   onTableSelect={handleTableSelect}
 * />
 * ```
 */
export function SchemaPanel({
  schema,
  currentPreset,
  availablePresets = [],
  isLoading = false,
  error = null,
  width = DEFAULT_WIDTH,
  onPresetChange,
  onImportCsv,
  onExportSql,
  onImportSql,
  onReset,
  onTableSelect,
  selectedTable,
  persistTables = false,
  onPersistTablesChange,
}: SchemaPanelProps) {
  // ========================================
  // State
  // ========================================

  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ========================================
  // Computed Values
  // ========================================

  const panelWidth = useMemo(() => {
    if (typeof width === 'number') {
      return Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH);
    }
    return width;
  }, [width]);

  const filteredTables = useMemo(() => {
    if (!schema?.tables) return [];

    if (!searchQuery.trim()) return schema.tables;

    const query = searchQuery.toLowerCase();
    return schema.tables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.columns.some((col) => col.name.toLowerCase().includes(query))
    );
  }, [schema?.tables, searchQuery]);

  const tableCount = schema?.tables.length ?? 0;
  const relationshipCount = useMemo(() => {
    if (!schema?.tables) return 0;
    return schema.tables.reduce(
      (count, table) => count + (table.foreignKeys?.length ?? 0),
      0
    );
  }, [schema?.tables]);

  // ========================================
  // Handlers
  // ========================================

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      onPresetChange?.(presetId);
      setShowPresetDropdown(false);
      setSearchQuery('');
    },
    [onPresetChange]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setImportError('Please select a CSV file');
        return;
      }

      // Clear previous error
      setImportError(null);

      // Call import handler
      onImportCsv?.(file);

      // Reset input for future imports
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onImportCsv]
  );

  const handleExportSql = useCallback(() => {
    const sql = onExportSql?.();
    if (!sql) return;

    // Create and download file
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentPreset?.name ?? 'database'}_export.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [onExportSql, currentPreset?.name]);

  const handleReset = useCallback(() => {
    onReset?.();
    setSearchQuery('');
    setImportError(null);
  }, [onReset]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ========================================
  // Render Helpers
  // ========================================

  const renderHeader = () => (
    <div className="p-3 border-b border-[rgb(var(--color-border))]">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-foreground))]">
          <Database className="w-4 h-4 text-[rgb(var(--color-brand-primary))]" />
          <span>Schema</span>
        </div>
        {/* Stats badges */}
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-syntax-comment))]">
          <span className="px-1.5 py-0.5 bg-[rgb(var(--color-surface))] rounded">
            {tableCount} tables
          </span>
          {relationshipCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[rgb(var(--color-surface))] rounded">
              {relationshipCount} FKs
            </span>
          )}
        </div>
      </div>

      {/* Database preset selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowPresetDropdown(!showPresetDropdown)}
          disabled={isLoading}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2',
            'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]',
            'rounded-md text-sm transition-colors',
            'hover:border-[rgb(var(--color-brand-primary))]',
            'focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-brand-primary))]/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <span className="truncate">
            {currentPreset?.name ?? 'Select Database'}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-[rgb(var(--color-syntax-comment))] transition-transform',
              showPresetDropdown && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown menu */}
        {showPresetDropdown && availablePresets.length > 0 && (
          <div
            className={cn(
              'absolute z-20 w-full mt-1',
              'bg-[rgb(var(--color-surface-elevated))]',
              'border border-[rgb(var(--color-border))]',
              'rounded-md shadow-lg overflow-hidden',
              'animate-[slideDown_0.15s_ease-out]'
            )}
          >
            {availablePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm',
                  'transition-colors',
                  'hover:bg-[rgb(var(--color-brand-primary))]/10',
                  currentPreset?.id === preset.id &&
                    'bg-[rgb(var(--color-brand-primary))]/20'
                )}
              >
                <div className="font-medium text-[rgb(var(--color-foreground))]">
                  {preset.name}
                </div>
                {preset.description && (
                  <div className="text-xs text-[rgb(var(--color-syntax-comment))] truncate mt-0.5">
                    {preset.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search input */}
      {tableCount > 3 && (
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--color-syntax-comment))]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className={cn(
              'w-full pl-8 pr-8 py-1.5',
              'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]',
              'rounded-md text-sm',
              'placeholder:text-[rgb(var(--color-syntax-comment))]',
              'focus:outline-none focus:border-[rgb(var(--color-brand-primary))]'
            )}
          />
          {searchQuery && (
            <button
              onClick={handleSearchClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[rgb(var(--color-syntax-comment))] hover:text-[rgb(var(--color-foreground))]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Persist Tables Toggle */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-syntax-comment))]">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Persist Tables</span>
        </div>
        <button
          onClick={() => onPersistTablesChange?.(!persistTables)}
          className={cn(
            'relative w-8 h-4 rounded-full transition-colors',
            persistTables
              ? 'bg-[rgb(var(--color-brand-primary))]'
              : 'bg-[rgb(var(--color-border))]'
          )}
          title={persistTables ? 'Tables will be saved across sessions' : 'Tables will not persist'}
        >
          <span
            className={cn(
              'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
              persistTables ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-lg overflow-hidden',
            'bg-[rgb(var(--color-surface))]',
            'border border-[rgb(var(--color-border))]'
          )}
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[rgb(var(--color-border))]">
            <div className="w-4 h-4 rounded bg-[rgb(var(--color-border))] animate-pulse" />
            <div
              className="h-4 rounded bg-[rgb(var(--color-border))] animate-pulse"
              style={{ width: `${60 + i * 10}%` }}
            />
          </div>
          {/* Column skeletons */}
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <div
                  className="h-3 rounded bg-[rgb(var(--color-border))] animate-pulse"
                  style={{ width: `${40 + j * 15}%` }}
                />
                <div className="ml-auto h-3 w-12 rounded bg-[rgb(var(--color-border))] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderErrorState = () => (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 text-center',
        'text-[rgb(var(--color-syntax-comment))]'
      )}
    >
      <AlertCircle className="w-8 h-8 text-red-500" />
      <div>
        <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
          Failed to load schema
        </p>
        <p className="text-xs mt-1">{error}</p>
      </div>
      <button
        onClick={handleReset}
        className={cn(
          'px-3 py-1.5 text-xs rounded-md',
          'bg-[rgb(var(--color-brand-primary))]/10',
          'text-[rgb(var(--color-brand-primary))]',
          'hover:bg-[rgb(var(--color-brand-primary))]/20',
          'transition-colors'
        )}
      >
        Try Again
      </button>
    </div>
  );

  const renderEmptyState = () => (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 text-center',
        'text-[rgb(var(--color-syntax-comment))]'
      )}
    >
      <Database className="w-8 h-8 opacity-50" />
      <div>
        <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
          No tables found
        </p>
        <p className="text-xs mt-1">
          {searchQuery
            ? 'Try a different search term'
            : 'Select a database preset to get started'}
        </p>
      </div>
    </div>
  );

  const renderTableList = () => (
    <>
      <RelationshipLines tables={filteredTables} />
      {filteredTables.map((table) => (
        <TableCard
          key={table.name}
          table={table}
          isSelected={selectedTable === table.name}
          onSelect={() => onTableSelect?.(table.name)}
        />
      ))}
    </>
  );

  const renderFooterToolbar = () => (
    <div className="p-2 border-t border-[rgb(var(--color-border))] flex items-center justify-between">
      <div className="flex items-center gap-1">
        {/* Import CSV button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded transition-colors',
            'text-[rgb(var(--color-syntax-comment))]',
            'hover:text-[rgb(var(--color-foreground))]',
            'hover:bg-[rgb(var(--color-brand-primary))]/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Import CSV"
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* Export SQL button */}
        <button
          onClick={handleExportSql}
          disabled={isLoading || !schema?.tables.length}
          className={cn(
            'p-1.5 rounded transition-colors',
            'text-[rgb(var(--color-syntax-comment))]',
            'hover:text-[rgb(var(--color-foreground))]',
            'hover:bg-[rgb(var(--color-brand-primary))]/10',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Export SQL"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        disabled={isLoading || !currentPreset}
        className={cn(
          'p-1.5 rounded transition-colors',
          'text-[rgb(var(--color-syntax-comment))]',
          'hover:text-[rgb(var(--color-foreground))]',
          'hover:bg-[rgb(var(--color-brand-primary))]/10',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Reset Database"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );

  // ========================================
  // Main Render
  // ========================================

  return (
    <div
      className={cn(
        'h-full flex flex-col',
        'bg-[rgb(var(--color-surface))]',
        'border-l border-[rgb(var(--color-border))]',
        'transition-all duration-200'
      )}
      style={{
        width: typeof panelWidth === 'number' ? `${panelWidth}px` : panelWidth,
      }}
    >
      {/* Header with preset selector */}
      {renderHeader()}

      {/* Import error message */}
      {importError && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-500 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{importError}</span>
          <button
            onClick={() => setImportError(null)}
            className="ml-auto hover:text-red-400"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Table list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {isLoading && renderLoadingState()}
        {!isLoading && error && renderErrorState()}
        {!isLoading && !error && filteredTables.length === 0 && renderEmptyState()}
        {!isLoading && !error && filteredTables.length > 0 && renderTableList()}
      </div>

      {/* Footer toolbar */}
      {renderFooterToolbar()}
    </div>
  );
}
