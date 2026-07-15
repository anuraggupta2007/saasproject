import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Clock, FileArchive, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DownloadInfo, ConvertedFile } from '../../types';

interface DownloadCardProps {
  file: ConvertedFile;
  onDownload: (fileId: string) => void;
  downloading?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTimeUntil(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m remaining`;
}

export const DownloadCard = memo(
  forwardRef<HTMLDivElement, DownloadCardProps>(
    ({ file, onDownload, downloading = false, className }, ref) => {
      const isExpired = Boolean(file.expiresAt && new Date(file.expiresAt) < new Date());

      return (
        <motion.div
          ref={ref}
          className={cn(
            'flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors',
            isExpired && 'opacity-50',
            className
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <FileArchive className="w-5 h-5 text-brand-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{file.format.toUpperCase()}</span>
              <span>{formatBytes(file.size)}</span>
              <span>{file.emailCount.toLocaleString()} emails</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {file.expiresAt && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {formatTimeUntil(file.expiresAt)}
              </div>
            )}
            <button
              onClick={() => onDownload(file.id)}
              disabled={downloading || isExpired}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                isExpired
                  ? 'bg-slate-500/20 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30'
              )}
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </motion.div>
      );
    }
  )
);

DownloadCard.displayName = 'DownloadCard';
