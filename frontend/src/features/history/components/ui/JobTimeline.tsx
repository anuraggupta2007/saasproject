import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface JobTimelineProps {
  events: Array<{
    id: string;
    timestamp: string;
    stage: string;
    status: 'started' | 'completed' | 'failed' | 'skipped';
    message: string;
    duration?: number;
  }>;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export const JobTimeline = memo(
  forwardRef<HTMLDivElement, JobTimelineProps>(
    ({ events, className }, ref) => {
      return (
        <div ref={ref} className={cn('relative pl-6 border-l border-white/10', className)}>
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pb-6 last:pb-0"
            >
              <div
                className="absolute left-[-22px] top-0 w-4 h-4 rounded-full border-2 border-white/10 z-10"
                style={{
                  backgroundColor:
                    event.status === 'completed' ? '#009688' :
                    event.status === 'failed' ? '#ef4444' :
                    event.status === 'started' ? '#3b82f6' : '#6b7280',
                  borderColor:
                    event.status === 'completed' ? '#009688' :
                    event.status === 'failed' ? '#ef4444' :
                    event.status === 'started' ? '#3b82f6' : '#6b7280',
                }}
              />
              <div className="ml-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 text-xs rounded-full font-medium',
                    event.status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
                    event.status === 'failed' && 'bg-red-500/20 text-red-400',
                    event.status === 'started' && 'bg-blue-500/20 text-blue-400',
                    event.status === 'skipped' && 'bg-slate-500/20 text-slate-400'
                  )}>
                    {event.status}
                  </span>
                  <span className="text-xs text-slate-600">{event.stage}</span>
                </div>
                <p className="text-sm text-white mt-1">{event.message}</p>
                {event.duration && (
                  <p className="text-xs text-slate-500 mt-1">
                    Duration: {formatDuration(event.duration)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      );
    }
  )
);

JobTimeline.displayName = 'JobTimeline';
