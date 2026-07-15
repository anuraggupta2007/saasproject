import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Globe } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { LanguageSelector } from '../components/ui/LanguageSelector';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useLanguageRegionSettings, useUpdateLanguageRegion } from '../hooks';
import { toast } from 'react-hot-toast';
import type { LanguageRegionSettings } from '../types';

export const LanguageRegion = memo(() => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useLanguageRegionSettings();
  const updateSettings = useUpdateLanguageRegion();
  const [localSettings, setLocalSettings] = useState<LanguageRegionSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const current = localSettings || settings;

  const handleChange = useCallback((s: LanguageRegionSettings) => {
    setLocalSettings(s);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!current) return;
    try {
      await updateSettings.mutateAsync(current);
      toast.success('Language & region settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading || !current) {
    return <SkeletonLoader count={2} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Language & Region</h1>
          <p className="text-slate-400 mt-1">Set your language, timezone, and formatting preferences</p>
        </div>
        {hasChanges && (
          <Button variant="brand" onClick={handleSave} loading={updateSettings.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        )}
      </div>

      <Card variant="elevated" padding="lg">
        <LanguageSelector settings={current} onChange={handleChange} />
      </Card>
    </div>
  );
});

LanguageRegion.displayName = 'LanguageRegion';

export default LanguageRegion;
