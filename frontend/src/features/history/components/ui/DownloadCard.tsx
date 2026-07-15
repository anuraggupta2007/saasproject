import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Clock, FileArchive, CheckCircle, Trash2, ExternalLink, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DownloadItem } from '../../types';

interface DownloadCardProps {
  item: DownloadItem;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onVerify?: (id: string) => void;
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
  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h left`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m left`;
}

function getStatusColor(status: DownloadItem['status']): string {
  const colors: Record<string, string> = {
    available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    expired: 'bg-red-500/15 text-red-400 border-red-500/30',
    generating: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

export const DownloadCard = memo(
  forwardRef<HTMLDivElement, DownloadCardProps>(
    ({ item, onDownload, onDelete, onCopyLink, onVerify, downloading = false, className }, ref) => {
      const isExpired = item.status === 'expired' || Boolean(item.expiresAt && new Date(item.expiresAt) < new Date());

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
            <p className="text-sm font-medium text-white truncate">{item.fileName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{item.format.toUpperCase()}</span>
              <span>{formatBytes(item.size)}</span>
              <span>Downloads: {item.downloadCount}</span>
              {item.integrity && (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Verified
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {item.expiresAt && (
              <span className={cn('text-xs', isExpired ? 'text-red-400' : 'text-slate-500')}>
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimeUntil(item.expiresAt)}
              </span>
            )}
            <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium border', getStatusColor(item.status))}>
              {item.status}
            </span>
            <div className="flex items-center gap-1">
              {onCopyLink && item.status === 'available' && (
                <button
                  onClick={() => onCopyLink(item.id)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Copy link"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              {onVerify && item.status === 'available' && (
                <button
                  onClick={() => onVerify(item.id)}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-white/10 transition-colors"
                  title="Verify integrity"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDownload(item.id)}
                disabled={downloading || isExpired}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  isExpired
                    ? 'bg-slate-500/20 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 border border-brand-500/30'
                )}
              >
                <Download className="w-4 h-4" />
                {downloading ? '...' : 'Download'}
              </button>
            </div>
          </div>
        </motion.div>
      );
    }
  )
);

DownloadCard.displayName = 'DownloadCard';
