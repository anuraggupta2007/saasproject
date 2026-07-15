import { useState } from 'react'
import { Settings, Bell, Shield, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { Switch } from '@/design-system'
import { useUIStore } from '@/store/uiStore'

export default function SettingsPage() {
  const { theme, toggleTheme } = useUIStore()
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true)

  const handleSave = () => {
    toast.success('Preferences saved successfully')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Preferences & Settings</h1>
        <p className="text-slate-500 text-sm">Configure system alerts, security settings, and UI themes</p>
      </div>

      <div className="card space-y-6">
        {/* Theme Settings */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-400" /> Visual Preferences
          </h2>
          <Switch
            label="Dark Mode Interface"
            description="Use a premium low-light color theme for the dashboard"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
        </div>

        <div className="divider" />

        {/* Notifications */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" /> Alerts & Notifications
          </h2>
          <Switch
            label="Email Summaries"
            description="Receive weekly summaries of backup and conversion audits"
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
        </div>

        <div className="divider" />

        {/* Security Preferences */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-400" /> Account Security
          </h2>
          <Switch
            label="Two-Factor Authentication (MFA)"
            description="Require a secure verification code to access your profile"
            checked={mfaEnabled}
            onChange={setMfaEnabled}
          />
        </div>

        <div className="divider" />

        {/* Backup settings */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-yellow-400" /> Desktop Settings
          </h2>
          <Switch
            label="Auto-Update Desktop Agent"
            description="Keep the offline CLI and Desktop client updated to the latest version automatically"
            checked={autoUpdate}
            onChange={setAutoUpdate}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button onClick={handleSave} className="btn-primary">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
