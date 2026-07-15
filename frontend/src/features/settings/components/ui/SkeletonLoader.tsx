import { memo, forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface SkeletonLoaderProps {
  count?: number;
  variant?: 'card' | 'row' | 'stat' | 'profile';
  className?: string;
}

export const SkeletonLoader = memo(
  forwardRef<HTMLDivElement, SkeletonLoaderProps>(
    ({ count = 1, variant = 'card', className }, ref) => {
      const styles = {
        card: 'h-48 rounded-2xl',
        row: 'h-16 rounded-xl',
        stat: 'h-24 rounded-xl',
        profile: 'h-32 rounded-2xl',
      };
      return (
        <div ref={ref} className={cn('space-y-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={cn('bg-white/5 animate-pulse', styles[variant])} />
          ))}
        </div>
      );
    }
  )
);

SkeletonLoader.displayName = 'SkeletonLoader';
