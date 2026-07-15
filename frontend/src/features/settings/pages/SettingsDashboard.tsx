import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Shield, Key, Link, Bell, Clock, TrendingUp,
  ArrowRight, CheckCircle, AlertTriangle, Mail
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Badge } from '@/features/backup/components/ui/Badge';
import { Progress } from '@/features/backup/components/ui/Progress';
import { ActivityTimeline } from '../components/ui/ActivityTimeline';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useSettingsDashboard } from '../hooks';
import { cn } from '@/utils/cn';

export const SettingsDashboard = memo(() => {
  const navigate = useNavigate();
  const { data, isLoading } = useSettingsDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="profile" />
        <SkeletonLoader count={2} variant="stat" />
      </div>
    );
  }

  const profile = data?.profile;
  const security = data?.security;
  const accounts = data?.connectedAccounts || [];
  const apiKeys = data?.apiKeys || [];
  const sessions = data?.activeSessions || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Profile</p>
              <p className="text-lg font-bold text-white">{profile?.profileCompletion || 0}%</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Security Score</p>
              <p className="text-lg font-bold text-white">{data?.securityScore || 0}%</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Link className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Email Accounts</p>
              <p className="text-lg font-bold text-white">{accounts.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">API Keys</p>
              <p className="text-lg font-bold text-white">{apiKeys.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {profile && (
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-lg font-bold text-brand-400 overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
                )}
              </div>
              <div>
                <h3 className="font-bold text-white">{profile.fullName}</h3>
                <p className="text-sm text-slate-400">{profile.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/settings/profile')}>
              Edit Profile <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <Progress value={profile.profileCompletion} max={100} variant={profile.profileCompletion === 100 ? 'success' : 'brand'} showLabel label="Profile Completion" />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card variant="elevated" padding="lg">
            <CardHeader
              title="Quick Actions"
              subtitle="Common settings"
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Profile', icon: <User className="w-5 h-5" />, route: '/dashboard/settings/profile', color: 'text-brand-400', bg: 'bg-brand-500/10' },
                  { label: 'Security', icon: <Shield className="w-5 h-5" />, route: '/dashboard/settings/security', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'API Keys', icon: <Key className="w-5 h-5" />, route: '/dashboard/settings/api-keys', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                  { label: 'Accounts', icon: <Link className="w-5 h-5" />, route: '/dashboard/settings/connected-accounts', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Notifications', icon: <Bell className="w-5 h-5" />, route: '/dashboard/settings/notifications', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Appearance', icon: <TrendingUp className="w-5 h-5" />, route: '/dashboard/settings/appearance', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                ].map((item) => (
                  <motion.button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
                    whileHover={{ y: -2 }}
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg, item.color)}>
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-white">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card variant="elevated" padding="lg">
            <CardHeader title="Security Overview" />
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn('w-4 h-4', security?.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500')} />
                  <span className="text-sm text-white">2FA</span>
                </div>
                <Badge variant={security?.twoFactorEnabled ? 'success' : 'warning'} size="sm">
                  {security?.twoFactorEnabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white">Active Sessions</span>
                </div>
                <span className="text-sm font-bold text-white">{sessions.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white">Email Verified</span>
                </div>
                <Badge variant={profile?.emailVerified ? 'success' : 'warning'} size="sm">
                  {profile?.emailVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {data?.recentActivity && data.recentActivity.length > 0 && (
        <Card variant="elevated" padding="lg">
          <CardHeader
            title="Recent Activity"
            subtitle="Latest account events"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings/activity')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
          <CardContent>
            <ActivityTimeline entries={data.recentActivity.slice(0, 5)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
});

SettingsDashboard.displayName = 'SettingsDashboard';

export default SettingsDashboard;
