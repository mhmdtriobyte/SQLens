/**
 * SQLens State Management Stores
 *
 * Central export point for all Zustand stores providing
 * a single import point for consumers.
 *
 * @module stores
 *
 * @example
 * ```typescript
 * import { useQueryStore, useUIStore, useDatabaseStore } from '@/stores';
 *
 * function MyComponent() {
 *   const { query, setQuery } = useQueryStore();
 *   const { theme, setTheme } = useUIStore();
 *   const { schema, currentPreset } = useDatabaseStore();
 * }
 * ```
 */

// Query state management
export {
  useQueryStore,
  useCurrentStep,
  useIsFirstStep,
  useIsLastStep,
  useTotalSteps,
  useHasQueryPlan,
  useHasParseError
} from './queryStore';

// Database state management
export {
  useDatabaseStore,
  useTableNames,
  useTable,
  useIsDatabaseReady,
  useExampleQueries
} from './databaseStore';

// UI state management
export { useUIStore, type Theme, type PanelId } from './uiStore';
