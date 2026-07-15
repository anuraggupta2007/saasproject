import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, File, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { formatBytes } from '@/utils/format'
import { useFileUpload } from '@/hooks'
import { ProgressBar } from '@/design-system'

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

export interface UploadedFile {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
  uploadId?: string
}

interface UploadDropzoneProps {
  accept?: string[]
  maxSize?: number
  multiple?: boolean
  onFiles: (files: File[]) => void
  uploading?: UploadedFile[]
  className?: string
}

const formatExtension = (ext: string) => ext.replace('.', '').toUpperCase()

export function UploadDropzone({
  accept = ['.mbox', '.pst', '.eml', '.msg'],
  maxSize = 10240,
  multiple = true,
  onFiles,
  uploading = [],
  className = '',
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: File[]) => {
      const valid = files.filter((f) => {
        const sizeMB = f.size / (1024 * 1024)
        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        return sizeMB <= maxSize && (accept.includes(ext) || accept.includes('*'))
      })
      if (valid.length) onFiles(valid)
    },
    [accept, maxSize, onFiles],
  )

  const { dragging, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } =
    useFileUpload(handleFiles)

  return (
    <div className={className}>
      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload files"
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept.join(',')}
          multiple={multiple}
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
        />

        <motion.div
          animate={{ scale: dragging ? 1.05 : 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              dragging ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-slate-500'
            }`}
          >
            <Upload className="w-7 h-7" />
          </div>

          <div className="text-center">
            <p className="text-base font-semibold text-slate-300 mb-1">
              {dragging ? 'Drop files here' : 'Drop files or click to upload'}
            </p>
            <p className="text-sm text-slate-500">
              Supports {accept.map(formatExtension).join(', ')} up to{' '}
              {maxSize >= 1024 ? `${maxSize / 1024} GB` : `${maxSize} MB`}
            </p>
          </div>

          {!dragging && (
            <div className="flex gap-2">
              {accept.map((ext) => (
                <span key={ext} className="badge badge-neutral text-xs">
                  {formatExtension(ext)}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {uploading.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-2"
          >
            {uploading.map((item) => (
              <FileItem key={item.id} item={item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FileItem({ item }: { item: UploadedFile }) {
  const icons = {
    idle: <File className="w-4 h-4 text-slate-500" />,
    uploading: <Loader className="w-4 h-4 text-brand-400 animate-spin" />,
    done: <CheckCircle className="w-4 h-4 text-accent-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="card p-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          {icons[item.status]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-slate-200 truncate">{item.file.name}</p>
            <span className="text-xs text-slate-500 shrink-0">{formatBytes(item.file.size)}</span>
          </div>
          {item.status === 'uploading' && (
            <ProgressBar value={item.progress} size="sm" showPercent />
          )}
          {item.status === 'done' && (
            <p className="text-xs text-accent-400">Upload complete</p>
          )}
          {item.status === 'error' && (
            <p className="text-xs text-red-400">{item.error || 'Upload failed'}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
