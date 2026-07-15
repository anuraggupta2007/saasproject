import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, Clock } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { BillingTimeline } from '../components/ui/BillingTimeline';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useBillingHistory, useExportBillingHistory } from '../hooks';
import { toast } from 'react-hot-toast';

export const BillingHistory = memo(() => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useBillingHistory({ page, limit: pageSize, type: typeFilter || undefined, search: searchQuery || undefined });
  const exportHistory = useExportBillingHistory();

  const entries = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const handleExport = () => {
    exportHistory.mutate(undefined, {
      onSuccess: () => toast.success('Export started'),
      onError: () => toast.error('Export failed'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader count={4} variant="row" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Billing History</h1>
            <p className="text-slate-400 mt-1">Track all billing events and transactions</p>
          </div>
        </div>
        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport} loading={exportHistory.isPending}>
          Export CSV
        </Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="subscription_change">Plan Changes</SelectItem>
                <SelectItem value="license_activate">License</SelectItem>
                <SelectItem value="coupon_apply">Coupons</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {entries.length > 0 ? (
          <BillingTimeline entries={entries} />
        ) : (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-slate-400" />}
            title="No billing history"
            description="Your billing events will appear here."
          />
        )}

        {data && entries.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <span className="text-sm text-slate-400">Showing {entries.length} of {data.total} entries</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                Prev
              </Button>
              <span className="px-3 text-sm text-slate-300">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

BillingHistory.displayName = 'BillingHistory';

export default BillingHistory;
