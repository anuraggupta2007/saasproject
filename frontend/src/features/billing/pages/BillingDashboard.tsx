import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard, Key, Calendar, TrendingUp, ArrowRight,
  RefreshCw, AlertTriangle, FileText, Wallet, Clock
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { SubscriptionCard } from '../components/ui/SubscriptionCard';
import { UsageCard } from '../components/ui/UsageCard';
import { InvoiceTable } from '../components/ui/InvoiceTable';
import { RenewalBanner } from '../components/ui/RenewalBanner';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useBillingDashboard, useDownloadInvoice } from '../hooks';
import { toast } from 'react-hot-toast';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

export const BillingDashboard = memo(() => {
  const navigate = useNavigate();
  const { data, isLoading } = useBillingDashboard();
  const downloadInvoice = useDownloadInvoice();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
        <SkeletonLoader count={3} variant="stat" />
        <SkeletonLoader variant="chart" />
      </div>
    );
  }

  const subscription = data?.subscription;
  const license = data?.license;
  const usage = data?.usage;
  const recentInvoices = data?.recentInvoices || [];

  const daysUntilRenewal = data?.nextBillingDate
    ? Math.ceil((new Date(data.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-slate-400 mt-1">Manage your plan, licenses, and payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Current Plan</p>
              <p className="text-lg font-bold text-white">{subscription?.planName || 'Free'}</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">License Status</p>
              <Badge variant={license?.status === 'active' ? 'success' : 'warning'} size="sm">
                {license?.status || 'None'}
              </Badge>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Next Billing</p>
              <p className="text-lg font-bold text-white">
                {data?.nextBillingDate
                  ? new Date(data.nextBillingDate).toLocaleDateString()
                  : '—'
                }
              </p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Outstanding</p>
              <p className="text-lg font-bold text-white">{formatAmount(data?.outstandingBalance || 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {data?.nextBillingDate && daysUntilRenewal <= 30 && (
        <RenewalBanner
          renewalDate={data.nextBillingDate}
          daysUntilRenewal={daysUntilRenewal}
          onUpgrade={() => navigate('/dashboard/billing/subscription')}
        />
      )}

      {subscription && (
        <SubscriptionCard
          subscription={subscription}
          onUpgrade={() => navigate('/dashboard/billing/subscription')}
          onCancel={() => toast('Cancel flow coming soon')}
          onResume={() => toast('Resume flow coming soon')}
        />
      )}

      {usage && <UsageCard usage={usage} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="elevated" padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Recent Invoices"
            subtitle="Your latest billing documents"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing/invoices')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
          <CardContent>
            <InvoiceTable
              invoices={recentInvoices}
              onDownload={(id) => downloadInvoice.mutate(id, { onSuccess: () => toast.success('Download started') })}
              onView={(id) => navigate(`/dashboard/billing/invoices`)}
            />
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader title="Quick Actions" subtitle="Manage billing" />
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" leftIcon={<CreditCard className="w-4 h-4" />} onClick={() => navigate('/dashboard/billing/payment-methods')}>
              Payment Methods
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Key className="w-4 h-4" />} onClick={() => navigate('/dashboard/billing/license')}>
              License Key
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<FileText className="w-4 h-4" />} onClick={() => navigate('/dashboard/billing/invoices')}>
              Invoices
            </Button>
            <Button variant="outline" className="w-full justify-start" leftIcon={<Clock className="w-4 h-4" />} onClick={() => navigate('/dashboard/billing/history')}>
              Billing History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

BillingDashboard.displayName = 'BillingDashboard';

export default BillingDashboard;
