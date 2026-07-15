import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { X, FileArchive, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { InputFileInfo } from '../../types';

interface FileCardProps {
  file: InputFileInfo;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  showProgress?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFormatColor(format: string): string {
  const colors: Record<string, string> = {
    mbox: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pst: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ost: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    eml: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    msg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    maildir: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    emlx: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  };
  return colors[format] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

function getStatusIcon(status: InputFileInfo['status']) {
  switch (status) {
    case 'uploading':
      return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
    case 'uploaded':
    case 'valid':
    case 'converted':
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'invalid':
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'converting':
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'pending':
    case 'validating':
      return <Clock className="w-4 h-4 text-slate-400" />;
    default:
      return null;
  }
}

function getStatusLabel(status: InputFileInfo['status']): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    uploading: 'Uploading',
    uploaded: 'Uploaded',
    validating: 'Validating',
    valid: 'Valid',
    invalid: 'Invalid',
    converting: 'Converting',
    converted: 'Converted',
    failed: 'Failed',
  };
  return labels[status] || status;
}

export const FileCard = memo(
  forwardRef<HTMLDivElement, FileCardProps>(
    ({ file, onRemove, onRetry, showProgress = true, className }, ref) => {
      return (
        <motion.div
          ref={ref}
          className={cn(
            'flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors',
            file.status === 'failed' && 'border-red-500/30 bg-red-500/5',
            file.status === 'converted' && 'border-emerald-500/30 bg-emerald-500/5',
            className
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          layout
        >
          <div className="flex-shrink-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', getFormatColor(file.format))}>
              <FileArchive className="w-5 h-5" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium border', getFormatColor(file.format))}>
                {file.format.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              <span>{formatBytes(file.size)}</span>
              <span className="flex items-center gap-1">
                {getStatusIcon(file.status)}
                {getStatusLabel(file.status)}
              </span>
              {file.error && <span className="text-red-400">{file.error}</span>}
            </div>
            {showProgress && file.status === 'uploading' && file.progress > 0 && (
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-brand-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${file.progress}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {file.status === 'failed' && onRetry && (
              <button
                onClick={() => onRetry(file.id)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <Loader2 className="w-4 h-4" />
              </button>
            )}
            {onRemove && (file.status === 'pending' || file.status === 'failed' || file.status === 'invalid') && (
              <button
                onClick={() => onRemove(file.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      );
    }
  )
);

FileCard.displayName = 'FileCard';
