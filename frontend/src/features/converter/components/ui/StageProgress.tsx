import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import type { ConversionStage, CONVERSION_STAGES } from '../../types';

interface StageProgressProps {
  currentStage: ConversionStage;
  completedStages: ConversionStage[];
  stageProgress?: number;
  className?: string;
}

const STAGE_LABELS: Record<ConversionStage, string> = {
  initializing: 'Initializing',
  uploading: 'Uploading',
  validating: 'Validating',
  parsing: 'Parsing',
  extracting: 'Extracting',
  converting: 'Converting',
  formatting: 'Formatting',
  compressing: 'Compressing',
  finalizing: 'Finalizing',
  completed: 'Completed',
};

export const StageProgress = memo(
  forwardRef<HTMLDivElement, StageProgressProps>(
    ({ currentStage, completedStages, stageProgress = 0, className }, ref) => {
      const stages = Object.keys(STAGE_LABELS) as ConversionStage[];

      return (
        <div ref={ref} className={cn('space-y-3', className)}>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Stage Progress</span>
            <span className="font-mono font-medium text-white">{stageProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stageProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {stages.map((stage) => {
              const isCompleted = completedStages.includes(stage);
              const isCurrent = stage === currentStage;

              return (
                <div
                  key={stage}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                    isCurrent && 'bg-brand-500/10 text-brand-400 border border-brand-500/30',
                    isCompleted && 'bg-emerald-500/10 text-emerald-400',
                    !isCurrent && !isCompleted && 'text-slate-500'
                  )}
                >
                  <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isCurrent && 'bg-brand-400 animate-pulse',
                    isCompleted && 'bg-emerald-400',
                    !isCurrent && !isCompleted && 'bg-slate-600'
                  )} />
                  <span className="truncate">{STAGE_LABELS[stage]}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  )
);

StageProgress.displayName = 'StageProgress';
