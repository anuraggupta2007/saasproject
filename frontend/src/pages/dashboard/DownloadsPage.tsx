import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { FileArchive, Search, ShieldAlert, ArrowDownToLine, Loader } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatBytes, formatDateTime } from '@/utils/format'
import { downloadBlob } from '@/utils/download'
import apiClient from '@/lib/apiClient'



interface DownloadableFile {
  id: string
  name: string
  format: string
  size: number
  expires_at: string
  created_at: string
  job_type: 'backup' | 'conversion'
}

export default function DownloadsPage() {
  const [search, setSearch] = useState('')

  const { data: downloads = [], isLoading } = useQuery<DownloadableFile[]>({
    queryKey: ['downloads'],
    queryFn: () => apiClient.get('/api/v1/downloads/').then((r) => r.data.items || r.data),
  })

  const handleDownload = async (file: DownloadableFile) => {
    try {
      const res = await apiClient.get(`/api/v1/downloads/${file.id}/file`, { responseType: 'blob' })
      downloadBlob(res.data, file.name)
      toast.success(`Downloaded ${file.name}`)
    } catch {
      toast.error('Failed to download archive')
    }
  }

  // Demo Fallback
  const demoDownloads: DownloadableFile[] = [
    {
      id: 'dl-1',
      name: 'gmail_backup_inbox_20260708.mbox',
      format: 'mbox',
      size: 1048576 * 15,
      expires_at: new Date(Date.now() + 86400000 * 6).toISOString(),
      created_at: new Date().toISOString(),
      job_type: 'backup'
    },
    {
      id: 'dl-2',
      name: 'archive_outlook_converted.pst',
      format: 'pst',
      size: 1048576 * 142,
      expires_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
      job_type: 'conversion'
    }
  ]

  const files = downloads.length > 0 ? downloads : demoDownloads
  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Downloads Vault</h1>
        <p className="text-slate-500 text-sm">Access and download your email backup archives and converted files</p>
      </div>

      {/* Search */}
      <div className="card flex items-center gap-2 bg-white/5 rounded-xl border border-white/5 px-3 py-2 w-full md:max-w-xs">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Filter downloads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader className="w-8 h-8 text-brand-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">No download archives available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((file, i) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0">
                    <FileArchive className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatBytes(file.size)} · {file.format.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-3 text-xs text-slate-500">
                  <span>Created: {formatDateTime(file.created_at)}</span>
                  <span className="flex items-center gap-1 text-yellow-500/80">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Expires in {Math.round((new Date(file.expires_at).getTime() - Date.now()) / 86400000)}d
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="btn-primary btn-sm flex-1 justify-center"
                >
                  <ArrowDownToLine className="w-4 h-4" /> Download File
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
