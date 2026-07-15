import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';

interface RenewalBannerProps {
  renewalDate: string;
  daysUntilRenewal: number;
  onUpgrade?: () => void;
  className?: string;
}

export const RenewalBanner = memo(
  forwardRef<HTMLDivElement, RenewalBannerProps>(
    ({ renewalDate, daysUntilRenewal, onUpgrade, className }, ref) => {
      const isUrgent = daysUntilRenewal <= 7;
      const isWarning = daysUntilRenewal <= 30;

      return (
        <motion.div
          ref={ref}
          className={cn(
            'flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border',
            isUrgent
              ? 'bg-red-500/10 border-red-500/20'
              : isWarning
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-blue-500/10 border-blue-500/20',
            className
          )}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            isUrgent ? 'bg-red-500/20 text-red-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
          )}>
            {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className={cn(
              'text-sm font-medium',
              isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-blue-400'
            )}>
              {isUrgent
                ? `Your subscription renews in ${daysUntilRenewal} days`
                : isWarning
                ? `Your subscription renews in ${daysUntilRenewal} days`
                : `Next billing on ${new Date(renewalDate).toLocaleDateString()}`
              }
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isUrgent
                ? 'Please ensure your payment method is up to date'
                : 'Your plan will automatically renew'
              }
            </p>
          </div>
          {onUpgrade && (
            <Button variant="outline" size="sm" onClick={onUpgrade} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Upgrade
            </Button>
          )}
        </motion.div>
      );
    }
  )
);

RenewalBanner.displayName = 'RenewalBanner';
