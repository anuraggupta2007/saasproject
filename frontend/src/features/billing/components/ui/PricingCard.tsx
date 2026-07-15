import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, ArrowRight, Zap } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { Plan, PlanInterval } from '../../types';

interface PricingCardProps {
  plan: Plan;
  interval: PlanInterval;
  isCurrentPlan?: boolean;
  onSelect: (planId: string) => void;
  className?: string;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

export const PricingCard = memo(
  forwardRef<HTMLDivElement, PricingCardProps>(
    ({ plan, interval, isCurrentPlan = false, onSelect, className }, ref) => {
      const price = plan.prices[interval];
      const isEnterprise = plan.tier === 'enterprise';
      const isFree = plan.tier === 'free';

      return (
        <motion.div ref={ref} className={className} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card
            variant={plan.isPopular ? 'elevated' : 'default'}
            padding="none"
            className={cn(
              'relative overflow-hidden h-full flex flex-col',
              plan.isPopular && 'border-brand-500/50 ring-1 ring-brand-500/20',
              isCurrentPlan && 'border-emerald-500/50 ring-1 ring-emerald-500/20'
            )}
          >
            {plan.isPopular && (
              <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Most Popular</span>
              </div>
            )}
            {isCurrentPlan && (
              <div className="bg-emerald-500/20 px-4 py-2 flex items-center justify-center">
                <span className="text-sm font-semibold text-emerald-400">Current Plan</span>
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
              </div>
              <div className="mb-6">
                {isFree ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">Free</span>
                  </div>
                ) : isEnterprise ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">Custom</span>
                  </div>
                ) : price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{formatPrice(price.amount)}</span>
                    <span className="text-slate-400">/{interval === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                ) : null}
                {price?.savingsPercentage && (
                  <p className="text-sm text-emerald-400 mt-1">Save {price.savingsPercentage}% with yearly billing</p>
                )}
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.slice(0, 6).map((feature) => (
                  <li key={feature.name} className="flex items-start gap-2">
                    <Check className={cn('w-4 h-4 mt-0.5 flex-shrink-0', feature.included ? 'text-emerald-400' : 'text-slate-600')} />
                    <span className={cn('text-sm', feature.included ? 'text-slate-300' : 'text-slate-500')}>
                      {feature.name}
                      {feature.limit !== undefined && ` (${feature.limit.toLocaleString()} ${feature.unit || ''})`}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.isPopular ? 'brand' : isCurrentPlan ? 'success' : 'outline'}
                fullWidth
                size="lg"
                onClick={() => onSelect(plan.id)}
                disabled={isCurrentPlan}
                rightIcon={isEnterprise ? undefined : <ArrowRight className="w-4 h-4" />}
              >
                {isCurrentPlan ? 'Current Plan' : isEnterprise ? 'Contact Sales' : isFree ? 'Get Started' : 'Upgrade'}
              </Button>
            </div>
          </Card>
        </motion.div>
      );
    }
  )
);

PricingCard.displayName = 'PricingCard';
