import { memo, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
  variant?: 'card' | 'row' | 'stat' | 'chart';
}

export const SkeletonLoader = memo(
  forwardRef<HTMLDivElement, SkeletonLoaderProps>(
    ({ className, count = 1, variant = 'card' }, ref) => {
      const variantStyles = {
        card: 'h-48 rounded-2xl',
        row: 'h-16 rounded-xl',
        stat: 'h-24 rounded-xl',
        chart: 'h-64 rounded-xl',
      };

      return (
        <div ref={ref} className={cn('space-y-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'bg-white/5 animate-pulse',
                variantStyles[variant]
              )}
            />
          ))}
        </div>
      );
    }
  )
);

SkeletonLoader.displayName = 'SkeletonLoader';
