import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, Trash2, Shield } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { PrivacySettingsPanel } from '../components/ui/PrivacySettingsPanel';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { usePrivacySettings, useUpdatePrivacy, useDownloadUserData, useRequestAccountDeletion, useCancelAccountDeletion } from '../hooks';
import { toast } from 'react-hot-toast';
import type { PrivacySettings } from '../types';

export const Privacy = memo(() => {
  const navigate = useNavigate();
  const { data: settings, isLoading } = usePrivacySettings();
  const updatePrivacy = useUpdatePrivacy();
  const downloadData = useDownloadUserData();
  const requestDeletion = useRequestAccountDeletion();
  const cancelDeletion = useCancelAccountDeletion();

  const [localSettings, setLocalSettings] = useState<PrivacySettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteRequestDialog, setShowDeleteRequestDialog] = useState(false);

  const current = localSettings || settings;

  const handleChange = useCallback((s: PrivacySettings) => {
    setLocalSettings(s);
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!current) return;
    try {
      await updatePrivacy.mutateAsync(current);
      toast.success('Privacy settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleDownloadData = () => {
    downloadData.mutate(undefined, {
      onSuccess: () => toast.success('Data export started'),
      onError: () => toast.error('Export failed'),
    });
  };

  const handleRequestDeletion = () => {
    requestDeletion.mutate(undefined, {
      onSuccess: () => { toast.success('Deletion request submitted'); setShowDeleteRequestDialog(false); },
      onError: () => toast.error('Failed to submit request'),
    });
  };

  if (isLoading || !current) {
    return <SkeletonLoader count={3} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Privacy</h1>
          <p className="text-slate-400 mt-1">Manage your privacy preferences</p>
        </div>
        {hasChanges && (
          <Button variant="brand" onClick={handleSave} loading={updatePrivacy.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save
          </Button>
        )}
      </div>

      <Card variant="elevated" padding="lg">
        <PrivacySettingsPanel settings={current} onChange={handleChange} />
      </Card>

      <Card variant="elevated" padding="lg">
        <CardHeader title="Data Management" icon={<Shield className="w-5 h-5" />} />
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="text-sm font-medium text-white">Download Your Data</p>
              <p className="text-xs text-slate-500">Get a copy of all your personal data</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadData} loading={downloadData.isPending} leftIcon={<Download className="w-4 h-4" />}>
              Download
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-400">Request Account Deletion</p>
              <p className="text-xs text-slate-500">Permanently delete your account and data</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteRequestDialog(true)} leftIcon={<Trash2 className="w-4 h-4" />}>
              Request Deletion
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={showDeleteRequestDialog}
        title="Request Account Deletion"
        description="This will initiate the process to permanently delete your account and all associated data. This action cannot be undone."
        confirmLabel="Request Deletion"
        variant="danger"
        onConfirm={handleRequestDeletion}
        onCancel={() => setShowDeleteRequestDialog(false)}
      />
    </div>
  );
});

Privacy.displayName = 'Privacy';

export default Privacy;
