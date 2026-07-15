import { memo, useState } from 'react';
import {
  Shield, Download, Search, ChevronLeft, ChevronRight, Clock, Loader2, CheckCircle, XCircle
} from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useAuditLogs, useExportAuditLogs } from '../hooks';
import { toast } from 'react-hot-toast';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const AuditLogs = memo(() => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    limit: pageSize,
    search: searchQuery || undefined,
    action: actionFilter || undefined,
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const exportAudit = useExportAuditLogs();

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const handleExport = () => {
    exportAudit.mutate(
      {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        format: 'csv',
      },
      {
        onSuccess: () => toast.success('Export started'),
        onError: () => toast.error('Export failed'),
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 mt-1">Track all user actions and system events</p>
        </div>
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport} loading={exportAudit.isPending}>
          Export Logs
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by user, action, or resource..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="job_created">Job Created</SelectItem>
                <SelectItem value="job_started">Job Started</SelectItem>
                <SelectItem value="job_completed">Job Completed</SelectItem>
                <SelectItem value="job_failed">Job Failed</SelectItem>
                <SelectItem value="job_deleted">Job Deleted</SelectItem>
                <SelectItem value="job_retried">Job Retried</SelectItem>
                <SelectItem value="download">Download</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="settings_changed">Settings Changed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setActionFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
              Clear
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-40">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <div>
                          <p>{new Date(log.timestamp).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{log.userName}</p>
                      <p className="text-xs text-slate-500">{log.userId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-300">{log.resource}</p>
                      <p className="text-xs text-slate-500 font-mono">{log.resourceId.slice(0, 12)}...</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border',
                        log.status === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      )}>
                        {log.status === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No audit logs found</p>
          </div>
        )}

        {data && items.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Showing {items.length} of {data.total} entries</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1} leftIcon={<ChevronLeft className="w-4 h-4" />}>
                Prev
              </Button>
              <span className="px-3 text-sm text-slate-300">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} rightIcon={<ChevronRight className="w-4 h-4" />}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

AuditLogs.displayName = 'AuditLogs';

export default AuditLogs;
