import { Download } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface DownloadCardProps {
  name: string
  version: string
  icon: LucideIcon
  fileSize: string
  link: string
  recommended?: boolean
  onDownload: (name: string) => void
}

export function DownloadCard({
  name,
  version,
  icon: Icon,
  fileSize,
  link: _link,
  recommended = false,
  onDownload,
}: DownloadCardProps) {
  return (
    <div
      className={`card relative flex flex-col justify-between ${
        recommended ? 'border-brand-500/30 bg-brand-500/5' : ''
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-6 badge badge-brand text-xs">Recommended</span>
      )}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0 shadow-md">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{version}</p>
          <p className="text-xs text-slate-500 mt-1">File Size: {fileSize}</p>
        </div>
      </div>
      <button onClick={() => onDownload(name)} className="btn-primary w-full justify-center">
        <Download className="w-4 h-4" /> Download Installer
      </button>
    </div>
  )
}
