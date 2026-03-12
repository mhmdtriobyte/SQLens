/**
 * @fileoverview Components barrel export for SQLens
 *
 * This module re-exports all UI components for convenient importing.
 *
 * @module components
 *
 * @example
 * ```typescript
 * // Import specific components
 * import { SchemaPanel, TableCard, ResultsTable, DataTable } from '@/components';
 *
 * // Import from specific module
 * import { SchemaPanel } from '@/components/SchemaPanel';
 * import { ResultsTable } from '@/components/Results';
 * ```
 */

// ============================================================================
// Schema Panel Components
// ============================================================================

export {
  SchemaPanel,
  TableCard,
  RelationshipLines,
} from './SchemaPanel';

// Re-export types
export type {
  Connection,
  ConnectionPositions,
} from './SchemaPanel';

// ============================================================================
// Results Panel Components
// ============================================================================

export {
  ResultsTable,
  ResultsInfo,
} from './Results';

// ============================================================================
// Shared Components
// ============================================================================

export {
  DataTable,
  ThemeToggle,
  HelpOverlay,
  KeyboardShortcuts,
} from './shared';

// ============================================================================
// File Manager Components
// ============================================================================

export { FileManager } from './FileManager';
