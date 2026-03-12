'use client';

/**
 * @fileoverview Query Editor component for SQLens.
 *
 * This component provides a SQL editor with syntax highlighting,
 * autocomplete for table/column names, and SQL keywords.
 * Integrates with CodeMirror for a rich editing experience.
 *
 * @module components/Editor/QueryEditor
 */

import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { EditorView } from '@codemirror/view';
import { useQueryStore, useDatabaseStore, useUIStore } from '@/stores';
import { QueryLibrary } from './QueryLibrary';
import { ErrorDisplay } from './ErrorDisplay';
import { cn } from '@/utils';
import { Play, StepForward, BookOpen } from 'lucide-react';

// ============================================================================
// SQL Keywords for Autocomplete
// ============================================================================

/**
 * Common SQL keywords for autocomplete suggestions.
 */
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'DISTINCT', 'AS', 'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'EXISTS', 'CASE', 'WHEN',
  'THEN', 'ELSE', 'END', 'CAST', 'COALESCE', 'NULLIF', 'INSERT',
  'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
  'ALTER', 'DROP', 'INDEX', 'VIEW', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'CHECK', 'UNIQUE',
];

// ============================================================================
// QueryEditor Component
// ============================================================================

/**
 * SQL Query Editor with syntax highlighting and autocomplete.
 *
 * Features:
 * - SQLite syntax highlighting via CodeMirror
 * - Autocomplete for table and column names from schema
 * - Autocomplete for SQL keywords
 * - Dark/light theme support
 * - Line numbers and active line highlighting
 * - Query execution and step-through controls
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div className="h-screen">
 *       <QueryEditor />
 *     </div>
 *   );
 * }
 * ```
 */
