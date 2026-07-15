import { memo, useState } from 'react';
import { AlertTriangle, RefreshCw, Archive, User, Search, Filter } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminErrors, useUpdateError, useArchiveError } from '../hooks';
import { toast } from 'react-hot-toast';
import type { AdminError } from '../types';

const TYPE_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = { api: 'error', worker: 'warning', queue: 'info', system: 'error' };

export const ErrorManagement = memo(() => {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useAdminErrors({ page, type: typeFilter || undefined, status: statusFilter || undefined });
  const updateError = useUpdateError();
  const archiveError = useArchiveError();

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selected, setSelected] = useState<AdminError | null>(null);

  const columns: DataTableColumn<AdminError>[] = [
    { key: 'type', label: 'Type', render: (e) => <StatusBadge status={e.type} variant={TYPE_VARIANT[e.type]} /> },
    { key: 'message', label: 'Error', render: (e) => (
      <div>
        <p className="text-sm text-white font-medium truncate max-w-md">{e.message}</p>
        <p className="text-xs text-slate-500">{e.source}</p>
      </div>
    )},
    { key: 'count', label: 'Count', sortable: true, render: (e) => <span className="text-white">{e.count}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (e) => <StatusBadge status={e.status} /> },
    { key: 'lastSeen', label: 'Last Seen', sortable: true, render: (e) => <span className="text-slate-400 text-xs">{new Date(e.lastSeen).toLocaleString()}</span> },
    { key: 'assignedTo', label: 'Assigned', render: (e) => e.assignedTo ? <span className="text-white">{e.assignedTo}</span> : <span className="text-slate-500">Unassigned</span> },
    { key: 'actions', label: '', render: (e) => (
      <div className="flex gap-1" onClick={(e2) => e2.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => { setSelected(e); setShowDetailDialog(true); }}>View</Button>
        {e.status !== 'archived' && <Button variant="ghost" size="sm" onClick={() => archiveError.mutate(e.id, { onSuccess: () => toast.success('Archived') })} leftIcon={<Archive className="w-3 h-3" />}>Archive</Button>}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Error Management</h1>
        <p className="text-slate-400 mt-1">{data?.total ?? 0} errors tracked</p>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="api">API Errors</SelectItem>
              <SelectItem value="worker">Worker Errors</SelectItem>
              <SelectItem value="queue">Queue Errors</SelectItem>
              <SelectItem value="system">System Errors</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            total={data?.total}
            page={page}
            totalPages={data?.totalPages}
            onPageChange={setPage}
            emptyMessage="No errors found"
          />
        )}
      </Card>

      <ConfirmationDialog open={showDetailDialog} title="Error Details" description={selected?.message || ''} confirmLabel={selected?.status === 'new' ? 'Mark Investigating' : 'Mark Resolved'} variant="info" onConfirm={() => {
        const nextStatus = selected?.status === 'new' ? 'investigating' : 'resolved';
        updateError.mutate({ id: selected!.id, data: { status: nextStatus } }, {
          onSuccess: () => { toast.success('Error updated'); setShowDetailDialog(false); },
        });
      }} onCancel={() => setShowDetailDialog(false)} />
    </div>
  );
});

ErrorManagement.displayName = 'ErrorManagement';

export default ErrorManagement;
