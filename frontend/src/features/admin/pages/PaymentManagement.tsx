import { memo, useState } from 'react';
import { Search, Download, DollarSign, AlertTriangle } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminPayments, useRefundPayment, useExportPayments } from '../hooks';
import { useAdminStore } from '../store';
import { toast } from 'react-hot-toast';
import type { AdminPayment } from '../types';

export const PaymentManagement = memo(() => {
  const { payments, setPaymentFilters } = useAdminStore();
  const { data, isLoading } = useAdminPayments({ page: payments.page, status: payments.status, provider: payments.provider, search: payments.search });
  const refundPayment = useRefundPayment();
  const exportPayments = useExportPayments();

  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selected, setSelected] = useState<AdminPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const columns: DataTableColumn<AdminPayment>[] = [
    { key: 'userName', label: 'User', render: (p) => (
      <div>
        <p className="font-medium text-white">{p.userName}</p>
        <p className="text-xs text-slate-500">{p.userEmail}</p>
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (p) => <span className="font-medium text-white">${p.amount.toFixed(2)}</span> },
    { key: 'provider', label: 'Provider', render: (p) => <span className="text-slate-400 capitalize">{p.provider}</span> },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'createdAt', label: 'Date', render: (p) => <span className="text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', render: (p) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => { setSelected(p); setShowRefundDialog(true); }} disabled={p.status === 'refunded'} leftIcon={<DollarSign className="w-3 h-3" />}>Refund</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Management</h1>
          <p className="text-slate-400 mt-1">{data?.total ?? 0} transactions</p>
        </div>
        <Button variant="outline" onClick={() => exportPayments.mutate({ status: payments.status }, { onSuccess: () => toast.success('Export started') })} leftIcon={<Download className="w-4 h-4" />}>Export</Button>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="Search payments..." value={payments.search} onChange={(e) => setPaymentFilters({ search: e.target.value, page: 1 })} className="pl-10" />
          </div>
          <Select value={payments.status} onValueChange={(v) => setPaymentFilters({ status: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={payments.provider} onValueChange={(v) => setPaymentFilters({ provider: v, page: 1 })}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Providers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Providers</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="razorpay">Razorpay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} emptyMessage="No payments found" />
        )}
      </Card>

      <ConfirmationDialog open={showRefundDialog} title="Issue Refund" description={`Refund $${refundAmount || selected?.amount.toFixed(2)} to ${selected?.userName}?`} confirmLabel="Confirm Refund" variant="danger" onConfirm={() => { const amt = refundAmount ? parseFloat(refundAmount) : undefined; refundPayment.mutate({ id: selected!.id, amount: amt }, { onSuccess: () => { toast.success('Refund processed'); setShowRefundDialog(false); setRefundAmount(''); } }); }} onCancel={() => { setShowRefundDialog(false); setRefundAmount(''); }} />
    </div>
  );
});

PaymentManagement.displayName = 'PaymentManagement';

export default PaymentManagement;
