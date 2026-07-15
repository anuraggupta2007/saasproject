import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState = memo(
  forwardRef<HTMLDivElement, EmptyStateProps>(
    ({ icon, title, description, action, secondaryAction, className }, ref) => {
      return (
        <motion.div
          ref={ref}
          className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>
          <div className="flex items-center gap-3">
            {action && (
              <button
                onClick={action.onClick}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        </motion.div>
      );
    }
  )
);

EmptyState.displayName = 'EmptyState';
