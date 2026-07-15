import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Clock, User } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSupportTickets } from '../hooks';
import { useAdminStore } from '../store';
import type { SupportTicket } from '../types';

const PRIORITY_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = { urgent: 'error', high: 'warning', medium: 'info', low: 'default' };

export const SupportCenter = memo(() => {
  const navigate = useNavigate();
  const { support, setSupportFilters } = useAdminStore();
  const { data, isLoading } = useSupportTickets({ page: support.page, status: support.status, priority: support.priority });

  const columns: DataTableColumn<SupportTicket>[] = [
    { key: 'subject', label: 'Ticket', sortable: true, render: (t) => (
      <div>
        <p className="font-medium text-white">{t.subject}</p>
        <p className="text-xs text-slate-500">#{t.id.slice(0, 8)}</p>
      </div>
    )},
    { key: 'userName', label: 'Customer', render: (t) => (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-slate-500" />
        <span className="text-white">{t.userName}</span>
      </div>
    )},
    { key: 'priority', label: 'Priority', sortable: true, render: (t) => <StatusBadge status={t.priority} variant={PRIORITY_VARIANT[t.priority]} /> },
    { key: 'status', label: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'messageCount', label: 'Messages', render: (t) => (
      <div className="flex items-center gap-1 text-slate-400">
        <MessageSquare className="w-3 h-3" />
        {t.messageCount}
      </div>
    )},
    { key: 'createdAt', label: 'Created', sortable: true, render: (t) => <span className="text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', render: (t) => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/support/${t.id}`)}>View</Button>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Center</h1>
        <p className="text-slate-400 mt-1">{data?.total ?? 0} tickets</p>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Select value={support.status} onValueChange={(v) => setSupportFilters({ status: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={support.priority} onValueChange={(v) => setSupportFilters({ priority: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} onRowClick={(t) => navigate(`/admin/support/${t.id}`)} emptyMessage="No tickets found" />
        )}
      </Card>
    </div>
  );
});

SupportCenter.displayName = 'SupportCenter';

export default SupportCenter;
