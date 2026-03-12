'use client';

/**
 * @fileoverview TableCard component for displaying table schema information
 *
 * This component renders a collapsible card showing:
 * - Table name with expand/collapse toggle
 * - List of columns with type indicators
 * - Primary key and foreign key badges
 * - Column constraints (NOT NULL, UNIQUE)
 *
 * @module components/SchemaPanel/TableCard
 */

import { useState, useCallback, useMemo } from 'react';
import { Table, Column, ForeignKey } from '@/types';
import { cn } from '@/utils';
import {
  ChevronRight,
  Key,
  Link,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Table as TableIcon,
  Circle,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface TableCardProps {
  /** Table schema definition */
  table: Table;
  /** Whether this table is currently selected */
  isSelected?: boolean;
  /** Callback when table is selected/clicked */
  onSelect?: () => void;
  /** Initial expanded state */
  defaultExpanded?: boolean;
  /** Whether to show column constraints */
  showConstraints?: boolean;
}

interface ColumnRowProps {
  /** Column definition */
  column: Column;
  /** Whether this column is a primary key */
  isPrimaryKey: boolean;
  /** Foreign key reference if this column is a FK */
  foreignKey?: ForeignKey;
  /** Whether this is the last column in the list */
  isLast: boolean;
  /** Whether to show constraints */
  showConstraints?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  INT: 'text-[rgb(var(--color-syntax-number))]',
  INTEGER: 'text-[rgb(var(--color-syntax-number))]',
  REAL: 'text-[rgb(var(--color-syntax-number))]',
  TEXT: 'text-[rgb(var(--color-syntax-string))]',
  BOOLEAN: 'text-[rgb(var(--color-syntax-keyword))]',
  DATE: 'text-[rgb(var(--color-syntax-function))]',
  DATETIME: 'text-[rgb(var(--color-syntax-function))]',
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Returns the appropriate icon for a column data type
 */
function TypeIcon({ type }: { type: string }) {
  const upperType = type.toUpperCase();

  switch (upperType) {
    case 'INT':
    case 'INTEGER':
    case 'REAL':
      return <Hash className="w-3 h-3" />;
    case 'TEXT':
      return <Type className="w-3 h-3" />;
    case 'BOOLEAN':
      return <ToggleLeft className="w-3 h-3" />;
    case 'DATE':
    case 'DATETIME':
      return <Calendar className="w-3 h-3" />;
    default:
      return <Type className="w-3 h-3" />;
  }
}

/**
 * Renders a single column row with all its metadata
 */
function ColumnRow({
  column,
  isPrimaryKey,
  foreignKey,
  isLast,
  showConstraints = false,
}: ColumnRowProps) {
  const typeColorClass = TYPE_COLORS[column.type.toUpperCase()] ?? 'text-[rgb(var(--color-syntax-comment))]';

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 text-sm',
        'hover:bg-[rgb(var(--color-brand-primary))]/5',
        'transition-colors',
        !isLast && 'border-b border-[rgb(var(--color-border))]/50'
      )}
    >
      {/* Column name */}
      <span
        className={cn(
          'font-mono flex-1 truncate text-xs',
          isPrimaryKey && 'text-amber-500 font-medium'
        )}
        title={column.name}
      >
        {column.name}
      </span>

      {/* Constraint indicators */}
      {showConstraints && (
        <div className="flex items-center gap-1">
          {column.notNull && (
            <span
              className="text-[10px] text-[rgb(var(--color-syntax-comment))] opacity-60"
              title="NOT NULL"
            >
              NN
            </span>
          )}
          {column.unique && !isPrimaryKey && (
            <span
              className="text-[10px] text-[rgb(var(--color-syntax-comment))] opacity-60"
              title="UNIQUE"
            >
              UQ
            </span>
          )}
        </div>
      )}

      {/* Key indicators */}
      <div className="flex items-center gap-1">
        {isPrimaryKey && (
          <span
            title="Primary Key"
            className="text-amber-500 flex-shrink-0"
          >
            <Key className="w-3 h-3" />
          </span>
        )}
        {foreignKey && (
          <span
            title={`Foreign Key: ${foreignKey.referencesTable}.${foreignKey.referencesColumn}`}
            className="text-[rgb(var(--color-brand-primary))] flex-shrink-0 cursor-help"
          >
            <Link className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Type badge */}
      <span
        className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono',
          'bg-[rgb(var(--color-surface-elevated))]',
          typeColorClass
        )}
      >
        <TypeIcon type={column.type} />
        <span>{column.type}</span>
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TableCard displays a collapsible card showing table schema information.
 *
 * Features:
 * - Expandable/collapsible column list
 * - Visual indicators for primary keys (golden key icon)
 * - Visual indicators for foreign keys (blue link icon with tooltip)
 * - Type badges with appropriate colors
 * - Column count badge
 * - Hover states and selection highlighting
 *
 * @example
 * ```tsx
 * <TableCard
 *   table={usersTable}
 *   isSelected={selectedTable === 'users'}
 *   onSelect={() => setSelectedTable('users')}
 * />
 * ```
 */
