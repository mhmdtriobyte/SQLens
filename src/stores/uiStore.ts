/**
 * @fileoverview UI state management store for SQLens.
 *
 * This store manages all UI-related state including theme preferences,
 * panel visibility, zoom levels, and selected elements.
 *
 * @module stores/uiStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/**
 * Available theme options for the application.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Panel identifiers for visibility management.
 */
export type PanelId = 'editor' | 'plan' | 'results' | 'schema';

// ============================================================================
// Store State Interface
// ============================================================================

/**
 * State interface for the UI store.
 */
interface UIStoreState {
  /**
   * Current theme preference.
   */
  theme: Theme;

  /**
   * Visibility state for each panel.
   */
  panelVisibility: Record<PanelId, boolean>;

  /**
   * Zoom level for the plan tree visualization.
   */
  planTreeZoom: number;

  /**
   * ID of the currently selected plan node.
   * Null if no node is selected.
   */
  selectedNodeId: string | null;

  /**
   * Whether the schema sidebar is expanded.
   */
  schemaSidebarExpanded: boolean;

  /**
   * Currently expanded table names in the schema browser.
   */
  expandedTables: string[];

  /**
   * Whether the editor is in fullscreen mode.
   */
  editorFullscreen: boolean;

  /**
   * Font size for the code editor.
   */
  editorFontSize: number;

  /**
   * Whether to show line numbers in the editor.
   */
  showLineNumbers: boolean;

  /**
   * Whether to show the minimap in the plan tree.
   */
  showMinimap: boolean;

  /**
   * ID of the currently active database preset.
   */
  activePresetId: string | null;

  /**
   * Whether the help overlay is currently visible.
   */
  showHelp: boolean;

  /**
   * Whether the user has seen the help overlay before.
   */
  hasSeenHelp: boolean;

  /**
   * Whether keyboard shortcuts are enabled globally.
   */
  keyboardShortcutsEnabled: boolean;

  /**
   * Whether the query library dropdown is visible.
   */
  showQueryLibrary: boolean;

  /**
   * Height of the results panel in pixels.
   */
  resultsPanelHeight: number;

  /**
   * Width of the schema panel in pixels.
   */
  schemaPanelWidth: number;

  /**
   * Height of the editor panel in pixels.
   */
  editorPanelHeight: number;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

/**
 * Actions interface for the UI store.
 */
interface UIStoreActions {
  /**
   * Sets the theme preference.
   */
  setTheme: (theme: Theme) => void;

  /**
   * Toggles between light and dark themes.
   */
  toggleTheme: () => void;

  /**
   * Toggles visibility of a specific panel.
   */
  togglePanel: (panelId: PanelId) => void;

  /**
   * Sets the plan tree zoom level.
   */
  setPlanTreeZoom: (zoom: number) => void;

  /**
   * Sets the selected plan node ID.
   */
  setSelectedNodeId: (nodeId: string | null) => void;

  /**
   * Toggles the schema sidebar expanded state.
   */
  toggleSchemaSidebar: () => void;

  /**
   * Toggles whether a table is expanded in the schema browser.
   */
  toggleTableExpanded: (tableName: string) => void;

  /**
   * Sets the editor fullscreen state.
   */
  setEditorFullscreen: (fullscreen: boolean) => void;

  /**
   * Sets the editor font size.
   */
  setEditorFontSize: (size: number) => void;

  /**
   * Toggles line numbers visibility in the editor.
   */
  toggleLineNumbers: () => void;

  /**
   * Toggles minimap visibility in the plan tree.
   */
  toggleMinimap: () => void;

  /**
   * Sets the active database preset ID.
   */
  setActivePresetId: (presetId: string | null) => void;

  /**
   * Sets the help overlay visibility.
   */
  setShowHelp: (show: boolean) => void;

  /**
   * Marks the help overlay as having been seen.
   */
  markHelpAsSeen: () => void;

  /**
   * Sets whether keyboard shortcuts are enabled.
   */
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;

  /**
   * Resets UI state to defaults.
   */
  resetUI: () => void;

  /**
   * Sets the query library dropdown visibility.
   */
  setShowQueryLibrary: (show: boolean) => void;

  /**
   * Toggles the query library dropdown visibility.
   */
  toggleQueryLibrary: () => void;

  /**
   * Sets the results panel height in pixels.
   */
  setResultsPanelHeight: (height: number) => void;

