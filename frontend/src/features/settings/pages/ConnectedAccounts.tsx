import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Trash2, CheckCircle, AlertCircle, Loader2, Link, Unlink } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useConnectedAccounts, useConnectAccount, useDisconnectAccount, useReconnectAccount, useTestConnection } from '../hooks';
import { toast } from 'react-hot-toast';
import type { ConnectedAccount, EmailProvider } from '../types';
import { cn } from '@/utils/cn';

const PROVIDERS: Array<{ id: EmailProvider; name: string; color: string; icon: string }> = [
  { id: 'gmail', name: 'Gmail', color: 'text-red-400', icon: '📧' },
  { id: 'outlook', name: 'Outlook', color: 'text-blue-400', icon: '📨' },
  { id: 'microsoft365', name: 'Microsoft 365', color: 'text-blue-500', icon: '🏢' },
  { id: 'yahoo', name: 'Yahoo', color: 'text-purple-400', icon: '📬' },
  { id: 'aol', name: 'AOL', color: 'text-blue-300', icon: '📮' },
  { id: 'zoho', name: 'Zoho', color: 'text-red-500', icon: '💌' },
  { id: 'icloud', name: 'iCloud', color: 'text-cyan-400', icon: '☁️' },
  { id: 'imap', name: 'IMAP', color: 'text-slate-400', icon: '📥' },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusConfig(status: ConnectedAccount['status']) {
  const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
    connected: { variant: 'success', label: 'Connected' },
    disconnected: { variant: 'warning', label: 'Disconnected' },
    error: { variant: 'error', label: 'Error' },
    syncing: { variant: 'info', label: 'Syncing' },
  };
  return configs[status] || configs.disconnected;
}

export const ConnectedAccounts = memo(() => {
  const navigate = useNavigate();
  const { data: accounts, isLoading } = useConnectedAccounts();
  const connectAccount = useConnectAccount();
  const disconnectAccount = useDisconnectAccount();
  const reconnectAccount = useReconnectAccount();
  const testConnection = useTestConnection();

  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleConnect = (provider: string) => {
    connectAccount.mutate(provider, {
      onSuccess: () => toast.success('Redirecting to provider...'),
      onError: () => toast.error('Failed to connect'),
    });
  };

  const handleDisconnect = () => {
    if (!selectedAccountId) return;
    disconnectAccount.mutate(selectedAccountId, {
      onSuccess: () => { toast.success('Account disconnected'); setShowDisconnectDialog(false); },
      onError: () => toast.error('Failed to disconnect'),
    });
  };

  const handleTest = (id: string) => {
    testConnection.mutate(id, {
      onSuccess: (result) => toast.success(result.message || 'Connection successful'),
      onError: () => toast.error('Connection test failed'),
    });
  };

  if (isLoading) {
    return <SkeletonLoader count={3} variant="row" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Connected Email Accounts</h1>
          <p className="text-slate-400 mt-1">Manage your connected email providers</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Connect New Account" />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <span className="text-2xl">{provider.icon}</span>
                <span className="text-sm font-medium text-white">{provider.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {accounts && accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const statusConfig = getStatusConfig(account.status);
            const providerInfo = PROVIDERS.find(p => p.id === account.provider);

            return (
              <Card key={account.id} variant="elevated" padding="md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                    {providerInfo?.icon || '📧'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{account.displayName}</p>
                      <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-400">{account.email}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                      <span>{account.emailsCount.toLocaleString()} emails</span>
                      <span>{formatBytes(account.storageUsed)}</span>
                      {account.lastSyncAt && <span>Last sync: {new Date(account.lastSyncAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleTest(account.id)} leftIcon={<CheckCircle className="w-4 h-4" />}>
                      Test
                    </Button>
                    {account.status === 'connected' ? (
                      <Button variant="ghost" size="sm" onClick={() => reconnectAccount.mutate(account.id)} leftIcon={<RefreshCw className="w-4 h-4" />}>
                        Reconnect
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedAccountId(account.id); setShowDisconnectDialog(true); }}
                      leftIcon={<Unlink className="w-4 h-4" />}
                      className="text-red-400 hover:text-red-300"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Link className="w-8 h-8 text-slate-400" />}
          title="No connected accounts"
          description="Connect an email account to start backing up your emails."
        />
      )}

      <ConfirmationDialog
        open={showDisconnectDialog}
        title="Disconnect Account"
        description="Are you sure you want to disconnect this email account? Existing backups will be preserved."
        confirmLabel="Disconnect"
        variant="danger"
        onConfirm={handleDisconnect}
        onCancel={() => setShowDisconnectDialog(false)}
      />
    </div>
  );
});

ConnectedAccounts.displayName = 'ConnectedAccounts';

export default ConnectedAccounts;
