'use client';

import { ExecutionStep } from '@/types';
import { cn } from '@/utils';
import { Info, ArrowDown, ArrowRight } from 'lucide-react';

interface StepExplanationProps {
  step: ExecutionStep;
}

export function StepExplanation({ step }: StepExplanationProps) {
  const { explanation, node } = step;

  // Get color based on operation type
  const getOperationColor = (type: string) => {
    switch (type) {
      case 'TABLE_SCAN': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'SELECTION': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'PROJECTION': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'JOIN': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'GROUP_BY': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      case 'SORT': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'DISTINCT': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'LIMIT': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const colorClass = getOperationColor(node.type);

  return (
    <div className="p-4">
      {/* Header with operation badge */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "px-3 py-1.5 rounded-md border text-sm font-mono",
          colorClass
        )}>
          {explanation.operation}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground">
            {explanation.title}
          </h3>
          <p className="text-sm text-muted mt-1">
            {explanation.description}
          </p>
        </div>

        {/* Row count change */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">{explanation.beforeCount}</span>
          <ArrowRight className="w-4 h-4 text-muted" />
          <span className={cn(
            "font-medium",
            explanation.afterCount < explanation.beforeCount ? "text-red-400" :
            explanation.afterCount > explanation.beforeCount ? "text-green-400" :
            "text-foreground"
          )}>
            {explanation.afterCount}
          </span>
          <span className="text-xs text-muted">rows</span>
        </div>
      </div>

      {/* Details */}
      {explanation.details && explanation.details.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-border space-y-1">
          {explanation.details.map((detail, idx) => (
            <p key={idx} className="text-xs text-muted flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
