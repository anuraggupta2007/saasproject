import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, User, Shield, Key, Link, CreditCard, Trash2, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ActivityLogEntry } from '../../types';

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  className?: string;
}

function getCategoryIcon(category: ActivityLogEntry['category']) {
  switch (category) {
    case 'login': return <LogIn className="w-4 h-4" />;
    case 'profile': return <User className="w-4 h-4" />;
    case 'security': return <Shield className="w-4 h-4" />;
    case 'api_key': return <Key className="w-4 h-4" />;
    case 'connected_account': return <Link className="w-4 h-4" />;
    case 'subscription': return <CreditCard className="w-4 h-4" />;
    case 'account': return <Trash2 className="w-4 h-4" />;
    default: return <Settings className="w-4 h-4" />;
  }
}

function getCategoryColor(category: ActivityLogEntry['category']) {
  const colors: Record<string, string> = {
    login: 'bg-emerald-500/10 text-emerald-400',
    profile: 'bg-blue-500/10 text-blue-400',
    security: 'bg-amber-500/10 text-amber-400',
    api_key: 'bg-purple-500/10 text-purple-400',
    connected_account: 'bg-cyan-500/10 text-cyan-400',
    subscription: 'bg-brand-500/10 text-brand-400',
    account: 'bg-red-500/10 text-red-400',
  };
  return colors[category] || 'bg-slate-500/10 text-slate-400';
}

export const ActivityTimeline = memo(
  forwardRef<HTMLDivElement, ActivityTimelineProps>(
    ({ entries, className }, ref) => (
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
              getCategoryColor(entry.category)
            )}>
              {getCategoryIcon(entry.category)}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white">{entry.description}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
                {entry.ipAddress && (
                  <span className="text-xs text-slate-600 font-mono">{entry.ipAddress}</span>
                )}
                {entry.location && (
                  <span className="text-xs text-slate-500">{entry.location}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )
  )
);

ActivityTimeline.displayName = 'ActivityTimeline';
