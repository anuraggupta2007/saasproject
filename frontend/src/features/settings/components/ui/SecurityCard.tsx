import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Smartphone, Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Button } from '@/features/backup/components/ui/Button';
import { cn } from '@/utils/cn';
import type { SecuritySettings } from '../../types';

interface SecurityCardProps {
  security: SecuritySettings;
  onChangePassword?: () => void;
  onEnable2FA?: () => void;
  onDisable2FA?: () => void;
  className?: string;
}

export const SecurityCard = memo(
  forwardRef<HTMLDivElement, SecurityCardProps>(
    ({ security, onChangePassword, onEnable2FA, onDisable2FA, className }, ref) => {
      const securityScore = calculateSecurityScore(security);

      return (
        <Card ref={ref} variant="elevated" padding="lg" className={cn('', className)}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Security</h3>
                <p className="text-sm text-slate-400">Manage your security settings</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Security Score</p>
              <p className={cn('text-2xl font-bold', securityScore >= 80 ? 'text-emerald-400' : securityScore >= 50 ? 'text-amber-400' : 'text-red-400')}>
                {securityScore}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Password</p>
                    <p className="text-xs text-slate-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onChangePassword}>Change</Button>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Two-Factor Auth</p>
                    <p className="text-xs text-slate-500">{security.twoFactorEnabled ? `Enabled via ${security.twoFactorMethod.toUpperCase()}` : 'Not enabled'}</p>
                  </div>
                </div>
                {security.twoFactorEnabled ? (
                  <Badge variant="success" size="sm" dot>Enabled</Badge>
                ) : (
                  <Button variant="brand" size="sm" onClick={onEnable2FA}>Enable</Button>
                )}
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-white">Backup Codes</p>
                  <p className="text-xs text-slate-500">{security.backupCodes?.length || 0} codes available</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-white">Session Timeout</p>
                  <p className="text-xs text-slate-500">{security.sessionTimeout} minutes</p>
                </div>
              </div>
            </div>
          </div>

          {security.twoFactorEnabled && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={onDisable2FA} className="text-red-400 hover:text-red-300">
                Disable 2FA
              </Button>
            </div>
          )}
        </Card>
      );
    }
  )
);

function calculateSecurityScore(security: SecuritySettings): number {
  let score = 0;
  if (security.twoFactorEnabled) score += 40;
  if (security.loginNotifications) score += 20;
  if (security.backupCodes?.length > 0) score += 20;
  if (security.sessionTimeout <= 60) score += 20;
  return score;
}

SecurityCard.displayName = 'SecurityCard';
