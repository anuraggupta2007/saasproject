import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, RefreshCw, AlertTriangle, CheckCircle, XCircle, Pause } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';
import type { Subscription } from '../../types';

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel?: () => void;
  onResume?: () => void;
  onUpgrade?: () => void;
  onChangePlan?: () => void;
  className?: string;
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

function getStatusConfig(status: Subscription['status']) {
  const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string; icon: React.ReactNode }> = {
    active: { variant: 'success', label: 'Active', icon: <CheckCircle className="w-4 h-4" /> },
    trialing: { variant: 'info', label: 'Trial', icon: <RefreshCw className="w-4 h-4" /> },
    past_due: { variant: 'warning', label: 'Past Due', icon: <AlertTriangle className="w-4 h-4" /> },
    canceled: { variant: 'neutral', label: 'Canceled', icon: <XCircle className="w-4 h-4" /> },
    expired: { variant: 'error', label: 'Expired', icon: <XCircle className="w-4 h-4" /> },
    paused: { variant: 'warning', label: 'Paused', icon: <Pause className="w-4 h-4" /> },
  };
  return configs[status] || configs.active;
}

export const SubscriptionCard = memo(
  forwardRef<HTMLDivElement, SubscriptionCardProps>(
    ({ subscription, onCancel, onResume, onUpgrade, onChangePlan, className }, ref) => {
      const statusConfig = getStatusConfig(subscription.status);
      const renewalDate = new Date(subscription.currentPeriodEnd);
      const isTrialActive = subscription.status === 'trialing' && subscription.trialEnd;

      return (
        <Card ref={ref} variant="elevated" padding="lg" className={cn('', className)}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-white">{subscription.planName}</h3>
                <Badge variant={statusConfig.variant} size="sm" dot>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-slate-400 capitalize">{subscription.interval} billing</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatPrice(subscription.price.amount, subscription.price.currency)}
              </p>
              <p className="text-sm text-slate-400">/{subscription.interval === 'yearly' ? 'year' : 'month'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Billing Period</p>
                <p className="text-sm text-white">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} — {renewalDate.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <RefreshCw className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Next Billing</p>
                <p className="text-sm text-white">
                  {subscription.cancelAtPeriodEnd ? 'Will not renew' : renewalDate.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Auto-Renew</p>
                <p className={cn('text-sm', subscription.cancelAtPeriodEnd ? 'text-amber-400' : 'text-white')}>
                  {subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                </p>
              </div>
            </div>
          </div>

          {isTrialActive && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-6">
              <p className="text-sm text-blue-400">
                Trial ends on {new Date(subscription.trialEnd!).toLocaleDateString()}
              </p>
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
              <p className="text-sm text-amber-400">
                Your subscription will not renew. Access continues until {renewalDate.toLocaleDateString()}.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {subscription.status === 'active' && onUpgrade && (
              <Button variant="brand" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={onUpgrade}>
                Upgrade Plan
              </Button>
            )}
            {onChangePlan && (
              <Button variant="outline" onClick={onChangePlan}>
                Change Plan
              </Button>
            )}
            {subscription.cancelAtPeriodEnd && onResume && (
              <Button variant="success" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={onResume}>
                Resume Subscription
              </Button>
            )}
            {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && onCancel && (
              <Button variant="destructive" onClick={onCancel}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>
      );
    }
  )
);

SubscriptionCard.displayName = 'SubscriptionCard';
