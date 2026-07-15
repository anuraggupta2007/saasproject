import React, { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface AvatarProps extends HTMLMotionProps<'div'> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  fallbackIcon?: React.ReactNode;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-2xl',
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

const statusPositionClasses = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-brand-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = memo(
  forwardRef<HTMLDivElement, AvatarProps>(
    (
      {
        src,
        alt,
        name,
        size = 'md',
        shape = 'circle',
        status,
        statusPosition = 'bottom-right',
        fallbackIcon,
        className,
        ...props
      },
      ref
    ) => {
      const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
      const hasImage = Boolean(src);

      return (
        <motion.div
          ref={ref}
          className={cn('relative inline-flex shrink-0 overflow-hidden', sizeClasses[size], shapeClass, className)}
          {...props}
        >
          {hasImage ? (
            <img
              src={src}
              alt={alt ?? name ?? 'Avatar'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : name ? (
            <div
              className={cn('w-full h-full flex items-center justify-center font-medium text-white', getColorFromName(name))}
            >
              {getInitials(name)}
            </div>
          ) : fallbackIcon ? (
            <div className="w-full h-full flex items-center justify-center text-white/60">
              {fallbackIcon}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 bg-white/5">
              <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          {status && (
            <motion.span
              className={cn(
                'absolute rounded-full border-2 border-surface-900',
                statusSizeClasses[size],
                statusColors[status],
                statusPositionClasses[statusPosition]
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </motion.div>
      )
    }
  )
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  max?: number;
  overlap?: number;
  size?: AvatarProps['size'];
}

export const AvatarGroup = memo(
  forwardRef<HTMLDivElement, AvatarGroupProps>(
    ({ children, max = 5, overlap = 8, size = 'md', className, ...props }, ref) => {
      const childArray = Array.isArray(children) ? children : [children];
      const visibleChildren = childArray.slice(0, max);
      const remainingCount = childArray.length - max;

      return (
        <motion.div
          ref={ref}
          className={cn('flex items-center', className)}
          {...props}
        >
          {visibleChildren.map((child, index) =>
            React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
              key: index,
              style: { ...((child.props as { style?: React.CSSProperties }).style || {}), zIndex: max - index, marginLeft: index > 0 ? -overlap : 0 } as React.CSSProperties,
            })
          )}
          {remainingCount > 0 && (
            <motion.div
              className={cn(
                'flex items-center justify-center font-medium text-white border-2 border-surface-900',
                sizeClasses[size]
              )}
              style={{ zIndex: 0, marginLeft: -overlap }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              +{remainingCount}
            </motion.div>
          )}
        </motion.div>
      )
    }
  )
);

AvatarGroup.displayName = 'AvatarGroup';