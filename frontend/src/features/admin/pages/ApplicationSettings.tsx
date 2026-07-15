import { memo, useState } from 'react';
import { Settings, Globe, CreditCard, Database, Flag, Shield, Palette, Languages, Save } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Switch } from '@/features/backup/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/features/backup/components/ui/Tabs';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppSettings, useUpdateSettings } from '../hooks';
import { toast } from 'react-hot-toast';
import type { AppSettings } from '../types';

export const ApplicationSettings = memo(() => {
  const [activeTab, setActiveTab] = useState('general');
  const { data: settingsData, isLoading } = useAppSettings();
  const updateSettings = useUpdateSettings();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const current = settings || settingsData;

  const handleSave = (section: string) => {
    if (!current) return;
    updateSettings.mutate({ section, data: current[section as keyof AppSettings] as Record<string, unknown> }, {
      onSuccess: () => toast.success(`${section} settings saved`),
      onError: () => toast.error('Failed to save'),
    });
  };

  if (isLoading) return <SkeletonLoader count={3} variant="card" />;
  if (!current) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Application Settings</h1>
          <p className="text-slate-400 mt-1">Configure platform settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-xl">
          <TabsTrigger value="general"><Settings className="w-4 h-4 mr-1" />General</TabsTrigger>
          <TabsTrigger value="providers"><Globe className="w-4 h-4 mr-1" />Providers</TabsTrigger>
          <TabsTrigger value="features"><Flag className="w-4 h-4 mr-1" />Features</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="w-4 h-4 mr-1" />Branding</TabsTrigger>
          <TabsTrigger value="localization"><Languages className="w-4 h-4 mr-1" />Localization</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card variant="elevated" padding="lg">
            <CardHeader title="General Settings" icon={<Settings className="w-5 h-5" />} />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Site Name</label>
                <Input defaultValue={current.general.siteName} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Site URL</label>
                <Input defaultValue={current.general.siteUrl} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Support Email</label>
                <Input defaultValue={current.general.supportEmail} />
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">Maintenance Mode</p>
                  <p className="text-xs text-slate-500">Temporarily disable public access</p>
                </div>
                <Switch checked={current.general.maintenanceMode} onChange={() => {}} />
              </div>
              <div className="flex justify-end">
                <Button variant="brand" onClick={() => handleSave('general')} loading={updateSettings.isPending} leftIcon={<Save className="w-4 h-4" />}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Providers" icon={<Globe className="w-5 h-5" />} />
            <CardContent className="space-y-4">
              {current.emailProviders.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">Email Provider</p>
                  </div>
                  <Switch checked={p.enabled} onChange={() => {}} />
                </div>
              ))}
              {current.paymentProviders.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">Payment Provider</p>
                  </div>
                  <Switch checked={p.enabled} onChange={() => {}} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Feature Flags" icon={<Flag className="w-5 h-5" />} />
            <CardContent className="space-y-3">
              {current.featureFlags.map((f) => (
                <div key={f.key} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{f.key}</p>
                    <p className="text-xs text-slate-500">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{f.rolloutPercentage}%</span>
                    <Switch checked={f.enabled} onChange={() => {}} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Security Policies" icon={<Shield className="w-5 h-5" />} />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Minimum Password Length</label>
                <Input type="number" defaultValue={current.security.passwordMinLength} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Session Timeout (minutes)</label>
                <Input type="number" defaultValue={current.security.sessionTimeout} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Max Login Attempts</label>
                <Input type="number" defaultValue={current.security.maxLoginAttempts} />
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">Require MFA for Admins</p>
                  <p className="text-xs text-slate-500">Enforce multi-factor authentication</p>
                </div>
                <Switch checked={current.security.requireMfa} onChange={() => {}} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Branding" icon={<Palette className="w-5 h-5" />} />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Company Name</label>
                <Input defaultValue={current.branding.companyName} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Logo URL</label>
                <Input defaultValue={current.branding.logoUrl} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <Input defaultValue={current.branding.primaryColor} />
                  <div className="w-10 h-10 rounded-xl border border-white/10" style={{ backgroundColor: current.branding.primaryColor }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localization">
          <Card variant="elevated" padding="lg">
            <CardHeader title="Localization" icon={<Languages className="w-5 h-5" />} />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Language</label>
                <Input defaultValue={current.localization.defaultLanguage} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date Format</label>
                <Input defaultValue={current.localization.dateFormat} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Time Format</label>
                <Input defaultValue={current.localization.timeFormat} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

ApplicationSettings.displayName = 'ApplicationSettings';

export default ApplicationSettings;
