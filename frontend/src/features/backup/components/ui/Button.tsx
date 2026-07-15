import React, { memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ButtonProps extends HTMLMotionProps<'button'> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'brand';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variantStyles = {
  primary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 active:bg-white/5',
  secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 active:bg-white/5',
  outline: 'bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 active:bg-white/5',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-400 border border-transparent active:bg-white/5',
  destructive: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 active:bg-red-500/10',
  success: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 active:bg-emerald-500/10',
  brand: 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-500/90 hover:to-brand-600/90 text-white border-none shadow-lg shadow-brand-500/25 active:from-brand-500/80 active:to-brand-600/80',
};

const sizeStyles = {
  xs: 'px-2.5 py-1.5 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-2.5',
};

const iconSizeStyles = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        variant = 'primary',
        size = 'md',
        loading = false,
        leftIcon,
        rightIcon,
        fullWidth = false,
        disabled,
        className,
        children,
        ...props
      },
      ref
    ) => {
      const isDisabled = disabled || loading;

      return (
        <motion.button
          ref={ref}
          disabled={isDisabled}
          className={cn(
            'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && 'w-full',
            className
          )}
          whileTap={{ scale: 0.98 }}
          {...props}
        >
          {loading ? (
            <Loader2 className={cn('animate-spin', iconSizeStyles[size])} />
          ) : leftIcon ? (
            <span className={cn('flex-shrink-0', iconSizeStyles[size])}>{leftIcon}</span>
          ) : null}
          {children}
          {!loading && rightIcon && <span className={cn('flex-shrink-0', iconSizeStyles[size])}>{rightIcon}</span>}
        </motion.button>
      )
    }
  )
);

Button.displayName = 'Button';

export interface ButtonGroupProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  ariaLabel?: string;
}

export const ButtonGroup = memo(
  forwardRef<HTMLDivElement, ButtonGroupProps>(
    ({ children, variant, size, ariaLabel, className, ...props }, ref) => {
      const childArray = Array.isArray(children) ? children : [children];
      return (
        <motion.div
          ref={ref}
          className={cn('inline-flex items-center rounded-xl bg-white/5 p-0.5', className)}
          role="group"
          aria-label={ariaLabel}
          {...props}
        >
          {childArray.map((child, index) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<ButtonProps>, {
                  key: index,
                  variant: (child.props as ButtonProps).variant ?? variant,
                  size: (child.props as ButtonProps).size ?? size,
                  className: cn(
                    'rounded-lg',
                    index === 0 && 'rounded-r-none',
                    index === childArray.length - 1 && 'rounded-l-none',
                    (child.props as ButtonProps).className
                  ),
                })
              : child
          )}
        </motion.div>
      )
    }
  )
);

ButtonGroup.displayName = 'ButtonGroup';

export interface ToggleButtonProps extends Omit<ButtonProps, 'onChange'> {
  pressed?: boolean;
  onChange?: (pressed: boolean) => void;
}

export const ToggleButton = memo(
  forwardRef<HTMLButtonElement, ToggleButtonProps>(
    ({ pressed = false, onChange, variant = 'outline', className, ...props }, ref) => {
      const effectiveVariant = pressed ? 'brand' : variant;
      return (
        <Button
          ref={ref}
          variant={effectiveVariant}
          className={cn(className, pressed && 'ring-2 ring-brand-500/50')}
          onClick={() => onChange?.(!pressed)}
          aria-pressed={pressed}
          {...props}
        />
      )
    }
  )
);

ToggleButton.displayName = 'ToggleButton';

export interface DropdownButtonProps extends ButtonProps {
  items: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    danger?: boolean;
    dividerAfter?: boolean;
  }>;
  trigger?: 'click' | 'hover';
  align?: 'left' | 'right';
}

export const DropdownButton = memo(
  forwardRef<HTMLButtonElement, DropdownButtonProps>(
    ({ items, trigger = 'click', align = 'right', rightIcon, className, ...props }, ref) => {
      const [open, setOpen] = React.useState(false);
      const buttonRef = React.useRef<HTMLButtonElement>(null);
      const menuRef = React.useRef<HTMLDivElement>(null);

      React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (buttonRef.current?.contains(event.target as Node)) return;
          if (menuRef.current?.contains(event.target as Node)) return;
          setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

      return (
        <div className="relative inline-flex">
          <Button
            ref={(el) => { buttonRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
            rightIcon={rightIcon ?? <ChevronDown className="w-4 h-4" />}
            className={className}
            {...props}
            onClick={(e) => {
              if (trigger === 'click') {
                e.preventDefault();
                setOpen(!open);
              }
              props.onClick?.(e);
            }}
            onMouseEnter={() => trigger === 'hover' && setOpen(true)}
            onMouseLeave={() => trigger === 'hover' && setOpen(false)}
          />
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'absolute top-full mt-2 z-50 min-w-[180px] glass-strong rounded-xl py-1.5 shadow-2xl border border-white/10',
                  align === 'right' ? 'right-0' : 'left-0'
                )}
                onMouseEnter={() => trigger === 'hover' && setOpen(true)}
                onMouseLeave={() => trigger === 'hover' && setOpen(false)}
              >
                {items.map((item, index) => (
                  <motion.button
                    key={index}
                    disabled={item.disabled}
                    onClick={() => { item.onClick(); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                      'hover:bg-white/5 focus:outline-none focus:bg-white/5',
                      item.danger ? 'text-red-400' : 'text-slate-300',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    style={{ opacity: item.disabled ? 0.5 : 1 }}
                  >
                    {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                    {item.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }
  )
);

DropdownButton.displayName = 'DropdownButton';