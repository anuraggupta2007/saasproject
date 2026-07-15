import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Download, Trash2, UserX, UserCheck, Shield, MoreHorizontal } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminUsers, useDeleteUser, useSuspendUser, useReactivateUser, useBulkUserAction } from '../hooks';
import { useAdminStore } from '../store';
import { toast } from 'react-hot-toast';
import type { AdminUser } from '../types';

export const UserManagement = memo(() => {
  const navigate = useNavigate();
  const { users, setUserFilters } = useAdminStore();
  const { data, isLoading } = useAdminUsers({
    page: users.page, search: users.search, role: users.role, status: users.status, plan: users.plan, sort: users.sortField, order: users.sortDirection,
  });
  const deleteUser = useDeleteUser();
  const suspendUser = useSuspendUser();
  const reactivateUser = useReactivateUser();
  const bulkAction = useBulkUserAction();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const handleSort = useCallback((field: string) => {
    setUserFilters({
      sortField: field,
      sortDirection: users.sortDirection === 'asc' ? 'desc' : 'asc',
    });
  }, [users.sortDirection, setUserFilters]);

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      toast.success('User deleted');
      setShowDeleteDialog(false);
    } catch { toast.error('Failed to delete user'); }
  };

  const handleBulkSuspend = async () => {
    if (users.selectedIds.length === 0) return;
    try {
      await bulkAction.mutateAsync({ action: 'suspend', userIds: users.selectedIds });
      toast.success(`${users.selectedIds.length} users suspended`);
    } catch { toast.error('Bulk action failed'); }
  };

  const columns: DataTableColumn<AdminUser>[] = [
    { key: 'name', label: 'User', sortable: true, render: (u) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold">
          {u.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-white">{u.name}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      </div>
    )},
    { key: 'role', label: 'Role', sortable: true, render: (u) => <StatusBadge status={u.role} variant="brand" /> },
    { key: 'planTier', label: 'Plan', sortable: true, render: (u) => <StatusBadge status={u.planTier} /> },
    { key: 'status', label: 'Status', sortable: true, render: (u) => <StatusBadge status={u.status} /> },
    { key: 'registeredAt', label: 'Registered', sortable: true, render: (u) => <span className="text-slate-400">{new Date(u.registeredAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', render: (u) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/users/${u.id}`)}>View</Button>
        {u.status === 'active' ? (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); suspendUser.mutate(u.id); }} leftIcon={<UserX className="w-3 h-3" />}>Suspend</Button>
        ) : u.status === 'suspended' ? (
          <Button variant="ghost" size="sm" onClick={() => reactivateUser.mutate(u.id)} leftIcon={<UserCheck className="w-3 h-3" />}>Reactivate</Button>
        ) : null}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 mt-1">{data?.total ?? 0} users total</p>
        </div>
        <div className="flex items-center gap-2">
          {users.selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkSuspend} leftIcon={<UserX className="w-4 h-4" />}>
              Suspend ({users.selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Search users..." value={users.search} onChange={(e) => setUserFilters({ search: e.target.value, page: 1 })} className="pl-10" />
          </div>
          <Select value={users.role} onValueChange={(v) => setUserFilters({ role: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="billing_manager">Billing Manager</SelectItem>
            </SelectContent>
          </Select>
          <Select value={users.status} onValueChange={(v) => setUserFilters({ status: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={users.plan} onValueChange={(v) => setUserFilters({ plan: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Plans" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <SkeletonLoader count={5} variant="row" />
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            total={data?.total}
            page={users.page}
            totalPages={data?.totalPages}
            sortField={users.sortField}
            sortDirection={users.sortDirection}
            onSort={handleSort}
            onPageChange={(p) => setUserFilters({ page: p })}
            onRowClick={(u) => navigate(`/admin/users/${u.id}`)}
            selectedIds={users.selectedIds}
            onSelect={(id) => {
              if (users.selectedIds.includes(id)) {
                useAdminStore.getState().deselectUser(id);
              } else {
                useAdminStore.getState().selectUser(id);
              }
            }}
            onSelectAll={(ids) => useAdminStore.getState().selectAllUsers(ids)}
            getRowId={(u) => u.id}
            emptyMessage="No users found"
          />
        )}
      </Card>

      <ConfirmationDialog open={showDeleteDialog} title="Delete User" description={`Permanently delete ${selectedUser?.name}? This cannot be undone.`} confirmLabel="Delete" variant="danger" onConfirm={handleDelete} onCancel={() => setShowDeleteDialog(false)} />
    </div>
  );
});

UserManagement.displayName = 'UserManagement';

export default UserManagement;
