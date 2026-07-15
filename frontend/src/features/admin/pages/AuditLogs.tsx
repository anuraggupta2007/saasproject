import { memo } from 'react';
import { Search, Download, Clock, User } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAuditLogs, useExportAuditLogs } from '../hooks';
import { useAdminStore } from '../store';
import { toast } from 'react-hot-toast';
import type { AuditLogEntry } from '../types';

const RESULT_VARIANT: Record<string, 'success' | 'error' | 'warning'> = { success: 'success', failure: 'error', partial: 'warning' };

export const AuditLogs = memo(() => {
  const { audit, setAuditFilters } = useAdminStore();
  const { data, isLoading } = useAuditLogs({ page: audit.page, action: audit.action, userId: audit.userId, resource: audit.resource, startDate: audit.startDate, endDate: audit.endDate });
  const exportAudit = useExportAuditLogs();

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'userName', label: 'User', render: (e) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
          <User className="w-3 h-3 text-brand-400" />
        </div>
        <div>
          <p className="text-sm text-white">{e.userName}</p>
          <p className="text-xs text-slate-500">{e.userRole}</p>
        </div>
      </div>
    )},
    { key: 'action', label: 'Action', sortable: true, render: (e) => <StatusBadge status={e.action} variant="info" /> },
    { key: 'resource', label: 'Resource', render: (e) => <span className="text-white">{e.resource}{e.resourceId ? ` (${e.resourceId.slice(0, 8)})` : ''}</span> },
    { key: 'result', label: 'Result', render: (e) => <StatusBadge status={e.result} variant={RESULT_VARIANT[e.result]} /> },
    { key: 'ipAddress', label: 'IP Address', render: (e) => <span className="text-slate-400 font-mono text-xs">{e.ipAddress}</span> },
    { key: 'createdAt', label: 'Timestamp', sortable: true, render: (e) => <span className="text-slate-400 text-xs">{new Date(e.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 mt-1">{data?.total ?? 0} entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportAudit.mutate(undefined, { onSuccess: () => toast.success('Export started') })} leftIcon={<Download className="w-4 h-4" />}>Export</Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={audit.action} onValueChange={(v) => setAuditFilters({ action: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
            </SelectContent>
          </Select>
          <Select value={audit.resource} onValueChange={(v) => setAuditFilters({ resource: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Resources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Resources</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="license">License</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={audit.startDate} onChange={(e) => setAuditFilters({ startDate: e.target.value })} className="w-40" />
            <Input type="date" value={audit.endDate} onChange={(e) => setAuditFilters({ endDate: e.target.value })} className="w-40" />
          </div>
        </div>

        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} emptyMessage="No audit logs found" />
        )}
      </Card>
    </div>
  );
});

AuditLogs.displayName = 'AuditLogs';

export default AuditLogs;
