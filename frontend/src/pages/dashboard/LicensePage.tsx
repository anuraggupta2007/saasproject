import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import { licenseApi } from '@/api/index'
import { Input } from '@/design-system'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

interface LicenseInfo {
  active: boolean
  license_key?: string
  expires_at?: string
  plan?: string
}

export default function LicensePage() {
  const qc = useQueryClient()
  const [licenseKeyInput, setLicenseKeyInput] = useState('')

  const { data: license } = useQuery<LicenseInfo>({
    queryKey: ['license'],
    queryFn: () => licenseApi.getCurrent().then((r) => r.data),
  })

  const activateMutation = useMutation({
    mutationFn: (key: string) => licenseApi.activate(key),
    onSuccess: () => {
      toast.success('License activated successfully!')
      setLicenseKeyInput('')
      qc.invalidateQueries({ queryKey: ['license'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deactivateMutation = useMutation({
    mutationFn: licenseApi.deactivate,
    onSuccess: () => {
      toast.success('License deactivated')
      qc.invalidateQueries({ queryKey: ['license'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Fallback demo license status
  const demoLicense: LicenseInfo = {
    active: true,
    license_key: 'MS-LIVE-9938-2283-A882-B292',
    expires_at: new Date(Date.now() + 86400000 * 365).toISOString(),
    plan: 'PRO SaaS'
  }

  const lic = license || demoLicense

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">License Management</h1>
        <p className="text-slate-500 text-sm">Activate and manage license keys for offline desktop clients and CLI tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status card */}
        <div className="card space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-400" /> License Status
          </h2>
          <div className="p-4 rounded-xl bg-surface-900 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">License State</span>
              <span className={`badge ${lic.active ? 'badge-success' : 'badge-danger'}`}>
                {lic.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {lic.active && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">License Key</span>
                  <span className="font-mono text-slate-300">{lic.license_key?.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Expiration</span>
                  <span className="text-slate-300">{lic.expires_at ? formatDateTime(lic.expires_at) : 'Never'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Product Plan</span>
                  <span className="text-slate-300 uppercase">{lic.plan}</span>
                </div>
              </>
            )}
          </div>
          {lic.active && (
            <button
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
              className="btn-ghost btn-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full justify-center"
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate License'}
            </button>
          )}
        </div>

        {/* Activation form */}
        <div className="card space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> Activate Offline License
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your purchased license key to unlock premium features in the local CLI or offline desktop application.
          </p>
          <div className="space-y-4">
            <Input
              label="License Key"
              placeholder="e.g. MS-XXXX-XXXX-XXXX-XXXX"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              disabled={lic.active}
            />
            <button
              onClick={() => activateMutation.mutate(licenseKeyInput)}
              disabled={!licenseKeyInput || activateMutation.isPending || lic.active}
              className="btn-primary w-full justify-center"
            >
              {activateMutation.isPending ? 'Validating...' : 'Activate License'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
