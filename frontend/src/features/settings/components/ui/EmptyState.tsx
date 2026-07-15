import { memo, forwardRef } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState = memo(
  forwardRef<HTMLDivElement, EmptyStateProps>(
    ({ icon, title, description, action, className }, ref) => (
      <div ref={ref} className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
          {icon || <Inbox className="w-8 h-8 text-slate-500" />}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">{description}</p>
        {action && (
          <Button variant="brand" onClick={action.onClick}>{action.label}</Button>
        )}
      </div>
    )
  )
);

EmptyState.displayName = 'EmptyState';
