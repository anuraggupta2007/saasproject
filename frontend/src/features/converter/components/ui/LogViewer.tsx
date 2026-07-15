import { memo, forwardRef, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface LogViewerProps {
  logs: string[];
  autoScroll?: boolean;
  filter?: 'all' | 'info' | 'warn' | 'error';
  maxHeight?: string;
  className?: string;
}

export const LogViewer = memo(
  forwardRef<HTMLDivElement, LogViewerProps>(
    ({ logs, autoScroll = true, filter = 'all', maxHeight = 'h-96', className }, ref) => {
      const endRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (autoScroll && endRef.current) {
          endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, [logs, autoScroll]);

      const filteredLogs = logs.filter((log) => {
        if (filter === 'all') return true;
        if (filter === 'error') return log.includes('ERROR') || log.includes('CRITICAL');
        if (filter === 'warn') return log.includes('WARN');
        if (filter === 'info') return !log.includes('ERROR') && !log.includes('WARN') && !log.includes('CRITICAL');
        return true;
      });

      return (
        <div
          ref={ref}
          className={cn('overflow-y-auto font-mono text-sm p-4 bg-black/30 rounded-xl', maxHeight, className)}
          role="log"
          aria-live="polite"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No logs available</div>
          ) : (
            filteredLogs.map((log, index) => (
              <motion.div
                key={index}
                className={cn(
                  'py-0.5 border-b border-white/5 last:border-0',
                  log.includes('ERROR') || log.includes('CRITICAL') ? 'text-red-400' :
                  log.includes('WARN') ? 'text-amber-400' : 'text-slate-300'
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {log}
              </motion.div>
            ))
          )}
          <div ref={endRef} />
        </div>
      );
    }
  )
);

LogViewer.displayName = 'LogViewer';
