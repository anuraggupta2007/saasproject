import { memo, forwardRef } from 'react';
import { Eye, EyeOff, BarChart3, Mail, Shield } from 'lucide-react';
import { Switch } from '@/features/backup/components/ui/Switch';
import { cn } from '@/utils/cn';
import type { PrivacySettings, CookiePreferences } from '../../types';

interface PrivacySettingsPanelProps {
  settings: PrivacySettings;
  onChange: (settings: PrivacySettings) => void;
  className?: string;
}

export const PrivacySettingsPanel = memo(
  forwardRef<HTMLDivElement, PrivacySettingsPanelProps>(
    ({ settings, onChange, className }, ref) => {
      const toggleCookie = (key: keyof CookiePreferences) => {
        onChange({
          ...settings,
          cookiePreferences: {
            ...settings.cookiePreferences,
            [key]: !settings.cookiePreferences[key],
          },
        });
      };

      return (
        <div ref={ref} className={cn('space-y-6', className)}>
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Profile Visibility</h4>
            <div className="flex gap-3">
              {([
                { value: 'public' as const, label: 'Public', icon: <Eye className="w-4 h-4" />, desc: 'Anyone can see your profile' },
                { value: 'private' as const, label: 'Private', icon: <EyeOff className="w-4 h-4" />, desc: 'Only you can see your profile' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onChange({ ...settings, profileVisibility: opt.value })}
                  className={cn(
                    'flex-1 flex items-center gap-3 p-4 rounded-xl border transition-all',
                    settings.profileVisibility === opt.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                  )}
                >
                  {opt.icon}
                  <div className="text-left">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Display Preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-white">Show Email</p>
                    <p className="text-xs text-slate-500">Display your email on your profile</p>
                  </div>
                </div>
                <Switch checked={settings.showEmail} onChange={() => onChange({ ...settings, showEmail: !settings.showEmail })} />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-white">Show Phone</p>
                    <p className="text-xs text-slate-500">Display your phone on your profile</p>
                  </div>
                </div>
                <Switch checked={settings.showPhone} onChange={() => onChange({ ...settings, showPhone: !settings.showPhone })} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Data & Analytics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-white">Usage Analytics</p>
                    <p className="text-xs text-slate-500">Help improve the product with anonymous usage data</p>
                  </div>
                </div>
                <Switch checked={settings.allowAnalytics} onChange={() => onChange({ ...settings, allowAnalytics: !settings.allowAnalytics })} />
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-white">Marketing Emails</p>
                    <p className="text-xs text-slate-500">Receive product updates and offers</p>
                  </div>
                </div>
                <Switch checked={settings.allowMarketing} onChange={() => onChange({ ...settings, allowMarketing: !settings.allowMarketing })} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Cookie Preferences</h4>
            <div className="space-y-3">
              {([
                { key: 'necessary' as const, label: 'Necessary', desc: 'Required for the app to function', alwaysOn: true },
                { key: 'functional' as const, label: 'Functional', desc: 'Enhanced features and personalization' },
                { key: 'analytics' as const, label: 'Analytics', desc: 'Help us understand usage patterns' },
                { key: 'marketing' as const, label: 'Marketing', desc: 'Used for targeted advertising' },
              ]).map((cookie) => (
                <div key={cookie.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm text-white">{cookie.label}</p>
                    <p className="text-xs text-slate-500">{cookie.desc}</p>
                  </div>
                  {cookie.alwaysOn ? (
                    <span className="text-xs text-emerald-400 font-medium">Always On</span>
                  ) : (
                    <Switch
                      checked={settings.cookiePreferences[cookie.key]}
                      onChange={() => toggleCookie(cookie.key)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  )
);

PrivacySettingsPanel.displayName = 'PrivacySettingsPanel';
