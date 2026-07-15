import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Download, Pause, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { useDeleteAccount, useDeactivateAccount, useExportAccountData } from '../hooks';
import { toast } from 'react-hot-toast';

export const AccountManagement = memo(() => {
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccount();
  const deactivateAccount = useDeactivateAccount();
  const exportData = useExportAccountData();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [password, setPassword] = useState('');

  const handleDelete = async () => {
    if (!password) { toast.error('Password required'); return; }
    try {
      await deleteAccount.mutateAsync(password);
      toast.success('Account deleted');
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const handleDeactivate = async () => {
    if (!password) { toast.error('Password required'); return; }
    try {
      await deactivateAccount.mutateAsync(password);
      toast.success('Account deactivated');
      window.location.href = '/';
    } catch {
      toast.error('Failed to deactivate account');
    }
  };

  const handleExport = () => {
    exportData.mutate(undefined, {
      onSuccess: () => toast.success('Export started'),
      onError: () => toast.error('Export failed'),
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Account Management</h1>
          <p className="text-slate-400 mt-1">Manage your account data and status</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Export Account Data" icon={<Download className="w-5 h-5" />} />
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">Download a complete copy of your account data including profiles, settings, and activity logs.</p>
          <Button variant="outline" onClick={handleExport} loading={exportData.isPending} leftIcon={<Download className="w-4 h-4" />}>
            Export Data
          </Button>
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Deactivate Account" icon={<Pause className="w-5 h-5" />} />
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">Temporarily deactivate your account. You can reactivate it later by signing in.</p>
          <Button variant="outline" onClick={() => setShowDeactivateDialog(true)} leftIcon={<Pause className="w-4 h-4" />}>
            Deactivate Account
          </Button>
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg" className="border-red-500/20">
        <CardHeader title="Delete Account" icon={<Trash2 className="w-5 h-5 text-red-400" />} />
        <CardContent>
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-400 font-medium">This action is irreversible</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">All your data will be permanently deleted. This cannot be undone.</p>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeactivateDialog}
        title="Deactivate Account"
        description="Enter your password to confirm deactivation. Your account will be temporarily disabled."
        confirmLabel="Deactivate"
        variant="warning"
        onConfirm={handleDeactivate}
        onCancel={() => { setShowDeactivateDialog(false); setPassword(''); }}
      />

      <ConfirmationDialog
        open={showDeleteDialog}
        title="Delete Account Permanently"
        description="Enter your password to confirm. All your data will be permanently deleted and this action cannot be undone."
        confirmLabel="Delete Account"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setPassword(''); }}
      />
    </div>
  );
});

AccountManagement.displayName = 'AccountManagement';

export default AccountManagement;
