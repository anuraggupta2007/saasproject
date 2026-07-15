import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Bell } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { NotificationSettingsPanel } from '../components/ui/NotificationSettingsPanel';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useNotificationPreferences, useUpdateNotifications } from '../hooks';
import { toast } from 'react-hot-toast';
import type { NotificationPreferences } from '../types';

export const NotificationPreferencesPage = memo(() => {
  const navigate = useNavigate();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateNotifications = useUpdateNotifications();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const currentPrefs = localPrefs || preferences;

  const handleChange = useCallback((prefs: NotificationPreferences) => {
    setLocalPrefs(prefs);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!currentPrefs) return;
    try {
      await updateNotifications.mutateAsync(currentPrefs);
      toast.success('Notification preferences saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  if (isLoading || !currentPrefs) {
    return <SkeletonLoader count={3} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Notification Preferences</h1>
          <p className="text-slate-400 mt-1">Configure how you receive notifications</p>
        </div>
        {hasChanges && (
          <Button variant="brand" onClick={handleSave} loading={updateNotifications.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        )}
      </div>

      <Card variant="elevated" padding="lg">
        <NotificationSettingsPanel preferences={currentPrefs} onChange={handleChange} />
      </Card>
    </div>
  );
});

NotificationPreferencesPage.displayName = 'NotificationPreferencesPage';

export default NotificationPreferencesPage;
