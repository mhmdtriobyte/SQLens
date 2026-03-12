/**
 * @fileoverview Schema Panel component exports
 *
 * This module exports all components related to the schema panel,
 * which displays the database structure in the SQLens application.
 *
 * @module components/SchemaPanel
 *
 * @example
 * ```typescript
 * // Import the main component
 * import { SchemaPanel } from '@/components/SchemaPanel';
 *
 * // Import specific sub-components
 * import { TableCard, RelationshipLines } from '@/components/SchemaPanel';
 * ```
 */

// ============================================================================
// Component Exports
// ============================================================================

/**
 * Main schema panel component that displays database structure.
 * Includes preset selector, table list, and toolbar.
 */
export { SchemaPanel } from './SchemaPanel';

/**
 * Individual table card component showing table name and columns.
 * Supports expand/collapse and displays key indicators.
 */
export { TableCard } from './TableCard';

/**
 * SVG relationship line renderer for foreign key visualization.
 * Draws curved lines between related tables.
 */
export { RelationshipLines } from './RelationshipLines';

// ============================================================================
// Type Exports
// ============================================================================

// Export types used by RelationshipLines for testing and extension
export type { Connection, ConnectionPositions } from './RelationshipLines';
