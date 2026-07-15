import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(
    (
      {
        children,
        variant = 'default',
        padding = 'md',
        hoverable = false,
        onClick,
        className,
        style,
        ...props
      },
      ref
    ) => {
      const baseStyles = 'rounded-2xl transition-all duration-200';
      const variantStyles = {
        default: 'bg-white/5 border border-white/10',
        elevated: 'bg-white/5 border border-white/10 shadow-xl shadow-black/20',
        outlined: 'bg-transparent border border-white/20',
        glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
      };
      const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      };
      const hoverStyles = hoverable
        ? 'hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 cursor-pointer'
        : '';

      return (
        <motion.div
          ref={ref}
          className={cn(baseStyles, variantStyles[variant], paddingStyles[padding], hoverStyles, className)}
          style={style}
          whileHover={hoverable ? { y: -2, scale: 1.01 } : undefined}
          whileTap={hoverable ? { scale: 0.99 } : undefined}
          onClick={onClick}
          {...props}
        >
          {children}
        </motion.div>
      )
    }
  )
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLMotionProps<'div'> {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader = memo(
  forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ title, subtitle, action, icon, className, ...props }, ref) => (
      <motion.div
        ref={ref}
        className={cn('flex items-start justify-between mb-4', className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">{icon}</div>}
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </motion.div>
    )
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLMotionProps<'div'> {}

export const CardContent = memo(
  forwardRef<HTMLDivElement, CardContentProps>(
    ({ children, className, ...props }, ref) => (
      <motion.div ref={ref} className={cn('', className)} {...props}>
        {children}
      </motion.div>
    )
  )
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLMotionProps<'div'> {
  divider?: boolean;
}

export const CardFooter = memo(
  forwardRef<HTMLDivElement, CardFooterProps>(
    ({ children, divider = true, className, ...props }, ref) => (
      <motion.div
        ref={ref}
        className={cn('flex items-center justify-end gap-3 mt-4 pt-4', divider && 'border-t border-white/10', className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  )
);

CardFooter.displayName = 'CardFooter';