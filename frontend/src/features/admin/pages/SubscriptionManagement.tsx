import { memo, useState } from 'react';
import { Search, CreditCard, XCircle, Clock, Plus } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useAdminSubscriptions, useCancelSubscription, useExtendSubscription } from '../hooks';
import { useAdminStore } from '../store';
import { toast } from 'react-hot-toast';
import type { AdminSubscription } from '../types';

export const SubscriptionManagement = memo(() => {
  const { data, isLoading } = useAdminSubscriptions();
  const cancelSubscription = useCancelSubscription();
  const extendSubscription = useExtendSubscription();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [selected, setSelected] = useState<AdminSubscription | null>(null);
  const [extendDays, setExtendDays] = useState('30');

  const columns: DataTableColumn<AdminSubscription>[] = [
    { key: 'userName', label: 'User', render: (s) => (
      <div>
        <p className="font-medium text-white">{s.userName}</p>
        <p className="text-xs text-slate-500">{s.userEmail}</p>
      </div>
    )},
    { key: 'planName', label: 'Plan', render: (s) => <StatusBadge status={s.planTier} variant="brand" /> },
    { key: 'status', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'currentPeriodEnd', label: 'Renewal', render: (s) => (
      <span className="text-slate-400">{new Date(s.currentPeriodEnd).toLocaleDateString()}</span>
    )},
    { key: 'cancelAtPeriodEnd', label: 'Auto-Cancel', render: (s) => s.cancelAtPeriodEnd ? <XCircle className="w-4 h-4 text-red-400" /> : <span className="text-slate-500">-</span> },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={() => { setSelected(s); setShowExtendDialog(true); }} leftIcon={<Plus className="w-3 h-3" />}>Extend</Button>
        <Button variant="ghost" size="sm" onClick={() => { setSelected(s); setShowCancelDialog(true); }} leftIcon={<XCircle className="w-3 h-3" />}>Cancel</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
        <p className="text-slate-400 mt-1">{data?.total ?? 0} active subscriptions</p>
      </div>

      <Card variant="elevated" padding="lg">
        {isLoading ? <SkeletonLoader count={5} variant="row" /> : (
          <DataTable columns={columns} data={data?.items ?? []} emptyMessage="No subscriptions found" />
        )}
      </Card>

      <ConfirmationDialog open={showCancelDialog} title="Cancel Subscription" description={`Cancel ${selected?.userName}'s subscription? They will lose access at the end of the current period.`} confirmLabel="Cancel Subscription" variant="danger" onConfirm={() => { cancelSubscription.mutate(selected!.id, { onSuccess: () => { toast.success('Subscription cancelled'); setShowCancelDialog(false); } }); }} onCancel={() => setShowCancelDialog(false)} />

      <ConfirmationDialog open={showExtendDialog} title="Extend Subscription" description={`Extend ${selected?.userName}'s subscription by ${extendDays} days?`} confirmLabel="Extend" variant="info" onConfirm={() => { extendSubscription.mutate({ id: selected!.id, days: parseInt(extendDays) }, { onSuccess: () => { toast.success('Subscription extended'); setShowExtendDialog(false); } }); }} onCancel={() => setShowExtendDialog(false)} />
    </div>
  );
});

SubscriptionManagement.displayName = 'SubscriptionManagement';

export default SubscriptionManagement;
