'use client';

/**
 * @fileoverview Query Library component for SQLens.
 *
 * This component provides a searchable and filterable dropdown
 * displaying example SQL queries organized by category.
 *
 * @module components/Editor/QueryLibrary
 */

import { useState, useMemo } from 'react';
import { useDatabaseStore } from '@/stores';
import { ExampleQuery, QueryCategory } from '@/types';
import { cn } from '@/utils';
import { Search, Code, Layers, GitMerge, BarChart3, Sparkles } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the QueryLibrary component.
 */
interface QueryLibraryProps {
  /**
   * Callback when a query is selected.
   * @param sql - The selected SQL query string
   */
  onSelect: (sql: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Maps query categories to their icon components.
 */
const CATEGORY_ICONS: Record<QueryCategory, React.ComponentType<{ className?: string }>> = {
  Basic: Code,
  Joins: GitMerge,
  Aggregation: BarChart3,
  Subqueries: Layers,
  Advanced: Sparkles,
};

/**
 * All available query categories in display order.
 */
const CATEGORIES: QueryCategory[] = [
  'Basic',
  'Joins',
  'Aggregation',
  'Subqueries',
  'Advanced',
];

// ============================================================================
// QueryLibrary Component
// ============================================================================

/**
 * Query Library dropdown with search and category filtering.
 *
 * Displays example queries from the current database preset,
 * organized by category. Users can search queries by title,
 * description, or SQL content.
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const handleSelect = (sql: string) => {
 *     setQuery(sql);
 *   };
 *
 *   return (
 *     <QueryLibrary onSelect={handleSelect} />
 *   );
 * }
 * ```
 */
export function QueryLibrary({ onSelect }: QueryLibraryProps) {
  // Store hooks
  const { currentPreset } = useDatabaseStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QueryCategory | null>(null);

  // Get queries from current preset
  const queries = currentPreset?.exampleQueries || [];

  // -------------------------------------------------------------------------
  // Filtered Queries
  // -------------------------------------------------------------------------

  /**
   * Filter queries based on search term and selected category.
   */
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // Check search term match
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        q.title.toLowerCase().includes(searchLower) ||
        q.description.toLowerCase().includes(searchLower) ||
        q.sql.toLowerCase().includes(searchLower);

      // Check category match
      const matchesCategory = !selectedCategory || q.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [queries, searchTerm, selectedCategory]);

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  /**
   * Handle category filter toggle.
   */
  const handleCategoryClick = (category: QueryCategory) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  /**
   * Handle search input change.
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handle query selection.
   */
  const handleQueryClick = (query: ExampleQuery) => {
    onSelect(query.sql);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="border-b border-border bg-panel max-h-80 overflow-y-auto">
      {/* Search and Category Filter */}
      <div className="sticky top-0 bg-panel p-3 border-b border-border space-y-2 z-10">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search queries..."
            className={cn(
              'w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              'placeholder:text-muted'
            )}
            aria-label="Search queries"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* All Categories Button */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              !selectedCategory
                ? 'bg-accent text-accent-foreground'
                : 'text-muted hover:text-foreground hover:bg-accent/10'
            )}
            aria-pressed={!selectedCategory}
          >
            All
          </button>

          {/* Category Buttons */}
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const isSelected = selectedCategory === category;

            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted hover:text-foreground hover:bg-accent/10'
                )}
                aria-pressed={isSelected}
              >
                <Icon className="w-3 h-3" />
                <span>{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Query List */}
      <div className="p-2 space-y-1">
        {filteredQueries.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            {queries.length === 0
              ? 'No example queries available for this preset'
              : 'No queries found matching your search'}
          </p>
        ) : (
          filteredQueries.map((query) => (
            <QueryItem
              key={query.id}
              query={query}
              onClick={() => handleQueryClick(query)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// QueryItem Component
// ============================================================================

/**
 * Props for the QueryItem component.
 */
interface QueryItemProps {
  /**
   * The query to display.
   */
  query: ExampleQuery;

  /**
   * Click handler for selection.
   */
  onClick: () => void;
}

/**
 * Individual query item in the library list.
 */
function QueryItem({ query, onClick }: QueryItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-2 rounded-md transition-colors',
        'hover:bg-accent/10 focus:outline-none focus:bg-accent/10',
        'group'
      )}
      type="button"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
          {query.title}
        </span>
        <span
          className={cn(
            'px-1.5 py-0.5 text-xs rounded',
            'bg-muted/20 text-muted'
          )}
        >
          {query.category}
        </span>
      </div>
      <p className="text-xs text-muted mt-0.5 line-clamp-1">
        {query.description}
      </p>
    </button>
  );
}
