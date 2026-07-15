import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { QueueItem, ConversionStatus } from '../../types';

interface QueueListProps {
  items: QueueItem[];
  className?: string;
}

function getStatusColor(status: ConversionStatus): string {
  const colors: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400',
    converting: 'bg-blue-500/20 text-blue-400',
    pending: 'bg-slate-500/20 text-slate-400',
    queued: 'bg-slate-500/20 text-slate-400',
    paused: 'bg-amber-500/20 text-amber-400',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400';
}

export const QueueList = memo(
  forwardRef<HTMLDivElement, QueueListProps>(
    ({ items, className }, ref) => {
      return (
        <div ref={ref} className={cn('space-y-2', className)}>
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">No jobs in queue</p>
            </div>
          ) : (
            items.map((item, index) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  <GripVertical className="w-4 h-4 text-slate-600" />
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
                    {item.position}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.jobName}</p>
                  {item.estimatedStartAt && (
                    <p className="text-xs text-slate-500">
                      Est. start: {new Date(item.estimatedStartAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', getStatusColor(item.status))}>
                  {item.status}
                </span>
              </motion.div>
            ))
          )}
        </div>
      );
    }
  )
);

QueueList.displayName = 'QueueList';
