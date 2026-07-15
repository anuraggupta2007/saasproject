import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, RefreshCw, ArrowUpRight, ArrowDownRight, Key, Tag, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { BillingHistoryEntry } from '../../types';

interface BillingTimelineProps {
  entries: BillingHistoryEntry[];
  className?: string;
}

function getEntryIcon(type: BillingHistoryEntry['type']) {
  switch (type) {
    case 'payment': return <CreditCard className="w-4 h-4" />;
    case 'refund': return <RefreshCw className="w-4 h-4" />;
    case 'subscription_change': return <ArrowUpRight className="w-4 h-4" />;
    case 'license_activate': return <Key className="w-4 h-4" />;
    case 'coupon_apply': return <Tag className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
}

function getEntryColor(type: BillingHistoryEntry['type']) {
  const colors: Record<string, string> = {
    payment: 'bg-emerald-500/10 text-emerald-400',
    refund: 'bg-amber-500/10 text-amber-400',
    subscription_change: 'bg-blue-500/10 text-blue-400',
    license_activate: 'bg-purple-500/10 text-purple-400',
    coupon_apply: 'bg-cyan-500/10 text-cyan-400',
  };
  return colors[type] || 'bg-slate-500/10 text-slate-400';
}

function getStatusIcon(status: string) {
  if (status === 'succeeded' || status === 'applied' || status === 'activated') {
    return <CheckCircle className="w-3 h-3 text-emerald-400" />;
  }
  if (status === 'failed' || status === 'refunded') {
    return <XCircle className="w-3 h-3 text-red-400" />;
  }
  return <Clock className="w-3 h-3 text-amber-400" />;
}

function formatAmount(amount?: number, currency?: string) {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(amount);
}

export const BillingTimeline = memo(
  forwardRef<HTMLDivElement, BillingTimelineProps>(
    ({ entries, className }, ref) => {
      return (
        <div ref={ref} className={cn('relative pl-6 border-l border-white/10', className)}>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pb-6 last:pb-0"
            >
              <div className={cn(
                'absolute left-[-22px] top-0 w-8 h-8 rounded-full flex items-center justify-center z-10',
                getEntryColor(entry.type)
              )}>
                {getEntryIcon(entry.type)}
              </div>
              <div className="ml-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{entry.description}</span>
                  {getStatusIcon(entry.status)}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  {entry.amount !== undefined && entry.amount !== null && (
                    <span className={cn(
                      'text-xs font-medium',
                      entry.type === 'refund' ? 'text-amber-400' : 'text-white'
                    )}>
                      {entry.type === 'refund' ? '-' : ''}{formatAmount(entry.amount, entry.currency)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }
  )
);

BillingTimeline.displayName = 'BillingTimeline';
