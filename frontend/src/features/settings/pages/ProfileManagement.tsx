import { memo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { AvatarUpload } from '../components/ui/AvatarUpload';
import { ProfileCard } from '../components/ui/ProfileCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '../hooks';
import { toast } from 'react-hot-toast';
import type { ProfileUpdateData, DateFormat, TimeFormat } from '../types';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Japan', 'India', 'Brazil', 'Netherlands', 'Sweden', 'Switzerland', 'Other',
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
];

export const ProfileManagement = memo(() => {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const [formData, setFormData] = useState<ProfileUpdateData>({});
  const [hasChanges, setHasChanges] = useState(false);

  const updateField = useCallback((key: keyof ProfileUpdateData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleAvatarUpload = useCallback((file: File) => {
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success('Avatar uploaded'),
      onError: () => toast.error('Failed to upload avatar'),
    });
  }, [uploadAvatar]);

  const handleAvatarDelete = useCallback(() => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => toast.success('Avatar removed'),
      onError: () => toast.error('Failed to remove avatar'),
    });
  }, [deleteAvatar]);

  if (isLoading) {
    return <SkeletonLoader count={3} variant="card" />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Profile Management</h1>
          <p className="text-slate-400 mt-1">Update your personal information</p>
        </div>
        {hasChanges && (
          <Button variant="brand" onClick={handleSave} loading={updateProfile.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        )}
      </div>

      {profile && (
        <Card variant="elevated" padding="lg">
          <CardHeader title="Profile Picture" />
          <CardContent>
            <AvatarUpload
              currentAvatar={profile.avatar}
              onUpload={handleAvatarUpload}
              onDelete={handleAvatarDelete}
              loading={uploadAvatar.isPending}
            />
          </CardContent>
        </Card>
      )}

      <Card variant="elevated" padding="lg">
        <CardHeader title="Personal Information" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
              <Input
                value={formData.firstName ?? profile?.firstName ?? ''}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
              <Input
                value={formData.lastName ?? profile?.lastName ?? ''}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
              <Input
                value={formData.username ?? profile?.username ?? ''}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="johndoe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <Input value={profile?.email ?? ''} disabled className="opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
              <Input
                value={formData.phone ?? profile?.phone ?? ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company</label>
              <Input
                value={formData.company ?? profile?.company ?? ''}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
              <Input
                value={formData.jobTitle ?? profile?.jobTitle ?? ''}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Country</label>
              <Select
                value={formData.country ?? profile?.country ?? ''}
                onValueChange={(v) => updateField('country', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Time Zone</label>
              <Select
                value={formData.timezone ?? profile?.timezone ?? ''}
                onValueChange={(v) => updateField('timezone', v)}
              >
                <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date Format</label>
              <Select
                value={formData.dateFormat ?? profile?.dateFormat ?? 'MM/DD/YYYY'}
                onValueChange={(v) => updateField('dateFormat', v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
            <textarea
              value={formData.bio ?? profile?.bio ?? ''}
              onChange={(e) => updateField('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full h-24 px-3.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
            <Input
              value={formData.website ?? profile?.website ?? ''}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setFormData({}); setHasChanges(false); }}>
            Discard
          </Button>
          <Button variant="brand" onClick={handleSave} loading={updateProfile.isPending} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
});

ProfileManagement.displayName = 'ProfileManagement';

export default ProfileManagement;
