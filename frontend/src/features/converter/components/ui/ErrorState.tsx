import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  code?: string;
  recoverable?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export const ErrorState = memo(
  forwardRef<HTMLDivElement, ErrorStateProps>(
    ({ title = 'Something went wrong', message, code, recoverable = true, onRetry, onBack, className }, ref) => {
      return (
        <motion.div
          ref={ref}
          className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-400 max-w-md mb-2">{message}</p>
          {code && (
            <p className="text-xs text-slate-500 font-mono mb-6">Error Code: {code}</p>
          )}
          <div className="flex items-center gap-3">
            {recoverable && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            )}
          </div>
        </motion.div>
      );
    }
  )
);

ErrorState.displayName = 'ErrorState';
