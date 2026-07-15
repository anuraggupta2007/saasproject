import { memo, forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Key, Copy, CheckCircle, Shield, Smartphone, Monitor, Trash2, RefreshCw, Clock } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';
import type { License } from '../../types';
import { toast } from 'react-hot-toast';

interface LicenseCardProps {
  license: License;
  onActivate?: (key: string) => void;
  onDeactivate?: (activationId: string) => void;
  onRegenerate?: () => void;
  className?: string;
}

function getStatusConfig(status: License['status']) {
  const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'neutral', label: 'Inactive' },
    expired: { variant: 'error', label: 'Expired' },
    revoked: { variant: 'error', label: 'Revoked' },
    pending: { variant: 'warning', label: 'Pending' },
  };
  return configs[status] || configs.inactive;
}

function maskKey(key: string): string {
  if (key.length <= 16) return key;
  return key.slice(0, 8) + '••••••••' + key.slice(-8);
}

export const LicenseCard = memo(
  forwardRef<HTMLDivElement, LicenseCardProps>(
    ({ license, onActivate, onDeactivate, onRegenerate, className }, ref) => {
      const [showKey, setShowKey] = useState(false);
      const statusConfig = getStatusConfig(license.status);
      const remainingActivations = license.maxActivations - license.activations.length;

      const copyKey = useCallback(() => {
        navigator.clipboard.writeText(license.key);
        toast.success('License key copied');
      }, [license.key]);

      return (
        <Card ref={ref} variant="elevated" padding="lg" className={cn('', className)}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{license.planName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusConfig.variant} size="sm" dot>{statusConfig.label}</Badge>
                  <Badge variant="default" size="sm">{license.type}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Activations</p>
              <p className="text-lg font-bold text-white">{license.activations.length}/{license.maxActivations}</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">License Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-mono text-sm text-white">
                {showKey ? license.key : maskKey(license.key)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? 'Hide' : 'Show'}
              </Button>
              <Button variant="ghost" size="sm" onClick={copyKey} leftIcon={<Copy className="w-4 h-4" />}>
                Copy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {license.activatedAt && (
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-slate-500">Activated</p>
                <p className="text-sm text-white">{new Date(license.activatedAt).toLocaleDateString()}</p>
              </div>
            )}
            {license.expiresAt && (
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-slate-500">Expires</p>
                <p className="text-sm text-white">{new Date(license.expiresAt).toLocaleDateString()}</p>
              </div>
            )}
            {license.lastValidatedAt && (
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-xs text-slate-500">Last Validated</p>
                <p className="text-sm text-white">{new Date(license.lastValidatedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {license.activations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Activated Devices</h4>
              <div className="space-y-2">
                {license.activations.map((activation) => (
                  <div key={activation.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      {activation.platform === 'desktop' ? (
                        <Monitor className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-slate-400" />
                      )}
                      <div>
                        <p className="text-sm text-white">{activation.deviceName}</p>
                        <p className="text-xs text-slate-500">
                          {activation.platform} • Last seen {new Date(activation.lastSeenAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activation.isCurrent && (
                        <Badge variant="success" size="sm">Current</Badge>
                      )}
                      {onDeactivate && !activation.isCurrent && (
                        <Button variant="ghost" size="sm" onClick={() => onDeactivate(activation.id)} leftIcon={<Trash2 className="w-3 h-3" />}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {remainingActivations > 0 && (
                <p className="text-xs text-slate-500 mt-2">{remainingActivations} activation(s) remaining</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {license.status === 'pending' && onActivate && (
              <Button variant="brand" leftIcon={<CheckCircle className="w-4 h-4" />} onClick={() => onActivate(license.key)}>
                Activate
              </Button>
            )}
            {onRegenerate && license.status === 'active' && (
              <Button variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={onRegenerate}>
                Regenerate Key
              </Button>
            )}
          </div>
        </Card>
      );
    }
  )
);

LicenseCard.displayName = 'LicenseCard';