export function TableCard({
  table,
  isSelected = false,
  onSelect,
  defaultExpanded = true,
  showConstraints = false,
}: TableCardProps) {
  // ========================================
  // State
  // ========================================

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // ========================================
  // Computed Values
  // ========================================

  const primaryKeyColumns = useMemo(() => {
    const pkSet = new Set<string>();

    // From table.primaryKey array
    table.primaryKey?.forEach((col) => pkSet.add(col));

    // From column.primaryKey flag
    table.columns.forEach((col) => {
      if (col.primaryKey) pkSet.add(col.name);
    });

    return pkSet;
  }, [table.primaryKey, table.columns]);

  const foreignKeyMap = useMemo(() => {
    const map = new Map<string, ForeignKey>();
    table.foreignKeys?.forEach((fk) => {
      map.set(fk.column, fk);
    });
    return map;
  }, [table.foreignKeys]);

  const columnCount = table.columns.length;
  const fkCount = table.foreignKeys?.length ?? 0;

  // ========================================
  // Handlers
  // ========================================

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger select when clicking the expand toggle
      if ((e.target as HTMLElement).closest('[data-toggle]')) {
        return;
      }
      onSelect?.();
    },
    [onSelect]
  );

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden transition-all duration-200',
        'bg-[rgb(var(--color-surface-elevated))]',
        'border',
        isSelected
          ? 'border-[rgb(var(--color-brand-primary))] shadow-[0_0_0_1px_rgb(var(--color-brand-primary))]'
          : 'border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border-subtle))]'
      )}
      onClick={handleSelect}
    >
      {/* Header */}
      <button
        data-toggle
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'hover:bg-[rgb(var(--color-brand-primary))]/5',
          'transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset',
          'focus-visible:ring-[rgb(var(--color-brand-primary))]/50'
        )}
      >
        {/* Expand/collapse chevron */}
        <ChevronRight
          className={cn(
            'w-4 h-4 text-[rgb(var(--color-syntax-comment))] transition-transform duration-200',
            isExpanded && 'rotate-90'
          )}
        />

        {/* Table icon */}
        <TableIcon className="w-4 h-4 text-[rgb(var(--color-syntax-table))]" />

        {/* Table name */}
        <span className="font-mono text-sm font-medium text-[rgb(var(--color-foreground))] flex-1 text-left truncate">
          {table.name}
        </span>

        {/* Metadata badges */}
        <div className="flex items-center gap-1.5">
          {/* Column count */}
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              'bg-[rgb(var(--color-surface))]',
              'text-[rgb(var(--color-syntax-comment))]'
            )}
            title={`${columnCount} column${columnCount !== 1 ? 's' : ''}`}
          >
            {columnCount} col{columnCount !== 1 ? 's' : ''}
          </span>

          {/* FK count badge */}
          {fkCount > 0 && (
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                'bg-[rgb(var(--color-brand-primary))]/10',
                'text-[rgb(var(--color-brand-primary))]'
              )}
              title={`${fkCount} foreign key${fkCount !== 1 ? 's' : ''}`}
            >
              {fkCount} FK
            </span>
          )}
        </div>
      </button>

      {/* Column list */}
      {isExpanded && (
        <div className="border-t border-[rgb(var(--color-border))]">
          {table.columns.map((column, idx) => (
            <ColumnRow
              key={column.name}
              column={column}
              isPrimaryKey={primaryKeyColumns.has(column.name)}
              foreignKey={foreignKeyMap.get(column.name)}
              isLast={idx === table.columns.length - 1}
              showConstraints={showConstraints}
            />
          ))}
        </div>
      )}

      {/* Foreign key references - shown when expanded */}
      {isExpanded && fkCount > 0 && (
        <div className="border-t border-[rgb(var(--color-border))] px-3 py-2 bg-[rgb(var(--color-surface))]">
          <div className="text-[10px] font-medium text-[rgb(var(--color-syntax-comment))] mb-1.5 uppercase tracking-wider">
            References
          </div>
          <div className="space-y-1">
            {table.foreignKeys?.map((fk) => (
              <div
                key={`${fk.column}-${fk.referencesTable}-${fk.referencesColumn}`}
                className="flex items-center gap-1.5 text-[11px] font-mono"
              >
                <Circle className="w-1.5 h-1.5 fill-current text-[rgb(var(--color-brand-primary))]" />
                <span className="text-[rgb(var(--color-syntax-column))]">
                  {fk.column}
                </span>
                <span className="text-[rgb(var(--color-syntax-operator))]">
                  {' -> '}
                </span>
                <span className="text-[rgb(var(--color-syntax-table))]">
                  {fk.referencesTable}
                </span>
                <span className="text-[rgb(var(--color-syntax-comment))]">.</span>
                <span className="text-[rgb(var(--color-syntax-column))]">
                  {fk.referencesColumn}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
