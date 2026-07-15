import { memo, useState } from 'react';
import { Shield, Plus, Edit, Trash2, Users } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PermissionMatrix } from '../components/ui/PermissionMatrix';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks';
import { toast } from 'react-hot-toast';
import type { RoleDefinition } from '../types';

const ALL_PERMISSIONS = [
  { id: 'users.read', resource: 'Users', action: 'Read', description: 'View users' },
  { id: 'users.write', resource: 'Users', action: 'Write', description: 'Edit users' },
  { id: 'users.delete', resource: 'Users', action: 'Delete', description: 'Delete users' },
  { id: 'subscriptions.read', resource: 'Subscriptions', action: 'Read', description: 'View subscriptions' },
  { id: 'subscriptions.write', resource: 'Subscriptions', action: 'Write', description: 'Manage subscriptions' },
  { id: 'payments.read', resource: 'Payments', action: 'Read', description: 'View payments' },
  { id: 'payments.refund', resource: 'Payments', action: 'Refund', description: 'Issue refunds' },
  { id: 'licenses.read', resource: 'Licenses', action: 'Read', description: 'View licenses' },
  { id: 'licenses.manage', resource: 'Licenses', action: 'Manage', description: 'Activate/deactivate licenses' },
  { id: 'support.read', resource: 'Support', action: 'Read', description: 'View tickets' },
  { id: 'support.reply', resource: 'Support', action: 'Reply', description: 'Reply to tickets' },
  { id: 'support.assign', resource: 'Support', action: 'Assign', description: 'Assign tickets' },
  { id: 'analytics.read', resource: 'Analytics', action: 'Read', description: 'View analytics' },
  { id: 'settings.read', resource: 'Settings', action: 'Read', description: 'View settings' },
  { id: 'settings.write', resource: 'Settings', action: 'Write', description: 'Edit settings' },
  { id: 'roles.read', resource: 'Roles', action: 'Read', description: 'View roles' },
  { id: 'roles.manage', resource: 'Roles', action: 'Manage', description: 'Create/edit roles' },
  { id: 'audit.read', resource: 'Audit', action: 'Read', description: 'View audit logs' },
];

export const RolesPermissions = memo(() => {
  const { data: rolesData, isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  const roles = rolesData ?? [];

  const handleSave = () => {
    if (!selectedRole) return;
    updateRole.mutate({ id: selectedRole.id, data: { permissions: editingPermissions } }, {
      onSuccess: () => toast.success('Role updated'),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
          <p className="text-slate-400 mt-1">{roles.length} roles configured</p>
        </div>
        <Button variant="brand" onClick={() => setShowCreateDialog(true)} leftIcon={<Plus className="w-4 h-4" />}>Create Role</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" padding="lg">
          <CardHeader title="Roles" icon={<Shield className="w-5 h-5" />} />
          <CardContent className="space-y-2">
            {isLoading ? <SkeletonLoader count={4} variant="row" /> : roles.map((role) => (
              <div
                key={role.id}
                onClick={() => { setSelectedRole(role); setEditingPermissions(role.permissions); }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${selectedRole?.id === role.id ? 'bg-brand-500/10 border border-brand-500/20' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{role.name}</p>
                  <p className="text-xs text-slate-500">{role.userCount} users</p>
                </div>
                {role.isSystem && <StatusBadge status="system" variant="brand" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedRole ? (
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedRole.name}</h3>
                  <p className="text-sm text-slate-400">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="brand" size="sm" onClick={handleSave} loading={updateRole.isPending}>Save Changes</Button>
                  {!selectedRole.isSystem && (
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} leftIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
                  )}
                </div>
              </div>
              <PermissionMatrix permissions={ALL_PERMISSIONS} rolePermissions={editingPermissions} onChange={setEditingPermissions} />
            </Card>
          ) : (
            <Card variant="elevated" padding="lg">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-12 h-12 text-slate-600 mb-4" />
                <p className="text-slate-400">Select a role to manage permissions</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmationDialog open={showCreateDialog} title="Create Role" description="Define a new role with a name and description." confirmLabel="Create" variant="info" onConfirm={() => {
        if (!newRole.name) { toast.error('Name required'); return; }
        createRole.mutate({ name: newRole.name, description: newRole.description, permissions: [] }, {
          onSuccess: () => { toast.success('Role created'); setShowCreateDialog(false); setNewRole({ name: '', description: '' }); },
        });
      }} onCancel={() => setShowCreateDialog(false)} />

      <ConfirmationDialog open={showDeleteDialog} title="Delete Role" description={`Delete "${selectedRole?.name}"? Users with this role will need reassignment.`} confirmLabel="Delete" variant="danger" onConfirm={() => {
        deleteRole.mutate(selectedRole!.id, {
          onSuccess: () => { toast.success('Role deleted'); setSelectedRole(null); setShowDeleteDialog(false); },
        });
      }} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
});

RolesPermissions.displayName = 'RolesPermissions';

export default RolesPermissions;
