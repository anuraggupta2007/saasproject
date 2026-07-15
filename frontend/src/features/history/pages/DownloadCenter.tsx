import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Search, ChevronLeft, ChevronRight, Archive, Loader2,
  ExternalLink, Shield
} from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { DownloadCard } from '../components/ui/DownloadCard';
import { useDownloadList, useDownloadFile, useDeleteDownload, useCopyDownloadLink, useVerifyDownload, useBulkDownload } from '../hooks';
import { toast } from 'react-hot-toast';

export const DownloadCenter = memo(() => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useDownloadList({ page, limit: pageSize });
  const downloadFile = useDownloadFile();
  const deleteDownload = useDeleteDownload();
  const copyLink = useCopyDownloadLink();
  const verifyDownload = useVerifyDownload();
  const bulkDownload = useBulkDownload();

  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const filteredItems = searchQuery
    ? items.filter((item) =>
        item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkDownload = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast('Select files to download');
      return;
    }
    bulkDownload.mutate(ids, {
      onSuccess: () => { toast.success('Download started'); setSelectedIds(new Set()); },
      onError: () => toast.error('Download failed'),
    });
  }, [selectedIds, bulkDownload]);

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Download Center</h1>
          <p className="text-slate-400 mt-1">Download your generated files</p>
        </div>
        {selectedArray.length > 0 && (
          <Button variant="brand" leftIcon={<Download className="w-4 h-4" />} onClick={handleBulkDownload} loading={bulkDownload.isPending}>
            Download Selected ({selectedArray.length})
          </Button>
        )}
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search downloads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="w-4 h-4 rounded border-white/20 text-brand-500 focus:ring-brand-500"
                />
                <DownloadCard
                  item={item}
                  onDownload={(id) => downloadFile.mutate(id, { onSuccess: () => toast.success('Download started') })}
                  onDelete={(id) => deleteDownload.mutate(id, { onSuccess: () => toast.success('Deleted') })}
                  onCopyLink={(id) => copyLink.mutate(id, { onSuccess: () => toast.success('Link copied') })}
                  onVerify={(id) => verifyDownload.mutate(id, { onSuccess: (result) => toast.success(result.valid ? 'Verified' : 'Invalid') })}
                  downloading={downloadFile.isPending}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No downloads available</p>
            <Button variant="brand" className="mt-4" onClick={() => navigate('/dashboard/convert/history')}>
              View History
            </Button>
          </div>
        )}

        {data && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Showing {filteredItems.length} of {data.total} files</span>
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

DownloadCenter.displayName = 'DownloadCenter';

export default DownloadCenter;
