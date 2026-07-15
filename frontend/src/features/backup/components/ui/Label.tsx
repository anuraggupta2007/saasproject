import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-slate-300 mb-1', className)}
      {...props}
    >
      {children}
    </label>
  )
);

Label.displayName = 'Label';