export function QueryEditor() {
  // Store hooks
  const {
    query,
    setQuery,
    parseError,
    executeCurrentQuery,
    startStepThrough,
  } = useQueryStore();

  const { schema } = useDatabaseStore();
  const { theme, showQueryLibrary, setShowQueryLibrary } = useUIStore();

  // -------------------------------------------------------------------------
  // SQL Language Extension with Schema
  // -------------------------------------------------------------------------

  /**
   * Create SQL language extension with table/column autocomplete from schema.
   */
  const sqlCompletion = useMemo(() => {
    const tables = schema?.tables || [];

    // Build schema object for CodeMirror SQL extension
    const schemaObj = Object.fromEntries(
      tables.map((t) => [t.name, t.columns.map((c) => c.name)])
    );

    // Build table completions
    const tableCompletions = tables.map((t) => ({
      label: t.name,
      type: 'class' as const,
      detail: 'table',
    }));

    return sql({
      dialect: SQLite,
      schema: schemaObj,
      tables: tableCompletions,
    });
  }, [schema]);

  // -------------------------------------------------------------------------
  // Custom Keyword Completion
  // -------------------------------------------------------------------------

  /**
   * Custom completion source for SQL keywords.
   */
  const customCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\w*/);

    if (!word || word.from === word.to) {
      return null;
    }

    const searchTerm = word.text.toLowerCase();

    const matchingKeywords = SQL_KEYWORDS
      .filter((k) => k.toLowerCase().startsWith(searchTerm))
      .map((k) => ({
        label: k,
        type: 'keyword' as const,
        boost: -1, // Lower priority than table/column names
      }));

    if (matchingKeywords.length === 0) {
      return null;
    }

    return {
      from: word.from,
      options: matchingKeywords,
    };
  }, []);

  // -------------------------------------------------------------------------
  // Theme Extension
  // -------------------------------------------------------------------------

  /**
   * Create theme extension matching the app's design system.
   */
  const themeExtension = useMemo(() => {
    const isDark = theme === 'dark' || theme === 'system';

    return EditorView.theme(
      {
        '&': {
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        },
        '.cm-content': {
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          fontSize: '14px',
          lineHeight: '1.6',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--panel, hsl(220 13% 10%))',
          color: 'var(--muted, hsl(220 10% 50%))',
          borderRight: '1px solid var(--border, hsl(220 13% 18%))',
          minWidth: '48px',
        },
        '.cm-gutter': {
          userSelect: 'none',
        },
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 8px 0 12px',
          minWidth: '40px',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'var(--accent-10, hsla(220 100% 60% / 0.1))',
        },
        '.cm-activeLine': {
          backgroundColor: 'var(--accent-5, hsla(220 100% 60% / 0.05))',
        },
        '.cm-cursor': {
          borderLeftColor: 'var(--accent, hsl(220 100% 60%))',
          borderLeftWidth: '2px',
        },
        '.cm-selectionBackground': {
          backgroundColor: 'var(--accent-20, hsla(220 100% 60% / 0.2)) !important',
        },
        '&.cm-focused .cm-selectionBackground': {
          backgroundColor: 'var(--accent-30, hsla(220 100% 60% / 0.3)) !important',
        },
        '.cm-placeholder': {
          color: 'var(--muted, hsl(220 10% 50%))',
          fontStyle: 'italic',
        },
        '.cm-matchingBracket': {
          backgroundColor: 'var(--accent-20, hsla(220 100% 60% / 0.2))',
          outline: '1px solid var(--accent-40, hsla(220 100% 60% / 0.4))',
        },
        '.cm-tooltip': {
          backgroundColor: 'var(--panel, hsl(220 13% 10%))',
          border: '1px solid var(--border, hsl(220 13% 18%))',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
        '.cm-tooltip.cm-tooltip-autocomplete': {
          '& > ul': {
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: '13px',
          },
          '& > ul > li': {
            padding: '4px 8px',
          },
          '& > ul > li[aria-selected]': {
            backgroundColor: 'var(--accent, hsl(220 100% 60%))',
            color: 'var(--accent-foreground, white)',
          },
        },
        '.cm-completionLabel': {
          color: 'var(--foreground)',
        },
        '.cm-completionDetail': {
          color: 'var(--muted, hsl(220 10% 50%))',
          marginLeft: '8px',
          fontStyle: 'italic',
        },
      },
      { dark: isDark }
    );
  }, [theme]);

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  /**
   * Handle query library selection.
   */
  const handleQuerySelect = useCallback(
    (selectedQuery: string) => {
      setQuery(selectedQuery);
      setShowQueryLibrary(false);
    },
    [setQuery, setShowQueryLibrary]
  );

  /**
   * Handle editor value change.
   */
  const handleEditorChange = useCallback(
    (value: string) => {
      setQuery(value);
    },
    [setQuery]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Query Editor</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Examples Button */}
          <button
            onClick={() => setShowQueryLibrary(!showQueryLibrary)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              'border border-border hover:bg-accent/10',
              showQueryLibrary && 'bg-accent/20'
            )}
            aria-expanded={showQueryLibrary}
            aria-controls="query-library"
          >
            <BookOpen className="w-4 h-4" />
            <span>Examples</span>
          </button>

          {/* Step Through Button */}
          <button
            onClick={startStepThrough}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              'border border-border bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            )}
            title="Step Through (Space)"
          >
            <StepForward className="w-4 h-4" />
            <span>Step Through</span>
          </button>

          {/* Run Button */}
          <button
            onClick={executeCurrentQuery}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              'bg-accent text-accent-foreground hover:bg-accent/90'
            )}
            title="Run Query (Ctrl+Enter)"
          >
            <Play className="w-4 h-4" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Query Library Dropdown */}
      {showQueryLibrary && (
        <div id="query-library">
          <QueryLibrary onSelect={handleQuerySelect} />
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={query}
          onChange={handleEditorChange}
          extensions={[
            sqlCompletion,
            autocompletion({ override: [customCompletions] }),
            themeExtension,
            EditorView.lineWrapping,
          ]}
          className="h-full"
          placeholder="Write your SQL query here..."
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
          }}
        />
      </div>

      {/* Error Display */}
      {parseError && <ErrorDisplay error={parseError} />}
    </div>
  );
}
