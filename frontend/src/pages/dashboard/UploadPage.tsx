import { useState } from 'react'


import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, HardDrive } from 'lucide-react'
import toast from 'react-hot-toast'
import { UploadDropzone, type UploadedFile } from '@/components/ui/UploadDropzone'
import { conversionApi } from '@/api/conversionApi'
import { getErrorMessage } from '@/utils/error'

export default function UploadPage() {
  const qc = useQueryClient()
  const [files, setFiles] = useState<UploadedFile[]>([])

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
      setFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, status: 'done', uploadId: uid } : f)
      )
      toast.success(`${file.name} uploaded successfully!`)
      qc.invalidateQueries({ queryKey: ['downloads'] })
    },
    onError: (err, file) => {
      setFiles((prev) =>
        prev.map((f) => f.file === file ? { ...f, status: 'error', error: getErrorMessage(err) } : f)
      )
      toast.error(getErrorMessage(err))
    }
  })

  const handleFiles = (newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      progress: 0,
      status: 'idle',
    }))
    setFiles((prev) => [...mapped, ...prev])

    // Upload files sequentially
    newFiles.forEach((file) => uploadMutation.mutate(file))
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Upload Archives</h1>
        <p className="text-slate-500 text-sm">Upload bulk mail archives (MBOX, PST, EML, MSG) to your cloud storage vault</p>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-base">Select files to upload</h2>
            <p className="text-xs text-slate-500">Files uploaded here will be stored in your encrypted cloud vault and can be processed, converted, or backed up anytime.</p>
          </div>
        </div>

        <UploadDropzone
          accept={['.mbox', '.pst', '.eml', '.msg']}
          maxSize={10240}
          multiple={true}
          onFiles={handleFiles}
          uploading={files}
        />
      </div>

      {/* Cloud vault callout */}
      <div className="card flex items-center gap-4 bg-surface-800/40 border border-white/5">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 shrink-0">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Secure Encrypted Cloud Vault</h3>
          <p className="text-xs text-slate-500 mt-0.5">All files are encrypted with AES-256 immediately upon arrival. Uploaded archives are fully sandboxed and stored securely.</p>
        </div>
      </div>
    </div>
  )
}
