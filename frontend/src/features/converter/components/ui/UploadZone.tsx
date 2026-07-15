import { memo, forwardRef, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileArchive, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { InputFormat, INPUT_FORMATS } from '../../types';

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  accept?: string[];
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export const UploadZone = memo(
  forwardRef<HTMLDivElement, UploadZoneProps>(
    ({ onFiles, accept, maxFiles = 50, maxSize = 5 * 1024 * 1024 * 1024, disabled = false, className }, ref) => {
      const [isDragOver, setIsDragOver] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const inputRef = useRef<HTMLInputElement>(null);

      const acceptString = accept?.join(',') || '.mbox,.pst,.ost,.eml,.msg,.emlx';

      const validateFiles = useCallback(
        (files: File[]) => {
          const valid: File[] = [];
          const errors: string[] = [];

          for (const file of files) {
            if (file.size > maxSize) {
              errors.push(`${file.name}: exceeds max size of ${Math.round(maxSize / (1024 * 1024))}MB`);
              continue;
            }
            if (accept && accept.length > 0) {
              const ext = '.' + file.name.split('.').pop()?.toLowerCase();
              if (!accept.includes(ext)) {
                errors.push(`${file.name}: unsupported format`);
                continue;
              }
            }
            valid.push(file);
          }

          if (errors.length > 0) {
            setError(errors.join('\n'));
            setTimeout(() => setError(null), 5000);
          }

          if (valid.length > 0) {
            onFiles(valid.slice(0, maxFiles));
          }
        },
        [accept, maxFiles, maxSize, onFiles]
      );

      const handleDrop = useCallback(
        (e: React.DragEvent) => {
          e.preventDefault();
          setIsDragOver(false);
          if (disabled) return;
          const files = Array.from(e.dataTransfer.files);
          validateFiles(files);
        },
        [disabled, validateFiles]
      );

      const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }, [disabled]);

      const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
      }, []);

      const handleClick = useCallback(() => {
        if (!disabled) inputRef.current?.click();
      }, [disabled]);

      const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) validateFiles(files);
          e.target.value = '';
        },
        [validateFiles]
      );

      return (
        <div ref={ref} className={cn('relative', className)}>
          <motion.div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200',
              isDragOver
                ? 'border-brand-500 bg-brand-500/10 scale-[1.02]'
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/[0.07]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            whileHover={disabled ? {} : { scale: 1.01 }}
            whileTap={disabled ? {} : { scale: 0.99 }}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={acceptString}
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled}
            />
            <motion.div
              animate={isDragOver ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mb-4"
            >
              <Upload className="w-8 h-8 text-brand-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Email Files'}
            </h3>
            <p className="text-sm text-slate-400 text-center max-w-md">
              Drag & drop your email files here, or click to browse.
              Supports MBOX, PST, OST, EML, MSG, EMLX, and Maildir formats.
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <span>Max {Math.round(maxSize / (1024 * 1024 * 1024))}GB per file</span>
              <span>Up to {maxFiles} files</span>
            </div>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-0 left-0 right-0 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-red-300">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
  )
);

UploadZone.displayName = 'UploadZone';
