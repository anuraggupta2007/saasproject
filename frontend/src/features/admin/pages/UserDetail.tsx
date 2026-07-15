import { memo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Shield, Key, Activity, Calendar, HardDrive, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminUser, useUpdateUser, useDeleteUser, useResetUserPassword, useVerifyUserEmail, useSuspendUser, useReactivateUser } from '../hooks';
import { toast } from 'react-hot-toast';
import type { AdminRole, PlanTier, UserStatus } from '../types';

export const UserDetail = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useAdminUser(id!);
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const verifyEmail = useVerifyUserEmail();
  const suspendUser = useSuspendUser();
  const reactivateUser = useReactivateUser();

  const user = data;
  const [form, setForm] = useState({ name: '', role: '' as AdminRole | '', planTier: '' as PlanTier | '', status: '' as UserStatus | '' });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) return <SkeletonLoader count={3} variant="card" />;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-slate-400">{user.email}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatMini icon={<Activity className="w-5 h-5" />} label="Backups" value={user.totalBackups} />
        <StatMini icon={<Key className="w-5 h-5" />} label="Conversions" value={user.totalConversions} />
        <StatMini icon={<HardDrive className="w-5 h-5" />} label="Storage" value={`${(user.storageUsed / 1073741824).toFixed(2)} GB`} />
      </div>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Profile Information" icon={<Mail className="w-5 h-5" />} />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <Input defaultValue={user.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <Input value={user.email} disabled />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <Select value={form.role || user.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AdminRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="billing_manager">Billing Manager</SelectItem>
                  <SelectItem value="readonly">Read-Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plan</label>
              <Select value={form.planTier || user.planTier} onValueChange={(v) => setForm((f) => ({ ...f, planTier: v as PlanTier }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="brand" onClick={() => { updateUser.mutate({ id: id!, data: { name: form.name || user.name, role: (form.role || user.role) as AdminRole, planTier: (form.planTier || user.planTier) as PlanTier } }); toast.success('User updated'); }} loading={updateUser.isPending} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Actions" icon={<Shield className="w-5 h-5" />} />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => resetPassword.mutate(id!, { onSuccess: () => toast.success('Password reset email sent') })} leftIcon={<Key className="w-4 h-4" />}>Reset Password</Button>
            <Button variant="outline" onClick={() => verifyEmail.mutate(id!, { onSuccess: () => toast.success('Verification email sent') })} leftIcon={<Mail className="w-4 h-4" />}>Verify Email</Button>
            {user.status === 'active' ? (
              <Button variant="outline" onClick={() => suspendUser.mutate(id!, { onSuccess: () => toast.success('User suspended') })} leftIcon={<AlertTriangle className="w-4 h-4" />}>Suspend User</Button>
            ) : user.status === 'suspended' ? (
              <Button variant="brand" onClick={() => reactivateUser.mutate(id!, { onSuccess: () => toast.success('User reactivated') })}>Reactivate User</Button>
            ) : null}
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} leftIcon={<Trash2 className="w-4 h-4" />}>Delete User</Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog open={showDeleteDialog} title="Delete User" description={`Permanently delete ${user.name}? This cannot be undone.`} confirmLabel="Delete" variant="danger" onConfirm={() => { deleteUser.mutate(id!, { onSuccess: () => { toast.success('User deleted'); navigate('/admin/users'); } }); }} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
});

const StatMini = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
    <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">{icon}</div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  </div>
);

UserDetail.displayName = 'UserDetail';

export default UserDetail;
