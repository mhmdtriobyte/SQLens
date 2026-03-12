'use client';

/**
 * @fileoverview RelationshipLines component for visualizing table relationships
 *
 * This component renders SVG lines or visual indicators connecting
 * foreign key relationships between table cards in the schema panel.
 *
 * @module components/SchemaPanel/RelationshipLines
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Table } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface RelationshipLinesProps {
  /** Array of table definitions */
  tables: Table[];
  /** Whether to show the relationship visualization */
  showLines?: boolean;
  /** Color for the relationship lines */
  lineColor?: string;
  /** Whether lines are interactive (hover effects) */
  interactive?: boolean;
}

interface Connection {
  /** Source table and column */
  from: {
    table: string;
    column: string;
  };
  /** Target table and column */
  to: {
    table: string;
    column: string;
  };
  /** Unique identifier for this connection */
  id: string;
}

interface ConnectionPositions {
  /** Starting position (x, y) */
  start: { x: number; y: number };
  /** Ending position (x, y) */
  end: { x: number; y: number };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LINE_COLOR = 'rgb(var(--color-brand-primary))';
const LINE_OPACITY = 0.4;
const LINE_OPACITY_HOVER = 0.8;
const LINE_WIDTH = 2;
const CURVE_OFFSET = 30;

// ============================================================================
// Hooks
// ============================================================================

/**
 * Custom hook to extract connection data from tables
 */
function useConnections(tables: Table[]): Connection[] {
  return useMemo(() => {
    const connections: Connection[] = [];

    tables.forEach((table) => {
      table.foreignKeys?.forEach((fk) => {
        connections.push({
          from: {
            table: table.name,
            column: fk.column,
          },
          to: {
            table: fk.referencesTable,
            column: fk.referencesColumn,
          },
          id: `${table.name}.${fk.column}->${fk.referencesTable}.${fk.referencesColumn}`,
        });
      });
    });

    return connections;
  }, [tables]);
}

/**
 * Custom hook to track element positions for drawing lines
 */
function useElementPositions(
  containerRef: React.RefObject<HTMLDivElement>,
  connections: Connection[],
  tables: Table[]
): Map<string, ConnectionPositions> {
  const [positions, setPositions] = useState<Map<string, ConnectionPositions>>(
    new Map()
  );

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newPositions = new Map<string, ConnectionPositions>();

    connections.forEach((conn) => {
      // Find source and target elements
      const sourceEl = container.querySelector(
        `[data-table="${conn.from.table}"][data-column="${conn.from.column}"]`
      );
      const targetEl = container.querySelector(
        `[data-table="${conn.to.table}"][data-column="${conn.to.column}"]`
      );

      if (sourceEl && targetEl) {
        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        newPositions.set(conn.id, {
          start: {
            x: sourceRect.right - containerRect.left,
            y: sourceRect.top + sourceRect.height / 2 - containerRect.top,
          },
          end: {
            x: targetRect.left - containerRect.left,
            y: targetRect.top + targetRect.height / 2 - containerRect.top,
          },
        });
      }
    });

    setPositions(newPositions);
  }, [containerRef, connections]);

  useEffect(() => {
    updatePositions();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Update on window resize
    window.addEventListener('resize', updatePositions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePositions);
    };
  }, [updatePositions, tables]);

  return positions;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a bezier curve path between two points
 */
function generateCurvePath(
  start: { x: number; y: number },
  end: { x: number; y: number }
): string {
  const midX = (start.x + end.x) / 2;

  // Control points for smooth bezier curve
  const cp1x = start.x + CURVE_OFFSET;
  const cp1y = start.y;
  const cp2x = end.x - CURVE_OFFSET;
  const cp2y = end.y;

  return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * RelationshipLines renders visual connections between related tables.
 *
 * This component extracts foreign key relationships from the table definitions
 * and renders SVG bezier curves connecting the related columns.
 *
 * Note: For the MVP implementation, this component serves as a placeholder
 * and infrastructure for future visual relationship lines. Full SVG rendering
 * requires DOM element position tracking which adds complexity.
 *
 * Current implementation:
 * - Extracts relationship data from tables
 * - Provides infrastructure for position tracking
 * - Returns null (no visual output) for MVP simplicity
 *
 * Future implementation could:
 * - Render SVG overlay with bezier curves
 * - Highlight connections on hover
 * - Animate relationship discovery
 * - Support different line styles (1:1, 1:N, N:M)
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <RelationshipLines tables={schema.tables} showLines={true} />
 *   {schema.tables.map(table => <TableCard table={table} />)}
 * </div>
 * ```
 */
export function RelationshipLines({
  tables,
  showLines = false,
  lineColor = DEFAULT_LINE_COLOR,
  interactive = true,
}: RelationshipLinesProps) {
  // ========================================
  // Refs & State
  // ========================================

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // ========================================
  // Computed Values
  // ========================================

  const connections = useConnections(tables);

  // Note: Position tracking is available but not used in MVP
  // const positions = useElementPositions(containerRef, connections, tables);

  // ========================================
  // Early Return for MVP
  // ========================================

  // For MVP, we skip the SVG line rendering and just show FK indicators
  // on the TableCard component. Full relationship visualization can be
  // added in a future iteration.

  if (!showLines || connections.length === 0) {
    return null;
  }

  // ========================================
  // Full Implementation (Future)
  // ========================================

  // The following code provides the infrastructure for rendering
  // relationship lines when showLines is true. Uncomment and adapt
  // when ready to implement full visualization.

  /*
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={lineColor}
              opacity={LINE_OPACITY}
            />
          </marker>
        </defs>

        {connections.map((conn) => {
          const pos = positions.get(conn.id);
          if (!pos) return null;

          const isHovered = hoveredConnection === conn.id;
          const path = generateCurvePath(pos.start, pos.end);

          return (
            <g key={conn.id}>
              <path
                d={path}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
                strokeOpacity={isHovered ? LINE_OPACITY_HOVER : LINE_OPACITY}
                markerEnd="url(#arrowhead)"
                className={cn(
                  'transition-opacity duration-200',
                  interactive && 'cursor-pointer pointer-events-auto'
                )}
                onMouseEnter={() => interactive && setHoveredConnection(conn.id)}
                onMouseLeave={() => interactive && setHoveredConnection(null)}
              />
              {isHovered && (
                <title>
                  {conn.from.table}.{conn.from.column} references{' '}
                  {conn.to.table}.{conn.to.column}
                </title>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
  */

  // ========================================
  // MVP Return
  // ========================================

  // Return empty container that can be used for future implementation
  return (
    <div
      ref={containerRef}
      className="hidden"
      data-relationship-count={connections.length}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Exports for Testing
// ============================================================================

export { useConnections };
export type { Connection, ConnectionPositions };
