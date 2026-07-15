import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface BulkActionToolbarProps {
  selectedCount: number;
  actions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    variant?: 'default' | 'destructive';
    onClick: () => void;
    loading?: boolean;
  }>;
  onClearSelection: () => void;
  className?: string;
}

export const BulkActionToolbar = memo(
  forwardRef<HTMLDivElement, BulkActionToolbarProps>(
    ({ selectedCount, actions, onClearSelection, className }, ref) => {
      if (selectedCount === 0) return null;

      return (
        <motion.div
          ref={ref}
          className={cn(
            'flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl',
            className
          )}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <span className="text-sm font-medium text-brand-400">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.loading}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  action.variant === 'destructive'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-white/10 text-white hover:bg-white/20'
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            <button
              onClick={onClearSelection}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </motion.div>
      );
    }
  )
);

BulkActionToolbar.displayName = 'BulkActionToolbar';
