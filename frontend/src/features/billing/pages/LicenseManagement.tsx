import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Plus } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { LicenseCard } from '../components/ui/LicenseCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { useLicenseDetails, useActivateLicense, useDeactivateLicense, useRegenerateLicense } from '../hooks';
import { toast } from 'react-hot-toast';

export const LicenseManagement = memo(() => {
  const navigate = useNavigate();
  const [activateKey, setActivateKey] = useState('');
  const { data: license, isLoading } = useLicenseDetails();
  const activateLicense = useActivateLicense();
  const deactivateLicense = useDeactivateLicense();
  const regenerateLicense = useRegenerateLicense();

  const handleActivate = () => {
    if (!activateKey.trim()) {
      toast.error('Please enter a license key');
      return;
    }
    activateLicense.mutate(activateKey.trim(), {
      onSuccess: () => { toast.success('License activated'); setActivateKey(''); },
      onError: () => toast.error('Failed to activate license'),
    });
  };

  const handleDeactivate = (activationId: string) => {
    if (confirm('Deactivate this device?')) {
      deactivateLicense.mutate(activationId, {
        onSuccess: () => toast.success('Device deactivated'),
        onError: () => toast.error('Failed to deactivate'),
      });
    }
  };

  const handleRegenerate = () => {
    if (confirm('Regenerate your license key? This will invalidate the current key.')) {
      regenerateLicense.mutate(undefined, {
        onSuccess: () => toast.success('License key regenerated'),
        onError: () => toast.error('Failed to regenerate'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/billing')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">License Management</h1>
          <p className="text-slate-400 mt-1">Activate and manage your license keys</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <h3 className="text-lg font-bold text-white mb-4">Activate License</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Enter your license key (XXXXX-XXXXX-XXXXX-XXXXX)"
              value={activateKey}
              onChange={(e) => setActivateKey(e.target.value)}
              className="pl-10 font-mono"
            />
          </div>
          <Button variant="brand" onClick={handleActivate} loading={activateLicense.isPending} leftIcon={<Plus className="w-4 h-4" />}>
            Activate
          </Button>
        </div>
      </Card>

      {license ? (
        <LicenseCard
          license={license}
          onDeactivate={handleDeactivate}
          onRegenerate={handleRegenerate}
        />
      ) : (
        <EmptyState
          icon={<Key className="w-8 h-8 text-slate-400" />}
          title="No license found"
          description="Enter a license key above to activate your license."
        />
      )}
    </div>
  );
});

LicenseManagement.displayName = 'LicenseManagement';

export default LicenseManagement;
