import { memo, forwardRef } from 'react';
import { Globe, Clock, Hash, DollarSign } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { cn } from '@/utils/cn';
import type { LanguageRegionSettings, DateFormat, TimeFormat, NumberFormat, CurrencyDisplay } from '../../types';

interface LanguageSelectorProps {
  settings: LanguageRegionSettings;
  onChange: (settings: LanguageRegionSettings) => void;
  className?: string;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export const LanguageSelector = memo(
  forwardRef<HTMLDivElement, LanguageSelectorProps>(
    ({ settings, onChange, className }, ref) => (
      <div ref={ref} className={cn('space-y-4', className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
            <Select value={settings.language} onValueChange={(v) => onChange({ ...settings, language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Time Zone</label>
            <Select value={settings.timezone} onValueChange={(v) => onChange({ ...settings, timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Date Format</label>
            <Select value={settings.dateFormat} onValueChange={(v) => onChange({ ...settings, dateFormat: v as DateFormat })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Time Format</label>
            <Select value={settings.timeFormat} onValueChange={(v) => onChange({ ...settings, timeFormat: v as TimeFormat })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Number Format</label>
            <Select value={settings.numberFormat} onValueChange={(v) => onChange({ ...settings, numberFormat: v as NumberFormat })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1,234.56">1,234.56 (US)</SelectItem>
                <SelectItem value="1.234,56">1.234,56 (EU)</SelectItem>
                <SelectItem value="1 234,56">1 234,56 (FR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Currency Display</label>
            <Select value={settings.currencyDisplay} onValueChange={(v) => onChange({ ...settings, currencyDisplay: v as CurrencyDisplay })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="symbol">$100.00</SelectItem>
                <SelectItem value="code">USD 100.00</SelectItem>
                <SelectItem value="none">100.00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  )
);

LanguageSelector.displayName = 'LanguageSelector';
