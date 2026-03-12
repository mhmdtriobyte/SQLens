/**
 * @fileoverview File management store for SQLens.
 *
 * This store manages SQL files stored in localStorage, providing
 * functionality for creating, editing, saving, and organizing SQL files.
 *
 * @module stores/fileStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/**
 * SQL file structure stored in localStorage.
 */
export interface SqlFile {
  /** Unique identifier for the file */
  id: string;
  /** Display name of the file (without .sql extension) */
  name: string;
  /** SQL content of the file */
  content: string;
  /** ISO timestamp when file was created */
  createdAt: string;
  /** ISO timestamp when file was last updated */
  updatedAt: string;
}

// ============================================================================
// Store State Interface
// ============================================================================

/**
 * State interface for the file store.
 */
interface FileStoreState {
  /**
   * List of all saved SQL files.
   */
  files: SqlFile[];

  /**
   * ID of the currently active/open file.
   * Null if no file is selected.
   */
  activeFileId: string | null;

  /**
   * Whether the file panel is expanded.
   */
  isPanelExpanded: boolean;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

/**
 * Actions interface for the file store.
 */
interface FileStoreActions {
  /**
   * Creates a new SQL file with optional initial content.
   * @param name - File name (without .sql extension)
   * @param content - Initial SQL content
   * @returns The created file
   */
  createFile: (name?: string, content?: string) => SqlFile;

  /**
   * Updates the content of an existing file.
   * @param id - File ID
   * @param content - New SQL content
   */
  updateFileContent: (id: string, content: string) => void;

  /**
   * Renames an existing file.
   * @param id - File ID
   * @param newName - New file name (without .sql extension)
   */
  renameFile: (id: string, newName: string) => void;

  /**
   * Deletes a file by ID.
   * @param id - File ID to delete
   */
  deleteFile: (id: string) => void;

  /**
   * Sets the active file by ID.
   * @param id - File ID or null to deselect
   */
  setActiveFile: (id: string | null) => void;

  /**
   * Gets a file by its ID.
   * @param id - File ID
   * @returns The file or undefined if not found
   */
  getFileById: (id: string) => SqlFile | undefined;

  /**
   * Gets the currently active file.
   * @returns The active file or null if none selected
   */
  getActiveFile: () => SqlFile | null;

  /**
   * Duplicates an existing file.
   * @param id - File ID to duplicate
   * @returns The new duplicated file or null if original not found
   */
  duplicateFile: (id: string) => SqlFile | null;

  /**
   * Toggles the file panel expanded/collapsed state.
   */
  togglePanel: () => void;

  /**
   * Sets the panel expanded state.
   */
  setPanelExpanded: (expanded: boolean) => void;

  /**
   * Resets the file store to initial state.
   */
  reset: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID for a new file.
 */
function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates a unique file name based on existing files.
 */
function generateUniqueName(files: SqlFile[], baseName: string = 'Untitled'): string {
  const existingNames = new Set(files.map(f => f.name.toLowerCase()));

  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 1;
  let candidateName = `${baseName} ${counter}`;

  while (existingNames.has(candidateName.toLowerCase())) {
    counter++;
    candidateName = `${baseName} ${counter}`;
  }

  return candidateName;
}

/**
 * Gets the current ISO timestamp.
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial state for the file store.
 */
const initialState: FileStoreState = {
  files: [],
  activeFileId: null,
  isPanelExpanded: true,
};

// ============================================================================
// Store Definition
// ============================================================================

/**
 * File management store with localStorage persistence.
 *
 * Manages all SQL file operations including:
 * - Creating new files
 * - Editing and saving file content
 * - Renaming and deleting files
 * - Tracking the active file
 *
 * State is persisted to localStorage for consistency across sessions.
 *
 * @example
 * ```typescript
 * import { useFileStore } from '@/stores';
 *
 * function FileExplorer() {
 *   const { files, activeFileId, createFile, setActiveFile } = useFileStore();
 *
 *   const handleNewFile = () => {
 *     const file = createFile('MyQuery');
 *     setActiveFile(file.id);
 *   };
 *
 *   return (
 *     <div>
 *       {files.map(file => (
 *         <div
 *           key={file.id}
 *           onClick={() => setActiveFile(file.id)}
 *           className={file.id === activeFileId ? 'active' : ''}
 *         >
 *           {file.name}.sql
 *         </div>
 *       ))}
 *       <button onClick={handleNewFile}>New File</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useFileStore = create<FileStoreState & FileStoreActions>()(
  persist(
    (set, get) => ({
      // State
      ...initialState,

      // Actions
      createFile: (name?: string, content: string = '') => {
        const { files } = get();
        const fileName = name || generateUniqueName(files);
        const timestamp = getCurrentTimestamp();

        const newFile: SqlFile = {
          id: generateId(),
          name: fileName,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          files: [...state.files, newFile],
          activeFileId: newFile.id,
        }));

        return newFile;
      },

      updateFileContent: (id: string, content: string) => {
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? { ...file, content, updatedAt: getCurrentTimestamp() }
              : file
          ),
        }));
      },

      renameFile: (id: string, newName: string) => {
        const trimmedName = newName.trim();
        if (!trimmedName) return;

        set((state) => ({
          files: state.files.map((file) =>
            file.id === id
              ? { ...file, name: trimmedName, updatedAt: getCurrentTimestamp() }
              : file
          ),
        }));
      },

      deleteFile: (id: string) => {
        set((state) => {
          const newFiles = state.files.filter((file) => file.id !== id);
          const newActiveId =
            state.activeFileId === id
              ? newFiles.length > 0
                ? newFiles[0]?.id ?? null
                : null
              : state.activeFileId;

          return {
            files: newFiles,
            activeFileId: newActiveId,
          };
        });
      },

      setActiveFile: (id: string | null) => {
        set({ activeFileId: id });
      },

      getFileById: (id: string) => {
        return get().files.find((file) => file.id === id);
      },

      getActiveFile: () => {
        const { files, activeFileId } = get();
        if (!activeFileId) return null;
        return files.find((file) => file.id === activeFileId) ?? null;
      },

      duplicateFile: (id: string) => {
        const { files } = get();
        const original = files.find((file) => file.id === id);

        if (!original) return null;

        const newName = generateUniqueName(files, `${original.name} Copy`);
        const timestamp = getCurrentTimestamp();

        const duplicatedFile: SqlFile = {
          id: generateId(),
          name: newName,
          content: original.content,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          files: [...state.files, duplicatedFile],
          activeFileId: duplicatedFile.id,
        }));

        return duplicatedFile;
      },

      togglePanel: () => {
        set((state) => ({ isPanelExpanded: !state.isPanelExpanded }));
      },

      setPanelExpanded: (expanded: boolean) => {
        set({ isPanelExpanded: expanded });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'sqlens-files',
      partialize: (state) => ({
        files: state.files,
        activeFileId: state.activeFileId,
        isPanelExpanded: state.isPanelExpanded,
      }),
    }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the active file.
 */
export function useActiveFile(): SqlFile | null {
  const files = useFileStore((state) => state.files);
  const activeFileId = useFileStore((state) => state.activeFileId);

  if (!activeFileId) return null;
  return files.find((file) => file.id === activeFileId) ?? null;
}

/**
 * Get the total number of files.
 */
export function useFileCount(): number {
  return useFileStore((state) => state.files.length);
}

/**
 * Check if a specific file is active.
 */
export function useIsFileActive(fileId: string): boolean {
  return useFileStore((state) => state.activeFileId === fileId);
}
