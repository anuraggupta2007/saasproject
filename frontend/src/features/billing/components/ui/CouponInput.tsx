import { memo, forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { Input } from '@/features/backup/components/ui/Input';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';
import { useValidateCoupon } from '../../hooks';
import type { CouponValidation, PlanInterval } from '../../types';
import { toast } from 'react-hot-toast';

interface CouponInputProps {
  planId: string;
  interval: PlanInterval;
  onApply: (validation: CouponValidation) => void;
  onRemove?: () => void;
  appliedCoupon?: CouponValidation | null;
  disabled?: boolean;
  className?: string;
}

export const CouponInput = memo(
  forwardRef<HTMLDivElement, CouponInputProps>(
    ({ planId, interval, onApply, onRemove, appliedCoupon, disabled = false, className }, ref) => {
      const [code, setCode] = useState('');

      const { data: validation, isLoading, isError } = useValidateCoupon(
        code.length >= 3 ? code : '',
        planId,
        interval
      );

      const handleApply = useCallback(() => {
        if (validation?.valid && validation.coupon) {
          onApply(validation);
          toast.success(`Coupon "${validation.coupon.code}" applied`);
        } else {
          toast.error(validation?.error || 'Invalid coupon code');
        }
      }, [validation, onApply]);

      const handleRemove = useCallback(() => {
        setCode('');
        onRemove?.();
      }, [onRemove]);

      if (appliedCoupon?.valid) {
        return (
          <div ref={ref} className={cn('flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl', className)}>
            <Tag className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-400">{appliedCoupon.coupon?.code}</p>
              <p className="text-xs text-slate-400">
                {appliedCoupon.coupon?.type === 'percentage'
                  ? `${appliedCoupon.coupon?.value}% off`
                  : `$${appliedCoupon.coupon?.value} off`
                }
                {' • '}
                Saving {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(appliedCoupon.discount)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove} leftIcon={<X className="w-4 h-4" />}>
              Remove
            </Button>
          </div>
        );
      }

      return (
        <div ref={ref} className={cn('', className)}>
          <label className="block text-sm font-medium text-slate-300 mb-2">Coupon Code</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Enter coupon code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={disabled}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && validation?.valid) {
                    handleApply();
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleApply}
              disabled={disabled || !validation?.valid || isLoading}
              loading={isLoading}
            >
              Apply
            </Button>
          </div>
          {code.length >= 3 && !isLoading && !isError && validation && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('text-xs mt-1.5', validation.valid ? 'text-emerald-400' : 'text-red-400')}
            >
              {validation.valid ? (
                <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Valid — {validation.coupon?.type === 'percentage' ? `${validation.coupon?.value}% off` : `$${validation.coupon?.value} off`}</span>
              ) : (
                <span>{validation.error || 'Invalid coupon code'}</span>
              )}
            </motion.p>
          )}
        </div>
      );
    }
  )
);

CouponInput.displayName = 'CouponInput';
