import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Building2, MapPin, Calendar, Shield } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Progress } from '@/features/backup/components/ui/Progress';
import { Badge } from '@/features/backup/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { UserProfile } from '../../types';

interface ProfileCardProps {
  profile: UserProfile;
  onEdit?: () => void;
  className?: string;
}

export const ProfileCard = memo(
  forwardRef<HTMLDivElement, ProfileCardProps>(
    ({ profile, onEdit, className }, ref) => {
      const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();

      return (
        <Card ref={ref} variant="elevated" padding="lg" className={cn('', className)}>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400 overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.fullName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={onEdit} className="text-xs text-white font-medium">Change</button>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{profile.fullName}</h3>
                <Badge variant={profile.emailVerified ? 'success' : 'warning'} size="sm">
                  {profile.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <p className="text-sm text-slate-400 mb-3">@{profile.username}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{profile.email}</span>
                {profile.company && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{profile.company}</span>}
                {profile.country && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{profile.country}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-sm text-slate-400">Profile Completion</span>
                <div className="w-32 mt-1">
                  <Progress value={profile.profileCompletion} max={100} variant={profile.profileCompletion === 100 ? 'success' : 'brand'} size="sm" showLabel />
                </div>
              </div>
              <p className="text-xs text-slate-500">Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>
      );
    }
  )
);

ProfileCard.displayName = 'ProfileCard';
