import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, FileText } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { InvoiceTable } from '../components/ui/InvoiceTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useInvoiceList, useDownloadInvoice } from '../hooks';
import { toast } from 'react-hot-toast';

export const Invoices = memo(() => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useInvoiceList({ page, limit: pageSize, status: statusFilter || undefined });
  const downloadInvoice = useDownloadInvoice();

  const invoices = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const filteredInvoices = searchQuery
    ? invoices.filter((inv) =>
        inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.planName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices;

  const handleDownload = (id: string) => {
    downloadInvoice.mutate(id, {
      onSuccess: () => toast.success('Download started'),
      onError: () => toast.error('Download failed'),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" />
        <SkeletonLoader count={3} variant="row" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-slate-400 mt-1">View and download your invoices</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open">Pending</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredInvoices.length > 0 ? (
          <InvoiceTable
            invoices={filteredInvoices}
            onDownload={handleDownload}
          />
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8 text-slate-400" />}
            title="No invoices found"
            description="Your invoices will appear here after your first payment."
          />
        )}

        {data && filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Showing {filteredInvoices.length} of {data.total} invoices</span>
            </div>
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

Invoices.displayName = 'Invoices';

export default Invoices;
