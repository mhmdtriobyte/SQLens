/**
 * @fileoverview FileManager component exports
 *
 * This module exports the FileManager component which provides
 * an IDE-style file explorer for SQL files in SQLens.
 *
 * @module components/FileManager
 *
 * @example
 * ```typescript
 * import { FileManager } from '@/components/FileManager';
 *
 * function App() {
 *   return <FileManager width={250} />;
 * }
 * ```
 */

// ============================================================================
// Component Exports
// ============================================================================

/**
 * Main file manager component for SQL file management.
 * Provides create, rename, delete, and file switching functionality.
 */
export { FileManager } from './FileManager';
