'use client';

/**
 * @fileoverview FileManager component for SQLens
 *
 * This component provides an IDE-style file explorer for SQL files:
 * - Create, rename, delete SQL files
 * - Click to load file content into editor
 * - Files are stored in localStorage
 * - Collapsible panel with search functionality
 *
 * @module components/FileManager
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFileStore, type SqlFile } from '@/stores/fileStore';
import { useQueryStore } from '@/stores/queryStore';
import {
  FileCode2,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/utils';

// ============================================================================
// Types
// ============================================================================

interface FileManagerProps {
  /** Panel width in pixels or CSS value */
  width?: number | string;
  /** Callback when a file is selected */
  onFileSelect?: (file: SqlFile) => void;
}

interface FileItemProps {
  file: SqlFile;
  isActive: boolean;
  isRenaming: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRenameSubmit: (newName: string) => void;
  onRenameCancel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 180;
const MAX_WIDTH = 350;

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual file item component with context menu support.
 */
function FileItem({
  file,
  isActive,
  isRenaming,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onRenameSubmit,
  onRenameCancel,
}: FileItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editName, setEditName] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleRenameSubmit = useCallback(() => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== file.name) {
      onRenameSubmit(trimmedName);
    } else {
      onRenameCancel();
    }
  }, [editName, file.name, onRenameSubmit, onRenameCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit();
      } else if (e.key === 'Escape') {
        setEditName(file.name);
        onRenameCancel();
      }
    },
    [handleRenameSubmit, onRenameCancel, file.name]
  );

  const handleMenuAction = useCallback(
    (action: 'rename' | 'delete' | 'duplicate') => {
      setShowMenu(false);
      switch (action) {
        case 'rename':
          setEditName(file.name);
          onRename();
          break;
        case 'delete':
          onDelete();
          break;
        case 'duplicate':
          onDuplicate();
          break;
      }
    },
    [file.name, onRename, onDelete, onDuplicate]
  );

  // Format the updated date
  const formattedDate = new Date(file.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (isRenaming) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md',
          'bg-[rgb(var(--color-brand-primary))]/10',
          'border border-[rgb(var(--color-brand-primary))]/30'
        )}
      >
        <FileCode2 className="w-4 h-4 text-[rgb(var(--color-brand-primary))] flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRenameSubmit}
          className={cn(
            'flex-1 min-w-0 px-1 py-0.5 text-sm',
            'bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))]',
            'rounded text-[rgb(var(--color-foreground))]',
            'focus:outline-none focus:border-[rgb(var(--color-brand-primary))]'
          )}
        />
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleRenameSubmit}
            className="p-0.5 text-green-500 hover:bg-green-500/10 rounded"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setEditName(file.name);
              onRenameCancel();
            }}
            className="p-0.5 text-red-500 hover:bg-red-500/10 rounded"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md cursor-pointer',
        'transition-colors duration-150',
        isActive
          ? 'bg-[rgb(var(--color-brand-primary))]/15 text-[rgb(var(--color-foreground))]'
          : 'hover:bg-[rgb(var(--color-surface-elevated))] text-[rgb(var(--color-syntax-comment))]'
      )}
      onClick={onSelect}
      onDoubleClick={() => {
        setEditName(file.name);
        onRename();
      }}
    >
      <FileCode2
        className={cn(
          'w-4 h-4 flex-shrink-0',
          isActive
            ? 'text-[rgb(var(--color-brand-primary))]'
            : 'text-[rgb(var(--color-syntax-comment))]'
        )}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <span
          className={cn(
            'text-sm truncate',
            isActive && 'font-medium text-[rgb(var(--color-foreground))]'
          )}
        >
          {file.name}.sql
        </span>
        <span className="text-xs text-[rgb(var(--color-syntax-comment))] opacity-60">
          {formattedDate}
        </span>
      </div>

      {/* Context menu button */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={cn(
            'p-1 rounded transition-opacity',
            'text-[rgb(var(--color-syntax-comment))]',
            'hover:text-[rgb(var(--color-foreground))]',
            'hover:bg-[rgb(var(--color-surface))]',
            'opacity-0 group-hover:opacity-100',
            showMenu && 'opacity-100'
          )}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className={cn(
              'absolute right-0 top-full mt-1 z-50',
              'min-w-[120px] py-1',
              'bg-[rgb(var(--color-surface-elevated))]',
              'border border-[rgb(var(--color-border))]',
              'rounded-md shadow-lg',
              'animate-[slideDown_0.1s_ease-out]'
            )}
          >
            <button
              onClick={() => handleMenuAction('rename')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm',
                'text-[rgb(var(--color-foreground))]',
                'hover:bg-[rgb(var(--color-brand-primary))]/10',
                'transition-colors'
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
              Rename
            </button>
            <button
              onClick={() => handleMenuAction('duplicate')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm',
                'text-[rgb(var(--color-foreground))]',
                'hover:bg-[rgb(var(--color-brand-primary))]/10',
                'transition-colors'
              )}
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            <div className="my-1 border-t border-[rgb(var(--color-border))]" />
            <button
              onClick={() => handleMenuAction('delete')}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm',
                'text-red-500',
                'hover:bg-red-500/10',
                'transition-colors'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FileManager provides an IDE-style file explorer for SQL files.
 *
 * Features:
 * - Create new SQL files with auto-generated names
 * - Click to select and load file content
 * - Double-click or context menu to rename
 * - Delete files with confirmation
 * - Duplicate existing files
 * - Collapsible panel
 *
 * @example
 * ```tsx
 * <FileManager
 *   width={250}
 *   onFileSelect={(file) => console.log('Selected:', file.name)}
 * />
 * ```
 */
export function FileManager({
  width = DEFAULT_WIDTH,
  onFileSelect,
}: FileManagerProps) {
  // ========================================
  // State
  // ========================================

  const {
    files,
    activeFileId,
    isPanelExpanded,
    createFile,
    updateFileContent,
    renameFile,
    deleteFile,
    duplicateFile,
    setActiveFile,
    togglePanel,
  } = useFileStore();

  const { query, setQuery } = useQueryStore();

  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // ========================================
  // Computed Values
  // ========================================

  const panelWidth = typeof width === 'number'
    ? Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH)
    : width;

  // Sort files by updatedAt (most recent first)
  const sortedFiles = [...files].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // ========================================
  // Handlers
  // ========================================

  const handleCreateFile = useCallback(() => {
    // Save current content to active file before creating new one
    if (activeFileId && query.trim()) {
      updateFileContent(activeFileId, query);
    }

    const newFile = createFile();
    setQuery(newFile.content);
    onFileSelect?.(newFile);
  }, [activeFileId, query, updateFileContent, createFile, setQuery, onFileSelect]);

  const handleSelectFile = useCallback(
    (file: SqlFile) => {
      if (file.id === activeFileId) return;

      // Save current content to active file before switching
      if (activeFileId && query.trim()) {
        updateFileContent(activeFileId, query);
      }

      setActiveFile(file.id);
      setQuery(file.content);
      onFileSelect?.(file);
    },
    [activeFileId, query, updateFileContent, setActiveFile, setQuery, onFileSelect]
  );

  const handleRenameSubmit = useCallback(
    (fileId: string, newName: string) => {
      renameFile(fileId, newName);
      setRenamingFileId(null);
    },
    [renameFile]
  );

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      // Find the file to delete
      const fileToDelete = files.find((f) => f.id === fileId);
      if (!fileToDelete) return;

      // If deleting active file, clear the query
      if (fileId === activeFileId) {
        const remainingFiles = files.filter((f) => f.id !== fileId);
        if (remainingFiles.length > 0 && remainingFiles[0]) {
          setQuery(remainingFiles[0].content);
        } else {
          setQuery('');
        }
      }

      deleteFile(fileId);
      setPendingDelete(null);
    },
    [files, activeFileId, deleteFile, setQuery]
  );

  const handleDuplicateFile = useCallback(
    (fileId: string) => {
      // Save current content before duplicating
      if (activeFileId && query.trim()) {
        updateFileContent(activeFileId, query);
      }

      const duplicated = duplicateFile(fileId);
      if (duplicated) {
        setQuery(duplicated.content);
        onFileSelect?.(duplicated);
      }
    },
    [activeFileId, query, updateFileContent, duplicateFile, setQuery, onFileSelect]
  );

  // ========================================
  // Render Helpers
  // ========================================

  const renderHeader = () => (
    <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--color-border))]">
      <button
        onClick={togglePanel}
        className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--color-foreground))] hover:text-[rgb(var(--color-brand-primary))] transition-colors"
      >
        {isPanelExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <FileText className="w-4 h-4 text-[rgb(var(--color-brand-primary))]" />
        <span>SQL Files</span>
      </button>

      <div className="flex items-center gap-1">
        <span className="text-xs text-[rgb(var(--color-syntax-comment))] px-1.5 py-0.5 bg-[rgb(var(--color-surface))] rounded">
          {files.length}
        </span>
        <button
          onClick={handleCreateFile}
          className={cn(
            'p-1.5 rounded transition-colors',
            'text-[rgb(var(--color-syntax-comment))]',
            'hover:text-[rgb(var(--color-brand-primary))]',
            'hover:bg-[rgb(var(--color-brand-primary))]/10'
          )}
          title="New File (Ctrl+N)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <FileCode2 className="w-10 h-10 text-[rgb(var(--color-syntax-comment))] opacity-40" />
      <div>
        <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
          No SQL files yet
        </p>
        <p className="text-xs text-[rgb(var(--color-syntax-comment))] mt-1">
          Create a new file to get started
        </p>
      </div>
      <button
        onClick={handleCreateFile}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md',
          'bg-[rgb(var(--color-brand-primary))]',
          'text-white',
          'hover:bg-[rgb(var(--color-brand-primary))]/90',
          'transition-colors'
        )}
      >
        <Plus className="w-4 h-4" />
        New File
      </button>
    </div>
  );

  const renderFileList = () => (
    <div className="py-1 space-y-0.5">
      {sortedFiles.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          isActive={file.id === activeFileId}
          isRenaming={file.id === renamingFileId}
          onSelect={() => handleSelectFile(file)}
          onRename={() => setRenamingFileId(file.id)}
          onDelete={() => setPendingDelete(file.id)}
          onDuplicate={() => handleDuplicateFile(file.id)}
          onRenameSubmit={(newName) => handleRenameSubmit(file.id, newName)}
          onRenameCancel={() => setRenamingFileId(null)}
        />
      ))}
    </div>
  );

  const renderDeleteConfirmation = () => {
    const fileToDelete = files.find((f) => f.id === pendingDelete);
    if (!fileToDelete) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className={cn(
            'w-80 p-4 rounded-lg',
            'bg-[rgb(var(--color-surface-elevated))]',
            'border border-[rgb(var(--color-border))]',
            'shadow-xl'
          )}
        >
          <h3 className="text-sm font-medium text-[rgb(var(--color-foreground))]">
            Delete File
          </h3>
          <p className="mt-2 text-sm text-[rgb(var(--color-syntax-comment))]">
            Are you sure you want to delete{' '}
            <span className="font-medium text-[rgb(var(--color-foreground))]">
              {fileToDelete.name}.sql
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setPendingDelete(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md',
                'bg-[rgb(var(--color-surface))]',
                'text-[rgb(var(--color-foreground))]',
                'hover:bg-[rgb(var(--color-surface-elevated))]',
                'border border-[rgb(var(--color-border))]',
                'transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteFile(pendingDelete!)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md',
                'bg-red-500',
                'text-white',
                'hover:bg-red-600',
                'transition-colors'
              )}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========================================
  // Main Render
  // ========================================

  return (
    <>
      <div
        className={cn(
          'h-full flex flex-col',
          'bg-[rgb(var(--color-surface))]',
          'border-r border-[rgb(var(--color-border))]',
          'transition-all duration-200'
        )}
        style={{
          width: isPanelExpanded
            ? typeof panelWidth === 'number'
              ? `${panelWidth}px`
              : panelWidth
            : '48px',
        }}
      >
        {/* Header */}
        {renderHeader()}

        {/* File list */}
        {isPanelExpanded && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {files.length === 0 ? renderEmptyState() : renderFileList()}
          </div>
        )}

        {/* Collapsed state */}
        {!isPanelExpanded && (
          <div className="flex-1 flex flex-col items-center pt-2 gap-1">
            <button
              onClick={handleCreateFile}
              className={cn(
                'p-2 rounded transition-colors',
                'text-[rgb(var(--color-syntax-comment))]',
                'hover:text-[rgb(var(--color-brand-primary))]',
                'hover:bg-[rgb(var(--color-brand-primary))]/10'
              )}
              title="New File"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {pendingDelete && renderDeleteConfirmation()}
    </>
  );
}
