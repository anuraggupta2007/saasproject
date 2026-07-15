import React from 'react';
import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, ChevronRight, Lock, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, Badge, Avatar, Button, Progress, StatusBadge } from './ui';
import { cn } from '@/utils/cn';
import type { ConnectedAccount as ConnectedAccountOriginal } from '../types';

interface Provider {
  id: string;
  displayName: string;
  description?: string;
  logo?: string;
  category?: string;
  features: Array<{ key: string; label: string }>;
  requiresAppPassword?: boolean;
  oauthScopes?: string[];
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

interface ConnectedAccount extends Omit<ConnectedAccountOriginal, 'provider'> {
  provider: Provider;
}

interface ProviderCardProps {
  provider: Provider;
  connected?: boolean;
  connecting?: boolean;
  error?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  onTestConnection?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

export const ProviderCard = memo(
  forwardRef<HTMLDivElement, ProviderCardProps>(
    (
      {
        provider,
        connected = false,
        connecting = false,
        error,
        onConnect,
        onDisconnect,
        onConfigure,
        onTestConnection,
        variant = 'default',
        className,
      },
      ref
    ) => {
      const isOAuth = provider.category === 'oauth' && provider.oauthScopes?.length;
      const requiresAppPassword = provider.requiresAppPassword;

      if (variant === 'compact') {
        return (
          <motion.div
            ref={ref}
            className={cn('flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors', className)}
            whileHover={{ x: 4 }}
          >
            <div className="flex-shrink-0">
              <Avatar src={provider.logo} name={provider.displayName} size="lg" fallbackIcon={provider.logo ? undefined : provider.logo} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white truncate">{provider.displayName}</h4>
                {connected && <Badge variant="success" size="sm" dot>Connected</Badge>}
                {connecting && <Badge variant="info" size="sm" dot>Connecting...</Badge>}
                {error && <Badge variant="error" size="sm" dot>Error</Badge>}
              </div>
              <p className="text-sm text-slate-400 truncate">{provider.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {connected && onDisconnect && (
                <Button variant="ghost" size="sm" onClick={onDisconnect} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Disconnect
                </Button>
              )}
              {!connected && !connecting && onConnect && (
                <Button variant="brand" size="sm" onClick={onConnect} loading={connecting}>
                  Connect
                </Button>
              )}
              {connected && onConfigure && (
                <Button variant="outline" size="sm" onClick={onConfigure} leftIcon={<ExternalLink className="w-4 h-4" />}>
                  Configure
                </Button>
              )}
            </div>
          </motion.div>
        );
      }

      if (variant === 'featured') {
        return (
          <motion.div
            ref={ref}
            className={cn('relative overflow-hidden', className)}
            whileHover={{ y: -4 }}
          >
            <Card variant="elevated" padding="lg" className="relative h-full">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-brand-600" />
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar src={provider.logo} name={provider.displayName} size="xl" fallbackIcon={provider.logo ? undefined : provider.logo} />
                  <div>
                    <h3 className="text-xl font-bold text-white">{provider.displayName}</h3>
                    <p className="text-slate-400">{provider.description}</p>
                  </div>
                </div>
                <Badge variant={connected ? 'success' : 'neutral'} size="lg" dot>
                  {connected ? 'Connected' : 'Available'}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                {provider.features.map((feature) => (
                  <div key={feature.key} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{feature.label}</span>
                  </div>
                ))}
              </div>

              {requiresAppPassword && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                  <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-amber-300">Requires App Password for authentication</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {connected ? (
                  <>
                    {onConfigure && (
                      <Button variant="outline" onClick={onConfigure} leftIcon={<ExternalLink className="w-4 h-4" />}>
                        Settings
                      </Button>
                    )}
                    {onTestConnection && (
                      <Button variant="secondary" onClick={onTestConnection} leftIcon={<RefreshCw className="w-4 h-4" />}>
                        Test Connection
                      </Button>
                    )}
                    {onDisconnect && (
                      <Button variant="destructive" onClick={onDisconnect}>
                        Disconnect
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="brand"
                    size="lg"
                    onClick={onConnect}
                    loading={connecting}
                    className="flex-1"
                  >
                    {connecting ? 'Connecting...' : 'Connect Account'}
                  </Button>
                )}
                {error && (
                  <div className="w-full flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        );
      }

      return (
        <motion.div
          ref={ref}
          className={cn(className)}
          whileHover={{ y: -4 }}
        >
          <Card variant="elevated" padding="lg" className="h-full">
            <CardHeader
              title={provider.displayName}
              subtitle={provider.description}
              icon={
                <Avatar src={provider.logo} name={provider.displayName} size="lg" fallbackIcon={provider.logo ? undefined : provider.logo} />
              }
              action={
                <Badge variant={connected ? 'success' : 'neutral'} size="sm" dot>
                  {connected ? 'Connected' : 'Available'}
                </Badge>
              }
            />

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {provider.features.slice(0, 4).map((feature) => (
                  <Badge key={feature.key} variant="neutral" size="sm" dot>
                    {feature.label}
                  </Badge>
                ))}
                {provider.features.length > 4 && (
                  <Badge variant="neutral" size="sm">+{provider.features.length - 4} more</Badge>
                )}
              </div>

              {requiresAppPassword && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-amber-300">Requires App Password</span>
                </div>
              )}

              {isOAuth && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Lock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span className="text-sm text-blue-300">OAuth Authentication</span>
                </div>
              )}

              {provider.imapHost && (
                <div className="text-sm text-slate-500 space-y-1">
                  <p>IMAP: {provider.imapHost}:{provider.imapPort}</p>
                  {provider.smtpHost && <p>SMTP: {provider.smtpHost}:{provider.smtpPort}</p>}
                </div>
              )}
            </CardContent>

            <CardFooter divider>
              {connected ? (
                <div className="w-full flex flex-wrap gap-2">
                  {onConfigure && (
                    <Button variant="outline" onClick={onConfigure} leftIcon={<ExternalLink className="w-4 h-4" />} className="flex-1 min-w-[120px]">
                      Settings
                    </Button>
                  )}
                  {onTestConnection && (
                    <Button variant="secondary" onClick={onTestConnection} leftIcon={<RefreshCw className="w-4 h-4" />} className="flex-1 min-w-[120px]">
                      Test
                    </Button>
                  )}
                  {onDisconnect && (
                    <Button variant="destructive" onClick={onDisconnect} className="flex-1 min-w-[120px]">
                      Disconnect
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  variant="brand"
                  className="w-full"
                  onClick={onConnect}
                  loading={connecting}
                  size="lg"
                >
                  {connecting ? 'Connecting...' : 'Connect Account'}
                </Button>
              )}
              {error && (
                <div className="w-full mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      )
    }
  )
);

ProviderCard.displayName = 'ProviderCard';

interface AccountCardProps {
  account: ConnectedAccount;
  onClick?: () => void;
  onEdit?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  onViewDetails?: () => void;
  variant?: 'default' | 'compact' | 'list';
  showActions?: boolean;
  className?: string;
}

export const AccountCard = memo(
  forwardRef<HTMLDivElement, AccountCardProps>(
    (
      {
        account,
        onClick,
        onEdit,
        onDisconnect,
        onSync,
        onViewDetails,
        variant = 'default',
        showActions = true,
        className,
      },
      ref
    ) => {
      const statusConfig = {
        connected: { variant: 'success' as const, label: 'Connected', icon: Check },
        disconnected: { variant: 'neutral' as const, label: 'Disconnected', icon: AlertCircle },
        error: { variant: 'error' as const, label: 'Error', icon: AlertCircle },
        expired: { variant: 'warning' as const, label: 'Expired', icon: AlertCircle },
        pending: { variant: 'warning' as const, label: 'Pending', icon: AlertCircle },
        syncing: { variant: 'info' as const, label: 'Syncing', icon: RefreshCw },
      } as const;

      const currentStatus = statusConfig[account.status] || statusConfig.disconnected;
      const StatusIcon = currentStatus.icon;

      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const formatRelativeTime = (dateString?: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return date.toLocaleDateString();
      };

      if (variant === 'compact') {
        return (
          <motion.div
            ref={ref}
            className={cn('flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors', className)}
            whileHover={{ x: 4 }}
            onClick={onClick}
          >
            <Avatar
              src={account.avatarUrl}
              name={account.displayName}
              size="lg"
              status={account.status === 'connected' ? 'online' : account.status === 'error' ? 'busy' : 'offline'}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-white truncate">{account.displayName}</h4>
                <StatusBadge status={account.status} size="sm" />
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="truncate">{account.email}</span>
                <span>{account.provider.displayName}</span>
                <span>Last sync: {formatRelativeTime(account.lastSyncAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={account.stats.storageUsed} max={account.stats.storageLimit} size="sm" showLabel variant="brand" className="w-32" />
              {showActions && onSync && account.status === 'connected' && (
                <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onSync(); }} leftIcon={<RefreshCw className="w-3 h-3" />} />
              )}
            </div>
          </motion.div>
        );
      }

      if (variant === 'list') {
        return (
          <motion.tr
            ref={ref as unknown as React.Ref<HTMLTableRowElement>}
            className={cn('hover:bg-white/5 transition-colors', className)}
            whileHover={{ x: 4 }}
            onClick={onClick}
          >
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar
                  src={account.avatarUrl}
                  name={account.displayName}
                  size="sm"
                  status={account.status === 'connected' ? 'online' : account.status === 'error' ? 'busy' : 'offline'}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{account.displayName}</span>
                    <StatusBadge status={account.status} size="sm" />
                  </div>
                  <span className="text-sm text-slate-400">{account.email}</span>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-slate-400">{account.provider.displayName}</td>
            <td className="px-4 py-3 text-sm text-slate-400">{formatRelativeTime(account.lastSyncAt)}</td>
            <td className="px-4 py-3">
              <Progress value={account.stats.storageUsed} max={account.stats.storageLimit} size="sm" showLabel variant="brand" className="w-40" />
            </td>
            <td className="px-4 py-3 text-sm text-slate-400">{account.stats.folderCount} folders · {account.stats.totalEmails.toLocaleString()} emails</td>
            <td className="px-4 py-3">
              {showActions && (
                <div className="flex items-center gap-1">
                  {onSync && account.status === 'connected' && (
                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onSync(); }} leftIcon={<RefreshCw className="w-3 h-3" />} />
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onEdit(); }} leftIcon={<ExternalLink className="w-3 h-3" />} />
                  )}
                  {onViewDetails && (
                    <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onViewDetails(); }} leftIcon={<Info className="w-3 h-3" />} />
                  )}
                </div>
              )}
            </td>
          </motion.tr>
        );
      }

      return (
        <motion.div
          ref={ref}
          className={cn('h-full', className)}
          whileHover={{ y: -4 }}
          onClick={onClick}
        >
          <Card variant="elevated" padding="lg" className="h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={account.avatarUrl}
                  name={account.displayName}
                  size="xl"
                  status={account.status === 'connected' ? 'online' : account.status === 'error' ? 'busy' : 'offline'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white truncate">{account.displayName}</h3>
                    <StatusBadge status={account.status} size="md" />
                  </div>
                  <p className="text-sm text-slate-400 truncate">{account.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{account.provider.displayName} · {account.id.slice(0, 8)}</p>
                </div>
              </div>
              {showActions && (
                <div className="flex items-center gap-1">
                  {onSync && account.status === 'connected' && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onSync(); }} leftIcon={<RefreshCw className="w-4 h-4" />}>
                      Sync
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} leftIcon={<ExternalLink className="w-4 h-4" />}>
                      Edit
                    </Button>
                  )}
                  {onDisconnect && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDisconnect(); }} className="text-red-400 hover:text-red-300">
                      Disconnect
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Storage Used</span>
                  <span className="font-medium text-white">{formatBytes(account.stats.storageUsed)} / {formatBytes(account.stats.storageLimit)}</span>
                </div>
                <Progress value={account.stats.storageUsed} max={account.stats.storageLimit} variant="brand" size="sm" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Last Sync</span>
                  <span className="font-medium text-white">{formatRelativeTime(account.lastSyncAt)}</span>
                </div>
                {account.lastSyncStatus && (
                  <StatusBadge status={account.lastSyncStatus} size="sm" showDot={false} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center mb-6 p-4 bg-white/5 rounded-xl">
              <div>
                <p className="text-2xl font-bold text-white">{account.stats.folderCount}</p>
                <p className="text-xs text-slate-400">Folders</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{account.stats.totalEmails.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Emails</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-400">{formatBytes(account.stats.storageUsed)}</p>
                <p className="text-xs text-slate-400">Storage</p>
              </div>
            </div>

            {showActions && onViewDetails && (
              <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); onViewDetails(); }} leftIcon={<Info className="w-4 h-4" />}>
                View Details
              </Button>
            )}
          </Card>
        </motion.div>
      )
    }
  )
);

AccountCard.displayName = 'AccountCard';

