import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Key } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { APIKeyTable } from '../components/ui/APIKeyTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAPIKeys, useCreateAPIKey, useRevokeAPIKey, useRegenerateAPIKey } from '../hooks';
import { toast } from 'react-hot-toast';

const PERMISSIONS = ['read', 'write', 'admin', 'backup', 'convert'];

export const APIKeys = memo(() => {
  const navigate = useNavigate();
  const { data: keys, isLoading } = useAPIKeys();
  const createKey = useCreateAPIKey();
  const revokeKey = useRevokeAPIKey();
  const regenerateKey = useRegenerateAPIKey();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['read']);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    createKey.mutate(
      { name: newKeyName, permissions: selectedPermissions },
      {
        onSuccess: () => { toast.success('API key created'); setShowCreateForm(false); setNewKeyName(''); },
        onError: () => toast.error('Failed to create API key'),
      }
    );
  };

  const handleRevoke = () => {
    if (!selectedKeyId) return;
    revokeKey.mutate(selectedKeyId, {
      onSuccess: () => { toast.success('API key revoked'); setShowRevokeDialog(false); },
      onError: () => toast.error('Failed to revoke'),
    });
  };

  const handleRegenerate = () => {
    if (!selectedKeyId) return;
    regenerateKey.mutate(selectedKeyId, {
      onSuccess: () => { toast.success('API key regenerated'); setShowRegenerateDialog(false); },
      onError: () => toast.error('Failed to regenerate'),
    });
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (isLoading) {
    return <SkeletonLoader count={2} variant="row" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-slate-400 mt-1">Manage API keys for programmatic access</p>
        </div>
        <Button variant="brand" onClick={() => setShowCreateForm(!showCreateForm)} leftIcon={<Plus className="w-4 h-4" />}>
          Create Key
        </Button>
      </div>

      {showCreateForm && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Create New API Key" action={<Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>Cancel</Button>} />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Key Name</label>
              <Input placeholder="My API Key" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {PERMISSIONS.map((perm) => (
                  <button
                    key={perm}
                    onClick={() => togglePermission(perm)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedPermissions.includes(perm)
                        ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                    {perm}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="brand" onClick={handleCreate} loading={createKey.isPending} leftIcon={<Key className="w-4 h-4" />}>
              Create API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {keys && keys.length > 0 ? (
        <APIKeyTable
          keys={keys}
          onRevoke={(id) => { setSelectedKeyId(id); setShowRevokeDialog(true); }}
          onRegenerate={(id) => { setSelectedKeyId(id); setShowRegenerateDialog(true); }}
        />
      ) : (
        <EmptyState
          icon={<Key className="w-8 h-8 text-slate-400" />}
          title="No API keys"
          description="Create an API key to access the MailSavior API programmatically."
          action={{ label: 'Create API Key', onClick: () => setShowCreateForm(true) }}
        />
      )}

      <ConfirmationDialog
        open={showRevokeDialog}
        title="Revoke API Key"
        description="This will immediately invalidate the API key. Any applications using it will stop working."
        confirmLabel="Revoke Key"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setShowRevokeDialog(false)}
      />

      <ConfirmationDialog
        open={showRegenerateDialog}
        title="Regenerate API Key"
        description="A new key will be generated and the old one will be immediately invalidated."
        confirmLabel="Regenerate"
        variant="warning"
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenerateDialog(false)}
      />
    </div>
  );
});

APIKeys.displayName = 'APIKeys';

export default APIKeys;
