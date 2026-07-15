import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Globe, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { ActiveSession } from '../../types';

interface SessionTableProps {
  sessions: ActiveSession[];
  onRevoke: (id: string) => void;
  className?: string;
}

export const SessionTable = memo(
  forwardRef<HTMLDivElement, SessionTableProps>(
    ({ sessions, onRevoke, className }, ref) => {
      return (
        <div ref={ref} className={cn('space-y-3', className)}>
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                {session.platform === 'desktop' ? (
                  <Monitor className="w-5 h-5 text-slate-400" />
                ) : (
                  <Smartphone className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{session.deviceName}</p>
                  {session.isCurrent && (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" /> Current
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{session.platform} • {session.browser}</span>
                  <span>{session.ipAddress}</span>
                  {session.location && <span>{session.location}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Last active: {new Date(session.lastActiveAt).toLocaleString()}
                </p>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(session.id)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  className="text-red-400 hover:text-red-300 flex-shrink-0"
                >
                  Revoke
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      );
    }
  )
);

SessionTable.displayName = 'SessionTable';
