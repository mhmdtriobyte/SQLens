/**
 * @fileoverview Editor components barrel export for SQLens.
 *
 * This module re-exports all editor-related components for convenient importing.
 *
 * @module components/Editor
 *
 * @example
 * ```typescript
 * import { QueryEditor, QueryLibrary, ErrorDisplay } from '@/components/Editor';
 *
 * function App() {
 *   return (
 *     <div>
 *       <QueryEditor />
 *     </div>
 *   );
 * }
 * ```
 */

// Query Editor - Main SQL editor component
export { QueryEditor } from './QueryEditor';

// Query Library - Example queries dropdown
export { QueryLibrary } from './QueryLibrary';

// Error Display - Parse error display component
export { ErrorDisplay, InlineError } from './ErrorDisplay';
