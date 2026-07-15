import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  Upload, RefreshCw, Download, AlertCircle,
  FileText, Settings, Zap, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { UploadDropzone, type UploadedFile } from '@/components/ui/UploadDropzone'
import { ProgressBar, EmptyState, StatusBadge, Select } from '@/design-system'
import { conversionApi } from '@/api/conversionApi'
import { formatDateTime } from '@/utils/format'
import { getErrorMessage } from '@/utils/error'
import { downloadBlob } from '@/utils/download'

const OUTPUT_FORMATS = [
  { value: '', label: 'Select output format...' },
  { value: 'pst', label: 'PST – Outlook Data File' },
  { value: 'mbox', label: 'MBOX – Unix Mailbox' },
  { value: 'eml', label: 'EML – Individual Emails' },
  { value: 'msg', label: 'MSG – Outlook Message' },
  { value: 'pdf', label: 'PDF – Portable Document' },
  { value: 'html', label: 'HTML – Web Format' },
  { value: 'csv', label: 'CSV – Spreadsheet' },
]

const INPUT_FORMATS = ['.mbox', '.pst', '.eml', '.msg', '.emlx', '.mbx']

interface ConversionJob {
  id: string
  name: string
  input_format: string
  output_format: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress: number
  created_at: string
  file_size?: number
}

export default function ConvertPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [outputFormat, setOutputFormat] = useState('')
  const [jobs, setJobs] = useState<ConversionJob[]>([])
  const [uploadId, setUploadId] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return conversionApi.uploadFile(formData, (progress) => {
        setFiles((prev) =>
          prev.map((f) => f.file === file ? { ...f, progress, status: 'uploading' } : f)
        )
      })
    },
    onSuccess: (res, file) => {
      const uid = res.data.upload_id || res.data.id
      setUploadId(uid)
      setFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, status: 'done', uploadId: uid } : f)
      )
      toast.success('File uploaded successfully')
    },
    onError: (err, file) => {
      setFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, status: 'error', error: getErrorMessage(err) } : f)
      )
      toast.error(getErrorMessage(err))
    },
  })

  const convertMutation = useMutation({
    mutationFn: () => conversionApi.createJob({ upload_id: uploadId!, output_format: outputFormat }),
    onSuccess: (res) => {
      const job = res.data
      setJobs((prev) => [job, ...prev])
      toast.success('Conversion started!')
      // Poll for progress
      pollJob(job.id)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const pollJob = useCallback((jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await conversionApi.getJob(jobId)
        const updated = res.data
        setJobs((prev) => prev.map((j) => j.id === jobId ? updated : j))
        if (['completed', 'failed', 'cancelled'].includes(updated.status)) {
          clearInterval(interval)
        }
      } catch { clearInterval(interval) }
    }, 2000)
  }, [])

  const handleFiles = (newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      progress: 0,
      status: 'idle',
    }))
    setFiles(mapped)
    // Auto-upload first file
    if (newFiles[0]) uploadMutation.mutate(newFiles[0])
  }

  const handleDownload = async (jobId: string, filename: string) => {
    try {
      const res = await conversionApi.downloadResult(jobId)
      downloadBlob(res.data, filename)
    } catch { toast.error('Download failed') }
  }

  const canConvert = uploadId && outputFormat && !convertMutation.isPending

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Email Converter</h1>
        <p className="text-slate-500 text-sm">Convert PST, MBOX, EML, MSG files to any format</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
              <Upload className="w-4 h-4 text-brand-400" />
            </div>
            <h2 className="font-semibold text-white">Upload Source File</h2>
          </div>

          <UploadDropzone
            accept={INPUT_FORMATS}
            maxSize={10240}
            multiple={false}
            onFiles={handleFiles}
            uploading={files}
          />
        </motion.div>

        {/* Conversion Options */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Settings className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-semibold text-white">Conversion Options</h2>
          </div>

          <div className="space-y-4">
            <Select
              label="Output Format"
              options={OUTPUT_FORMATS}
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            />

            {/* Format info */}
            {outputFormat && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-brand-500/8 border border-brand-500/15"
              >
                <div className="flex items-center gap-2 text-sm text-brand-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Converting to {outputFormat.toUpperCase()}</span>
                </div>
              </motion.div>
            )}

            {/* Options */}
            <div className="space-y-2">
              <p className="label">Advanced Options</p>
              {[
                { id: 'preserve_folders', label: 'Preserve folder structure' },
                { id: 'include_attachments', label: 'Include attachments' },
                { id: 'deduplicate', label: 'Remove duplicates' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-brand-500" />
                  <span className="text-sm text-slate-300">{opt.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={() => convertMutation.mutate()}
              disabled={!canConvert}
              className={`btn-primary w-full justify-center btn-lg ${!canConvert ? 'opacity-50 cursor-not-allowed' : 'glow-brand-sm'}`}
            >
              {convertMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting conversion...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Convert File
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>

            {!uploadId && (
              <p className="text-xs text-slate-500 text-center">Upload a file first to enable conversion</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Jobs List */}
      {jobs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h2 className="font-semibold text-white mb-4">Conversion Jobs</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 rounded-xl bg-white/3 border border-white/5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{job.name || `Job ${job.id.slice(0, 8)}`}</p>
                      <p className="text-xs text-slate-500">
                        → {job.output_format?.toUpperCase()} · {formatDateTime(job.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={job.status} />
                    {job.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(job.id, `converted.${job.output_format}`)}
                        className="btn-secondary btn-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    )}
                  </div>
                </div>
                {['running', 'queued'].includes(job.status) && (
                  <ProgressBar value={job.progress} showPercent size="sm" />
                )}
                {job.status === 'failed' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Conversion failed. Please try again.
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state for first time */}
      {jobs.length === 0 && files.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<RefreshCw className="w-8 h-8" />}
            title="No conversions yet"
            description="Upload a file above to get started. Supports PST, MBOX, EML, and MSG files."
          />
        </div>
      )}
    </div>
  )
}
