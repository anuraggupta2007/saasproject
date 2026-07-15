import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Eye, Printer } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { Invoice, InvoiceStatus } from '../../types';

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
  onDownload: (id: string) => void;
  onView?: (id: string) => void;
  className?: string;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

function getStatusConfig(status: InvoiceStatus) {
  const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; label: string }> = {
    draft: { variant: 'neutral', label: 'Draft' },
    open: { variant: 'warning', label: 'Pending' },
    paid: { variant: 'success', label: 'Paid' },
    void: { variant: 'neutral', label: 'Void' },
    uncollectible: { variant: 'error', label: 'Failed' },
  };
  return configs[status] || configs.draft;
}

export const InvoiceTable = memo(
  forwardRef<HTMLDivElement, InvoiceTableProps>(
    ({ invoices, isLoading, onDownload, onView, className }, ref) => {
      if (isLoading) {
        return (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
            ))}
          </div>
        );
      }

      return (
        <div ref={ref} className={cn('overflow-x-auto', className)}>
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((invoice) => {
                const statusConfig = getStatusConfig(invoice.status);
                return (
                  <motion.tr
                    key={invoice.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-mono text-white">{invoice.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{invoice.planName}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {invoice.paymentDate
                        ? new Date(invoice.paymentDate).toLocaleDateString()
                        : new Date(invoice.createdAt).toLocaleDateString()
                      }
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white text-right">
                      {formatAmount(invoice.total, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig.variant} size="sm">{statusConfig.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <Button variant="ghost" size="sm" onClick={() => onView(invoice.id)} leftIcon={<Eye className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onDownload(invoice.id)} leftIcon={<Download className="w-3.5 h-3.5" />}>
                          PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
                          Print
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  )
);

InvoiceTable.displayName = 'InvoiceTable';
