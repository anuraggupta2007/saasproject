import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Smartphone, Key, Trash2, LogOut } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { SecurityCard } from '../components/ui/SecurityCard';
import { SessionTable } from '../components/ui/SessionTable';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSecuritySettings, useActiveSessions, useChangePassword, useEnable2FA, useDisable2FA, useRevokeSession, useRevokeAllSessions } from '../hooks';
import { toast } from 'react-hot-toast';

export const SecuritySettings = memo(() => {
  const navigate = useNavigate();
  const { data: security, isLoading } = useSecuritySettings();
  const { data: sessions } = useActiveSessions();
  const changePassword = useChangePassword();
  const enable2FA = useEnable2FA();
  const disable2FA = useDisable2FA();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: passwords.current, newPassword: passwords.new, confirmPassword: passwords.confirm });
      toast.success('Password changed');
      setShowPasswordForm(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch {
      toast.error('Failed to change password');
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA.mutateAsync('totp');
      toast.success('2FA setup initiated');
    } catch {
      toast.error('Failed to enable 2FA');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await disable2FA.mutateAsync('000000');
      toast.success('2FA disabled');
    } catch {
      toast.error('Failed to disable 2FA');
    }
  };

  const handleRevokeSession = (id: string) => {
    revokeSession.mutate(id, { onSuccess: () => toast.success('Session revoked') });
  };

  const handleRevokeAll = () => {
    revokeAllSessions.mutate(undefined, {
      onSuccess: () => { toast.success('All sessions revoked'); setShowRevokeAllDialog(false); },
    });
  };

  if (isLoading) {
    return <SkeletonLoader count={3} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Security Settings</h1>
          <p className="text-slate-400 mt-1">Manage your security and authentication</p>
        </div>
      </div>

      {security && (
        <SecurityCard
          security={security}
          onChangePassword={() => setShowPasswordForm(true)}
          onEnable2FA={handleEnable2FA}
          onDisable2FA={handleDisable2FA}
        />
      )}

      {showPasswordForm && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Change Password" action={<Button variant="ghost" size="sm" onClick={() => setShowPasswordForm(false)}>Cancel</Button>} />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
              <Input type="password" value={passwords.current} onChange={(e) => setPasswords(p => ({ ...p, current: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <Input type="password" value={passwords.new} onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
              <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            </div>
            <Button variant="brand" onClick={handleChangePassword} loading={changePassword.isPending} leftIcon={<Lock className="w-4 h-4" />}>
              Change Password
            </Button>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <CardHeader
          title="Active Sessions"
          subtitle={`${sessions?.length || 0} active session(s)`}
          action={
            sessions && sessions.length > 1 ? (
              <Button variant="destructive" size="sm" onClick={() => setShowRevokeAllDialog(true)} leftIcon={<LogOut className="w-4 h-4" />}>
                Sign Out All
              </Button>
            ) : undefined
          }
        />
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <SessionTable sessions={sessions} onRevoke={handleRevokeSession} />
          ) : (
            <p className="text-center text-slate-500 py-8">No active sessions</p>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showRevokeAllDialog}
        title="Sign Out All Devices"
        description="This will sign you out from all devices except the current one. You will need to sign in again on those devices."
        confirmLabel="Sign Out All"
        variant="danger"
        onConfirm={handleRevokeAll}
        onCancel={() => setShowRevokeAllDialog(false)}
      />
    </div>
  );
});

SecuritySettings.displayName = 'SecuritySettings';

export default SecuritySettings;
