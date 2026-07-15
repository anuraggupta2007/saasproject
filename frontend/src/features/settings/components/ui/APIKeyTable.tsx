import { memo, forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Key, Copy, Trash2, RefreshCw, Eye, EyeOff, Clock, Shield } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { APIKey } from '../../types';
import { toast } from 'react-hot-toast';

interface APIKeyTableProps {
  keys: APIKey[];
  onRevoke: (id: string) => void;
  onRegenerate: (id: string) => void;
  className?: string;
}

function getStatusConfig(status: APIKey['status']) {
  const configs: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    revoked: { variant: 'error', label: 'Revoked' },
    expired: { variant: 'warning', label: 'Expired' },
  };
  return configs[status] || configs.active;
}

export const APIKeyTable = memo(
  forwardRef<HTMLDivElement, APIKeyTableProps>(
    ({ keys, onRevoke, onRegenerate, className }, ref) => {
      const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

      const toggleVisibility = useCallback((id: string) => {
        setVisibleKeys((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
      }, []);

      const copyKey = useCallback((key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('API key copied');
      }, []);

      return (
        <div ref={ref} className={cn('space-y-3', className)}>
          {keys.map((apiKey) => {
            const statusConfig = getStatusConfig(apiKey.status);
            const isVisible = visibleKeys.has(apiKey.id);

            return (
              <motion.div
                key={apiKey.id}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{apiKey.name}</p>
                      <p className="text-xs text-slate-500">Created {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 px-3 py-2 bg-white/5 rounded-lg font-mono text-xs text-slate-300">
                    {isVisible ? apiKey.key : `${apiKey.prefix}${'*'.repeat(24)}`}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleVisibility(apiKey.id)}>
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copyKey(apiKey.key)} leftIcon={<Copy className="w-4 h-4" />}>
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {apiKey.lastUsedAt && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                    )}
                    {apiKey.expiresAt && (
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" />Expires {new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                    )}
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{apiKey.permissions.join(', ')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onRegenerate(apiKey.id)} leftIcon={<RefreshCw className="w-3 h-3" />}>
                      Regenerate
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRevoke(apiKey.id)} leftIcon={<Trash2 className="w-3 h-3" />} className="text-red-400 hover:text-red-300">
                      Revoke
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      );
    }
  )
);

APIKeyTable.displayName = 'APIKeyTable';
