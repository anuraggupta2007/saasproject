import { memo } from 'react';
import { cn } from '@/utils/cn';

interface SkeletonLoaderProps {
  count?: number;
  variant?: 'card' | 'row' | 'stat';
  className?: string;
}

export const SkeletonLoader = memo(({ count = 3, variant = 'card', className }: SkeletonLoaderProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('animate-pulse bg-white/5 rounded-xl', {
            'h-32': variant === 'card',
            'h-14': variant === 'row',
            'h-24': variant === 'stat',
          })}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';
