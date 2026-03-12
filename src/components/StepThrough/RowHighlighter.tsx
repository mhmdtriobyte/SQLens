'use client';

import { HighlightedRow } from '@/types';
import { cn } from '@/utils';

interface RowHighlighterProps {
  row: HighlightedRow;
  columns: string[];
}

export function RowHighlighter({ row, columns }: RowHighlighterProps) {
  const statusStyles = {
    included: 'bg-green-500/10 border-green-500/30',
    excluded: 'bg-red-500/10 border-red-500/30 line-through opacity-50',
    pending: 'bg-yellow-500/10 border-yellow-500/30',
    new: 'bg-blue-500/10 border-blue-500/30',
  };

  return (
    <tr className={cn(
      "border-b border-border transition-colors",
      statusStyles[row.status]
    )}>
      {columns.map(col => (
        <td
          key={col}
          className={cn(
            "px-3 py-2 text-sm font-mono",
            row.status === 'excluded' && "text-muted"
          )}
        >
          {row.data[col]?.toString() ?? 'NULL'}
        </td>
      ))}

      {/* Status indicator */}
      <td className="px-2 py-2 w-8">
        {row.status === 'included' && (
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Included" />
        )}
        {row.status === 'excluded' && (
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Excluded" />
        )}
        {row.status === 'new' && (
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="New" />
        )}
      </td>
    </tr>
  );
}
