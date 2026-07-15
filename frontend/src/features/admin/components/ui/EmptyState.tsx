import { memo } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = memo(({ icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-slate-500">{icon}</div>}
      <h3 className="text-lg font-medium text-white">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-400 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
