import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, Plus, Trash2, RefreshCw,
  Settings, Globe, Server, Eye, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, ConfirmDialog, Input, EmptyState, SkeletonCard, StatusBadge } from '@/design-system'
import { useForm } from 'react-hook-form'
import { getErrorMessage } from '@/utils/error'
import apiClient from '@/lib/apiClient'

const PROVIDERS = [
  { id: 'gmail', name: 'Gmail', color: '#EA4335', icon: '✉️', oauth: true },
  { id: 'outlook', name: 'Outlook', color: '#0078D4', icon: '📧', oauth: true },
  { id: 'microsoft365', name: 'Microsoft 365', color: '#0078D4', icon: '🔷', oauth: true },
  { id: 'yahoo', name: 'Yahoo Mail', color: '#720E9E', icon: '🟣', oauth: true },
  { id: 'icloud', name: 'iCloud Mail', color: '#3a7afe', icon: '☁️', oauth: false },
  { id: 'zoho', name: 'Zoho Mail', color: '#E42527', icon: '🔴', oauth: false },
  { id: 'aol', name: 'AOL Mail', color: '#FF0B00', icon: '🅰️', oauth: false },
  { id: 'imap', name: 'Custom IMAP', color: '#10b981', icon: '🖥️', oauth: false },
]

interface Account {
  id: string
  provider: string
  email: string
  status: string
  last_sync?: string
  total_emails?: number
}

export default function AccountsPage() {
  const qc = useQueryClient()
  const [addModal, setAddModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => apiClient.get('/api/v1/backup/accounts').then((r) => r.data.items || r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/backup/accounts/${id}`),
    onSuccess: () => {
      toast.success('Account removed')
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const syncMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/backup/accounts/${id}/sync`),
    onSuccess: () => {
      toast.success('Sync started')
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleOAuth = (provider: typeof PROVIDERS[0]) => {
    // Redirect to OAuth flow
    window.location.href = `/api/v1/backup/oauth/${provider.id}/connect`
  }

  // Demo accounts for display
  const demoAccounts: Account[] = [
    { id: '1', provider: 'gmail', email: 'user@gmail.com', status: 'active', last_sync: new Date(Date.now() - 3600000).toISOString(), total_emails: 15420 },
    { id: '2', provider: 'outlook', email: 'user@outlook.com', status: 'syncing', total_emails: 8920 },
  ]

  const displayAccounts = accounts.length > 0 ? accounts : demoAccounts

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connected Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your email accounts for backup</p>
        </div>
        <button onClick={() => setAddModal(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Accounts List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : displayAccounts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Mail className="w-8 h-8" />}
            title="No accounts connected"
            description="Connect your Gmail, Outlook, or any IMAP account to start backing up your emails."
            action={
              <button onClick={() => setAddModal(true)} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Connect First Account
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {displayAccounts.map((account, i) => {
            const provider = PROVIDERS.find((p) => p.id === account.provider) || PROVIDERS[7]
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card flex flex-wrap items-center gap-4"
              >
                {/* Provider icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${provider.color}18` }}
                >
                  {provider.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{provider.name}</p>
                    <StatusBadge status={account.status} />
                  </div>
                  <p className="text-sm text-slate-400 truncate">{account.email}</p>
                  {account.total_emails && (
                    <p className="text-xs text-slate-500 mt-0.5">{account.total_emails.toLocaleString()} emails</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => syncMutation.mutate(account.id)}
                    disabled={syncMutation.isPending}
                    className="btn-ghost btn-sm"
                    title="Sync now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button className="btn-ghost btn-sm" title="Settings">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(account.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setSelectedProvider(null) }} title="Connect Email Account" size="lg">
        {!selectedProvider ? (
          <div>
            <p className="text-sm text-slate-400 mb-5">Choose your email provider to get started</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.oauth) {
                      handleOAuth(p)
                    } else {
                      setSelectedProvider(p)
                    }
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/15 transition-all group"
                >
                  <div className="text-2xl">{p.icon}</div>
                  <span className="text-xs font-medium text-slate-300 text-center">{p.name}</span>
                  {p.oauth && (
                    <span className="badge badge-brand text-[10px] px-1.5 py-0.5">OAuth</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <IMAPForm provider={selectedProvider} onSuccess={() => { setAddModal(false); setSelectedProvider(null); qc.invalidateQueries({ queryKey: ['accounts'] }) }} />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Remove Account"
        description="This will disconnect the account and stop all backups. Existing backups are not deleted."
        confirmLabel="Remove Account"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function IMAPForm({ provider, onSuccess }: { provider: typeof PROVIDERS[0]; onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<{
    email: string; password: string; host: string; port: string;
  }>()

  const mutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiClient.post('/api/v1/backup/accounts', { provider: provider.id, ...data }),
    onSuccess: () => { toast.success('Account connected!'); onSuccess() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d as any))} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{provider.icon}</span>
        <span className="font-semibold text-white">{provider.name} — IMAP/POP3</span>
      </div>
      <Input label="Email Address" type="email" placeholder="you@example.com" leftIcon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email', { required: true })} />
      <Input label="Password / App Password" type={showPw ? 'text' : 'password'} placeholder="••••••••" leftIcon={<Globe className="w-4 h-4" />}
        rightIcon={<button type="button" onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
        {...register('password', { required: true })} />
      {provider.id === 'imap' && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="IMAP Host" placeholder="imap.example.com" leftIcon={<Server className="w-4 h-4" />} {...register('host', { required: true })} />
          <Input label="Port" placeholder="993" {...register('port')} />
        </div>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
          {mutation.isPending ? 'Connecting...' : 'Connect Account'}
        </button>
      </div>
    </form>
  )
}
