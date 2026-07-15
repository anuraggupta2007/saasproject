import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Bell, Mail, MessageSquare, Smartphone, Moon } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Switch } from '@/features/backup/components/ui/Switch';
import { cn } from '@/utils/cn';
import type { NotificationPreferences } from '../../types';

interface NotificationSettingsPanelProps {
  preferences: NotificationPreferences;
  onChange: (preferences: NotificationPreferences) => void;
  className?: string;
}

const NOTIFICATION_TYPES = [
  { key: 'backupCompleted', label: 'Backup Completed', icon: '✅' },
  { key: 'backupFailed', label: 'Backup Failed', icon: '❌' },
  { key: 'conversionCompleted', label: 'Conversion Completed', icon: '✅' },
  { key: 'conversionFailed', label: 'Conversion Failed', icon: '❌' },
  { key: 'paymentSuccess', label: 'Payment Success', icon: '💰' },
  { key: 'paymentFailure', label: 'Payment Failure', icon: '💳' },
  { key: 'licenseExpiry', label: 'License Expiry', icon: '🔑' },
  { key: 'securityAlerts', label: 'Security Alerts', icon: '🛡️' },
  { key: 'productUpdates', label: 'Product Updates', icon: '📦' },
] as const;

export const NotificationSettingsPanel = memo(
  forwardRef<HTMLDivElement, NotificationSettingsPanelProps>(
    ({ preferences, onChange, className }, ref) => {
      const toggleChannel = (channel: keyof typeof preferences.channels) => {
        onChange({
          ...preferences,
          channels: { ...preferences.channels, [channel]: !preferences.channels[channel] },
        });
      };

      const toggleTypeChannel = (type: string, channel: 'email' | 'inApp' | 'sms') => {
        const types = { ...preferences.types };
        const typeKey = type as keyof typeof types;
        types[typeKey] = { ...types[typeKey], [channel]: !types[typeKey][channel] };
        onChange({ ...preferences, types });
      };

      return (
        <div ref={ref} className={cn('space-y-6', className)}>
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Channels</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { key: 'email' as const, label: 'Email', icon: <Mail className="w-5 h-5" /> },
                { key: 'inApp' as const, label: 'In-App', icon: <Bell className="w-5 h-5" /> },
                { key: 'sms' as const, label: 'SMS', icon: <Smartphone className="w-5 h-5" /> },
                { key: 'push' as const, label: 'Push', icon: <MessageSquare className="w-5 h-5" /> },
              ]).map((ch) => (
                <div key={ch.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{ch.icon}</span>
                    <span className="text-sm text-white">{ch.label}</span>
                  </div>
                  <Switch checked={preferences.channels[ch.key]} onChange={() => toggleChannel(ch.key)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white mb-3">Notification Types</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-xs text-slate-400 font-medium">Type</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">Email</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">In-App</th>
                    <th className="px-3 py-2 text-center text-xs text-slate-400 font-medium">SMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {NOTIFICATION_TYPES.map((type) => (
                    <tr key={type.key} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <span className="text-sm text-white">{type.icon} {type.label}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch
                          checked={preferences.types[type.key]?.email ?? false}
                          onChange={() => toggleTypeChannel(type.key, 'email')}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch
                          checked={preferences.types[type.key]?.inApp ?? false}
                          onChange={() => toggleTypeChannel(type.key, 'inApp')}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch
                          checked={preferences.types[type.key]?.sms ?? false}
                          onChange={() => toggleTypeChannel(type.key, 'sms')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
            <Moon className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Quiet Hours</p>
              <p className="text-xs text-slate-500">No notifications during these hours</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => onChange({ ...preferences, quietHours: { ...preferences.quietHours, start: e.target.value } })}
                className="px-2 py-1 text-sm bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <span className="text-slate-500">to</span>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => onChange({ ...preferences, quietHours: { ...preferences.quietHours, end: e.target.value } })}
                className="px-2 py-1 text-sm bg-white/5 border border-white/10 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      );
    }
  )
);

NotificationSettingsPanel.displayName = 'NotificationSettingsPanel';
