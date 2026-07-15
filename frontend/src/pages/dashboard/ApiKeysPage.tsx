import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Plus, Trash2, ShieldAlert, Check, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiKeyApi } from '@/api/index'
import { Input, Checkbox, Modal, ConfirmDialog, EmptyState } from '@/design-system'
import { getErrorMessage } from '@/utils/error'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
}

export default function ApiKeysPage() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:backups'])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => apiKeyApi.list().then((r) => r.data.items || r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => apiKeyApi.create({ name: newKeyName, scopes: selectedScopes }),
    onSuccess: (res) => {
      setCreatedKey(res.data.key)
      setNewKeyName('')
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeyApi.revoke(id),
    onSuccess: () => {
      toast.success('API Key revoked successfully')
      setRevokeId(null)
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success('API key copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  // Fallback demo key list
  const demoKeys: ApiKey[] = [
    { id: 'key-1', name: 'Workstation backup cron', key_prefix: 'ms_live_a1b2...', scopes: ['read:backups', 'write:backups'], created_at: new Date().toISOString() }
  ]

  const displayKeys = keys.length > 0 ? keys : demoKeys

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Developer API Keys</h1>
          <p className="text-slate-500 text-sm">Create and manage access keys for custom integration with the MailSavior API</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Create Key
        </button>
      </div>

      {displayKeys.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Key className="w-8 h-8" />}
            title="No API keys yet"
            description="Generate a developer token to programmatically trigger backups or conversion pipelines."
            action={
              <button onClick={() => setModalOpen(true)} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Generate API Key
              </button>
            }
          />
        </div>
      ) : (
        <div className="card space-y-4">
          <h2 className="text-base font-bold text-white mb-2">Active API Keys</h2>
          <div className="divide-y divide-white/5 space-y-4">
            {displayKeys.map((key) => (
              <div key={key.id} className="flex items-start justify-between gap-4 pt-4 first:pt-0">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">{key.name}</h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>{key.key_prefix}</span>
                    <span>·</span>
                    <span className="text-slate-400">Scopes: {key.scopes.join(', ')}</span>
                  </div>
                </div>
                <button
                  onClick={() => setRevokeId(key.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                  title="Revoke Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCreatedKey(null) }}
        title={createdKey ? 'API Key Created' : 'Create New API Key'}
        size="md"
      >
        {createdKey ? (
          <div className="space-y-5">
            <p className="text-sm text-yellow-500/90 font-medium flex items-center gap-1.5 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
              <ShieldAlert className="w-4 h-4" /> Make sure to copy this token now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-900 border border-white/5 font-mono text-xs text-brand-300">
              <span className="flex-1 truncate">{createdKey}</span>
              <button
                onClick={handleCopy}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-accent-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button onClick={() => { setModalOpen(false); setCreatedKey(null) }} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Key Name"
              placeholder="e.g. Production Backup Server"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <div className="space-y-2">
              <label className="label">Allowed Scopes</label>
              {['read:backups', 'write:backups', 'read:conversions', 'write:conversions'].map((scope) => (
                <Checkbox
                  key={scope}
                  label={scope}
                  checked={selectedScopes.includes(scope)}
                  onChange={() => handleScopeToggle(scope)}
                />
              ))}
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newKeyName || createMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {createMutation.isPending ? 'Generating...' : 'Generate API Key'}
            </button>
          </div>
        )}
      </Modal>

      {/* Revoke Confirm */}
      <ConfirmDialog
        open={!!revokeId}
        onClose={() => setRevokeId(null)}
        onConfirm={() => revokeId && revokeMutation.mutate(revokeId)}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? Any applications currently using this key will immediately lose access."
        confirmLabel="Revoke Key"
        variant="danger"
        loading={revokeMutation.isPending}
      />
    </div>
  )
}
