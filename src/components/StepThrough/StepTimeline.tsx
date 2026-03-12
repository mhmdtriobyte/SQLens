'use client';

import { ExecutionStep } from '@/types';
import { cn } from '@/utils';
import { motion } from 'framer-motion';

interface StepTimelineProps {
  steps: ExecutionStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}

// Short labels for each operation type
const operationLabels: Record<string, string> = {
  TABLE_SCAN: 'Scan',
  SELECTION: 'Where',
  PROJECTION: 'Select',
  JOIN: 'Join',
  CROSS_JOIN: 'Cross',
  GROUP_BY: 'Group',
  DISTINCT: 'Distinct',
  SORT: 'Sort',
  LIMIT: 'Limit',
  UNION: 'Union',
  INTERSECT: 'Intersect',
  EXCEPT: 'Except',
  AGGREGATE: 'Agg',
  SUBQUERY: 'Sub',
};

export function StepTimeline({ steps, currentIndex, onStepClick }: StepTimelineProps) {
  return (
    <div className="px-4 py-2 border-t border-border overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isComplete = idx < currentIndex;
          const label = operationLabels[step.node.type] || step.node.type;

          return (
            <div key={step.stepNumber} className="flex items-center">
              {/* Step dot/box */}
              <button
                onClick={() => onStepClick(idx)}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-2 py-1 rounded transition-colors",
                  "hover:bg-accent/10",
                  isActive && "bg-accent/20"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-medium",
                  "transition-colors",
                  isActive && "bg-accent text-accent-foreground",
                  isComplete && "bg-green-500/20 text-green-400",
                  !isActive && !isComplete && "bg-muted/20 text-muted"
                )}>
                  {idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] truncate max-w-[50px]",
                  isActive ? "text-foreground" : "text-muted"
                )}>
                  {label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="timeline-indicator"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                  />
                )}
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5 mx-0.5",
                  isComplete ? "bg-green-500/50" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