  /**
   * Sets the schema panel width in pixels.
   */
  setSchemaPanelWidth: (width: number) => void;

  /**
   * Sets the editor panel height in pixels.
   */
  setEditorPanelHeight: (height: number) => void;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial state for the UI store.
 */
const initialState: UIStoreState = {
  theme: 'system',
  panelVisibility: {
    editor: true,
    plan: true,
    results: true,
    schema: true,
  },
  planTreeZoom: 1,
  selectedNodeId: null,
  schemaSidebarExpanded: true,
  expandedTables: [],
  editorFullscreen: false,
  editorFontSize: 14,
  showLineNumbers: true,
  showMinimap: true,
  activePresetId: null,
  showHelp: false,
  hasSeenHelp: false,
  keyboardShortcutsEnabled: true,
  showQueryLibrary: false,
  resultsPanelHeight: 250,
  schemaPanelWidth: 280,
  editorPanelHeight: 200,
};

// ============================================================================
// Store Definition
// ============================================================================

/**
 * UI state management store with persistence.
 *
 * Manages all UI-related state including:
 * - Theme preferences (light/dark/system)
 * - Panel visibility states
 * - Plan tree zoom and selection
 * - Editor preferences
 *
 * State is persisted to localStorage for consistency across sessions.
 *
 * @example
 * ```typescript
 * import { useUIStore } from '@/stores';
 *
 * function ThemeToggle() {
 *   const { theme, setTheme } = useUIStore();
 *
 *   return (
 *     <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
 *       Toggle Theme
 *     </button>
 *   );
 * }
 * ```
 */
export const useUIStore = create<UIStoreState & UIStoreActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      setTheme: (theme: Theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      togglePanel: (panelId: PanelId) =>
        set((state) => ({
          panelVisibility: {
            ...state.panelVisibility,
            [panelId]: !state.panelVisibility[panelId],
          },
        })),

      setPlanTreeZoom: (zoom: number) => set({ planTreeZoom: zoom }),

      setSelectedNodeId: (nodeId: string | null) => set({ selectedNodeId: nodeId }),

      toggleSchemaSidebar: () =>
        set((state) => ({ schemaSidebarExpanded: !state.schemaSidebarExpanded })),

      toggleTableExpanded: (tableName: string) =>
        set((state) => {
          const expanded = state.expandedTables.includes(tableName)
            ? state.expandedTables.filter((t) => t !== tableName)
            : [...state.expandedTables, tableName];
          return { expandedTables: expanded };
        }),

      setEditorFullscreen: (fullscreen: boolean) => set({ editorFullscreen: fullscreen }),

      setEditorFontSize: (size: number) => set({ editorFontSize: size }),

      toggleLineNumbers: () =>
        set((state) => ({ showLineNumbers: !state.showLineNumbers })),

      toggleMinimap: () =>
        set((state) => ({ showMinimap: !state.showMinimap })),

      setActivePresetId: (presetId: string | null) => set({ activePresetId: presetId }),

      setShowHelp: (show: boolean) => set({ showHelp: show }),

      markHelpAsSeen: () => set({ hasSeenHelp: true }),

      setKeyboardShortcutsEnabled: (enabled: boolean) =>
        set({ keyboardShortcutsEnabled: enabled }),

      resetUI: () => set(initialState),

      setShowQueryLibrary: (show: boolean) => set({ showQueryLibrary: show }),

      toggleQueryLibrary: () =>
        set((state) => ({ showQueryLibrary: !state.showQueryLibrary })),

      setResultsPanelHeight: (height: number) => set({ resultsPanelHeight: height }),

      setSchemaPanelWidth: (width: number) => set({ schemaPanelWidth: width }),

      setEditorPanelHeight: (height: number) => set({ editorPanelHeight: height }),
    }),
    {
      name: 'sqlens-ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        editorFontSize: state.editorFontSize,
        showLineNumbers: state.showLineNumbers,
        showMinimap: state.showMinimap,
        schemaSidebarExpanded: state.schemaSidebarExpanded,
        hasSeenHelp: state.hasSeenHelp,
        keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
        schemaPanelWidth: state.schemaPanelWidth,
        resultsPanelHeight: state.resultsPanelHeight,
        editorPanelHeight: state.editorPanelHeight,
      }),
    }
  )
);
