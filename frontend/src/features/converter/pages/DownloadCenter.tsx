import { memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Clock, FileArchive, CheckCircle, Loader2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DownloadCard } from '../components/ui/DownloadCard';
import { useDownloadList, useDownloadConvertedFile, useConverterJob } from '../hooks';
import { toast } from 'react-hot-toast';

export const DownloadCenter = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: downloads, isLoading } = useDownloadList(id || '');
  const { data: job } = useConverterJob(id || '');
  const downloadFile = useDownloadConvertedFile();

  const handleDownload = (fileId: string) => {
    downloadFile.mutate({ jobId: id!, fileId }, {
      onSuccess: () => toast.success('Download started'),
      onError: () => toast.error('Download failed'),
    });
  };

  if (!id) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Download Center</h1>
          <p className="text-slate-400 mt-1">Download your converted files</p>
        </div>
        <EmptyState
          icon={<Download className="w-8 h-8 text-slate-400" />}
          title="No conversion selected"
          description="Select a conversion job to view and download converted files."
          action={{ label: 'View History', onClick: () => navigate('/dashboard/convert/history') }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/convert/history')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Download Center</h1>
            <p className="text-slate-400">{job?.name || 'Conversion'} - Converted Files</p>
          </div>
        </div>
        {downloads && downloads.length > 0 && (
          <Button variant="brand" leftIcon={<Download className="w-4 h-4" />}>
            Download All ({downloads.length})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : downloads && downloads.length > 0 ? (
        <div className="space-y-3">
          {downloads.map((file) => (
            <DownloadCard
              key={file.id}
              file={{
                id: file.id,
                name: file.fileName,
                format: file.format,
                size: file.size,
                downloadUrl: file.downloadUrl,
                expiresAt: file.expiresAt,
                emailCount: 0,
                folderCount: 0,
              }}
              onDownload={handleDownload}
              downloading={downloadFile.isPending}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileArchive className="w-8 h-8 text-slate-400" />}
          title="No files available"
          description="No converted files are available for download yet."
          action={{ label: 'Start Conversion', onClick: () => navigate('/dashboard/convert/wizard') }}
        />
      )}
    </div>
  );
});

DownloadCenter.displayName = 'DownloadCenter';

export default DownloadCenter;
