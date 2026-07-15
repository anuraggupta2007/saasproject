import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = memo(({ title = 'Something went wrong', message, onRetry, className }: ErrorStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="p-3 bg-red-500/10 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {message && <p className="mt-2 text-sm text-slate-400 max-w-md">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-6 px-4 py-2 text-sm font-medium text-white bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
          Try Again
        </button>
      )}
    </div>
  );
});

ErrorState.displayName = 'ErrorState';
