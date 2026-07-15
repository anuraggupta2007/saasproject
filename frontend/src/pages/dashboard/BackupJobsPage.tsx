import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderArchive, Play, Loader2, Folder, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Input, Select, Switch, ProgressBar, StatusBadge } from '@/design-system'
import apiClient from '@/lib/apiClient'
import { formatRelativeTime } from '@/utils/format'

interface BackupJob {
  id: string
  name: string
  account_email: string
  provider: string
  folders: string[]
  schedule: string
  incremental: boolean
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  last_run?: string
  progress: number
  total_emails_processed?: number
}

const mockFolders = [
  'INBOX',
  'Sent Mail',
  'Drafts',
  'Trash',
  'Archive',
  'Work',
  'Personal',
  'Receipts'
]

export default function BackupJobsPage() {
  const qc = useQueryClient()
  const [selectedFolders, setSelectedFolders] = useState<string[]>(['INBOX', 'Sent Mail'])
  const [filtersEnabled, setFiltersEnabled] = useState(false)
  const [incremental, setIncremental] = useState(true)
  const [schedule, setSchedule] = useState('daily')
  const [jobName, setJobName] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')

  const { data: accounts = [] } = useQuery<any[]>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/api/v1/backup/accounts').then((r) => r.data.items || r.data),
  })

  const { data: jobs = [], isLoading } = useQuery<BackupJob[]>({
    queryKey: ['backup-jobs'],
    queryFn: () => apiClient.get('/api/v1/backup/jobs').then((r) => r.data.items || r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/v1/backup/jobs', data),
    onSuccess: () => {
      toast.success('Backup job created successfully!')
      qc.invalidateQueries({ queryKey: ['backup-jobs'] })
      // Reset form
      setJobName('')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create backup job'),
  })

  const runMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/backup/jobs/${id}/run`),
    onSuccess: () => {
      toast.success('Backup execution started!')
      qc.invalidateQueries({ queryKey: ['backup-jobs'] })
    },
  })

  const toggleFolder = (folder: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]
    )
  }

  // Demo fallback
  const demoJobs: BackupJob[] = [
    {
      id: 'job-1',
      name: 'Daily Personal Inbox Sync',
      account_email: 'user@gmail.com',
      provider: 'gmail',
      folders: ['INBOX', 'Sent Mail'],
      schedule: 'daily',
      incremental: true,
      status: 'running',
      last_run: new Date(Date.now() - 3600000).toISOString(),
      progress: 68,
      total_emails_processed: 1204
    },
    {
      id: 'job-2',
      name: 'Weekly Archive Outlook Backup',
      account_email: 'user@outlook.com',
      provider: 'outlook',
      folders: ['Archive'],
      schedule: 'weekly',
      incremental: true,
      status: 'idle',
      last_run: new Date(Date.now() - 86400000 * 3).toISOString(),
      progress: 100,
      total_emails_processed: 4892
    }
  ]

  const displayJobs = jobs.length > 0 ? jobs : demoJobs

  return (
    <div className="max-w-6xl space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Backup Jobs</h1>
        <p className="text-slate-500 text-sm">Configure, schedule, and monitor automated email backups</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Create Backup Form */}
        <div className="card lg:col-span-1 h-fit space-y-5">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-brand-400" /> New Backup Profile
          </h2>

          <div className="space-y-4">
            <Input
              label="Backup Profile Name"
              placeholder="e.g. Gmail Daily Backup"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />

            <Select
              label="Email Account"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              options={[
                { value: '', label: 'Select account...' },
                ...(accounts.length > 0
                  ? accounts.map((a: any) => ({ value: a.id, label: a.email }))
                  : [{ value: 'demo-1', label: 'user@gmail.com (Gmail)' }])
              ]}
            />

            {/* Folder Selection */}
            <div>
              <label className="label">Select Folders ({selectedFolders.length} chosen)</label>
              <div className="p-3 rounded-xl bg-surface-900 border border-white/5 max-h-40 overflow-y-auto space-y-2">
                {mockFolders.map((folder) => {
                  const selected = selectedFolders.includes(folder)
                  return (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => toggleFolder(folder)}
                      className={`flex items-center justify-between w-full p-2 rounded-lg text-xs font-medium transition-all ${
                        selected ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-slate-400 border border-transparent hover:bg-white/3'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5" /> {folder}
                      </span>
                      {selected && <Check className="w-3 h-3" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <Select
              label="Schedule Sync"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              options={[
                { value: 'manual', label: 'Manual Only' },
                { value: 'hourly', label: 'Hourly Sync' },
                { value: 'daily', label: 'Daily Sync' },
                { value: 'weekly', label: 'Weekly Sync' },
                { value: 'monthly', label: 'Monthly Sync' }
              ]}
            />

            <Switch
              label="Incremental Backup"
              description="Only backup new emails to reduce storage"
              checked={incremental}
              onChange={setIncremental}
            />

            <Switch
              label="Advanced Filters"
              description="Filter by sender, keywords, or attachments"
              checked={filtersEnabled}
              onChange={setFiltersEnabled}
            />

            <AnimatePresence>
              {filtersEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 pt-2 overflow-hidden"
                >
                  <Input label="Only from address" placeholder="e.g. receipts@company.com" />
                  <Input label="Older than (days)" placeholder="e.g. 30" type="number" />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => createMutation.mutate({
                name: jobName,
                account_id: selectedAccount || 'demo-1',
                folders: selectedFolders,
                schedule,
                incremental
              })}
              disabled={!jobName || createMutation.isPending}
              className="btn-primary w-full justify-center btn-lg"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Backup Job'}
            </button>
          </div>
        </div>

        {/* Existing Backup Jobs */}
        <div className="card lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white mb-2">Active Profiles</h2>

          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {displayJobs.map((job) => (
                <div key={job.id} className="p-5 rounded-2xl bg-surface-800 border border-white/5 space-y-4 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shrink-0 shadow-lg">
                        <FolderArchive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{job.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{job.account_email} · Sync: <span className="capitalize">{job.schedule}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={job.status} />
                      <button
                        onClick={() => runMutation.mutate(job.id)}
                        disabled={job.status === 'running' || runMutation.isPending}
                        className="btn-secondary btn-sm"
                      >
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    </div>
                  </div>

                  {/* Progress details */}
                  {job.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Syncing mailbox folders...</span>
                        <span>{job.progress}%</span>
                      </div>
                      <ProgressBar value={job.progress} size="sm" />
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/5 pt-4 text-xs text-slate-400">
                    <div>
                      Last Run:{' '}
                      <span className="text-slate-200">
                        {job.last_run ? formatRelativeTime(job.last_run) : 'Never'}
                      </span>
                    </div>
                    {job.total_emails_processed && (
                      <div>
                        Total Synced: <span className="text-slate-200">{job.total_emails_processed.toLocaleString()} emails</span>
                      </div>
                    )}
                    <div>
                      Incremental: <span className="text-slate-200">{job.incremental ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
