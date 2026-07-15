import { memo, useState, useCallback } from 'react';
import {
  Download, FileText, Clock, Loader2, Trash2, RefreshCw, Plus
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { Input } from '@/features/backup/components/ui/Input';
import { cn } from '@/utils/cn';
import { useReportList, useGenerateReport, useDownloadReport, useDeleteReport } from '../hooks';
import { toast } from 'react-hot-toast';
import type { Report, ExportFormat } from '../types';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

function getStatusColor(status: Report['status']): string {
  const colors: Record<string, string> = {
    ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    generating: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

function getReportTypeIcon(type: Report['type']) {
  const colors: Record<string, string> = {
    backup: 'bg-purple-500/10 text-purple-400',
    conversion: 'bg-blue-500/10 text-blue-400',
    storage: 'bg-amber-500/10 text-amber-400',
    usage: 'bg-emerald-500/10 text-emerald-400',
    activity: 'bg-slate-500/10 text-slate-400',
  };
  return colors[type] || 'bg-slate-500/10 text-slate-400';
}

const REPORT_TYPES: Report['type'][] = ['backup', 'conversion', 'storage', 'usage', 'activity'];

export const Reports = memo(() => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateType, setGenerateType] = useState<Report['type']>('backup');
  const [generateFormat, setGenerateFormat] = useState<ExportFormat>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useReportList({ page, limit: pageSize, type: typeFilter || undefined });
  const generateReport = useGenerateReport();
  const downloadReport = useDownloadReport();
  const deleteReport = useDeleteReport();

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const handleGenerate = useCallback(() => {
    generateReport.mutate(
      {
        type: generateType,
        format: generateFormat,
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      },
      {
        onSuccess: () => { toast.success('Report generation started'); setShowGenerate(false); },
        onError: () => toast.error('Failed to generate report'),
      }
    );
  }, [generateType, generateFormat, dateFrom, dateTo, generateReport]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 mt-1">Generate and download reports</p>
        </div>
        <Button variant="brand" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowGenerate(!showGenerate)}>
          Generate Report
        </Button>
      </div>

      {showGenerate && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Generate New Report" />
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Report Type</label>
                <Select value={generateType} onValueChange={(v) => setGenerateType(v as Report['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                <Select value={generateFormat} onValueChange={(v) => setGenerateFormat(v as ExportFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
              <Button variant="brand" onClick={handleGenerate} loading={generateReport.isPending} leftIcon={<FileText className="w-4 h-4" />}>
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', getReportTypeIcon(report.type))}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{report.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{report.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{report.format.toUpperCase()}</span>
                    <span>{formatBytes(report.size)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(report.generatedAt)}
                    </span>
                    {report.dateRange && (
                      <span>{report.dateRange.from} — {report.dateRange.to}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium border', getStatusColor(report.status))}>
                    {report.status}
                  </span>
                  {report.status === 'ready' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadReport.mutate(report.id, { onSuccess: () => toast.success('Download started') })}
                        leftIcon={<Download className="w-4 h-4" />}
                      >
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this report?')) {
                            deleteReport.mutate(report.id, { onSuccess: () => toast.success('Deleted') });
                          }
                        }}
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No reports generated yet</p>
            <Button variant="brand" className="mt-4" onClick={() => setShowGenerate(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Generate First Report
            </Button>
          </div>
        )}

        {data && items.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Showing {items.length} of {data.total} reports</span>
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

Reports.displayName = 'Reports';

export default Reports;
