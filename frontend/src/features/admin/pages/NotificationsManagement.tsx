import { memo, useState } from 'react';
import { Bell, Send, Trash2, Plus, Calendar, Users } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminNotifications, useCreateNotification, useSendNotification, useDeleteNotification } from '../hooks';
import { toast } from 'react-hot-toast';
import type { AdminNotification, NotificationCreateData } from '../types';

export const NotificationsManagement = memo(() => {
  const { data, isLoading } = useAdminNotifications();
  const createNotification = useCreateNotification();
  const sendNotification = useSendNotification();
  const deleteNotification = useDeleteNotification();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState<NotificationCreateData>({ type: 'announcement', title: '', message: '', audience: 'all' });

  const handleCreate = () => {
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    createNotification.mutate(form, {
      onSuccess: () => { toast.success('Notification created'); setShowCreateDialog(false); setForm({ type: 'announcement', title: '', message: '', audience: 'all' }); },
    });
  };

  const columns: DataTableColumn<AdminNotification>[] = [
    { key: 'type', label: 'Type', render: (n) => <StatusBadge status={n.type} variant={n.type === 'alert' ? 'error' : n.type === 'maintenance' ? 'warning' : n.type === 'announcement' ? 'info' : 'brand'} /> },
    { key: 'title', label: 'Title', render: (n) => <span className="font-medium text-white">{n.title}</span> },
    { key: 'audience', label: 'Audience', render: (n) => <span className="text-slate-400 capitalize">{n.audience}</span> },
    { key: 'status', label: 'Status', render: (n) => <StatusBadge status={n.status} /> },
    { key: 'deliveredCount', label: 'Delivered', render: (n) => <span className="text-white">{n.deliveredCount.toLocaleString()}</span> },
    { key: 'createdAt', label: 'Created', render: (n) => <span className="text-slate-400 text-xs">{new Date(n.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', render: (n) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        {n.status === 'draft' && <Button variant="ghost" size="sm" onClick={() => sendNotification.mutate(n.id, { onSuccess: () => toast.success('Notification sent') })} leftIcon={<Send className="w-3 h-3" />}>Send</Button>}
        <Button variant="ghost" size="sm" onClick={() => deleteNotification.mutate(n.id, { onSuccess: () => toast.success('Notification deleted') })} leftIcon={<Trash2 className="w-3 h-3" />}>Delete</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications Management</h1>
          <p className="text-slate-400 mt-1">{data?.total ?? 0} notifications</p>
        </div>
        <Button variant="brand" onClick={() => setShowCreateDialog(true)} leftIcon={<Plus className="w-4 h-4" />}>Create Notification</Button>
      </div>

      <Card variant="elevated" padding="lg">
        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} emptyMessage="No notifications" />
        )}
      </Card>

      <ConfirmationDialog open={showCreateDialog} title="Create Notification" description="" confirmLabel="Create" variant="info" onConfirm={handleCreate} onCancel={() => setShowCreateDialog(false)}>
        <div className="space-y-4 mt-4">
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as NotificationCreateData['type'] }))}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="alert">System Alert</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v as NotificationCreateData['audience'] }))}>
            <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active Users</SelectItem>
              <SelectItem value="trial">Trial Users</SelectItem>
              <SelectItem value="premium">Premium Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ConfirmationDialog>
    </div>
  );
});

NotificationsManagement.displayName = 'NotificationsManagement';

export default NotificationsManagement;
