import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Clock, Shield, Key, Link, CreditCard, User, LogIn, Settings } from 'lucide-react';
import { Card } from '@/features/backup/components/ui/Card';
import { Button } from '@/features/backup/components/ui/Button';
import { Input } from '@/features/backup/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/features/backup/components/ui/Select';
import { ActivityTimeline } from '../components/ui/ActivityTimeline';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useActivityLog } from '../hooks';

const CATEGORIES = [
  { value: '', label: 'All Activity' },
  { value: 'login', label: 'Login' },
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
  { value: 'api_key', label: 'API Keys' },
  { value: 'connected_account', label: 'Connected Accounts' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'account', label: 'Account' },
];

export const ActivityLog = memo(() => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useActivityLog({ page, limit: pageSize, category: category || undefined, search: searchQuery || undefined });

  const entries = data?.items || [];
  const totalPages = data?.totalPages || 1;

  if (isLoading) {
    return <SkeletonLoader count={5} variant="row" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/settings')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-slate-400 mt-1">Track all account activity and changes</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Activity" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {entries.length > 0 ? (
          <ActivityTimeline entries={entries} />
        ) : (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-slate-400" />}
            title="No activity found"
            description="Your account activity will appear here."
          />
        )}

        {data && entries.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
            <span className="text-sm text-slate-400">Showing {entries.length} of {data.total} entries</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                Prev
              </Button>
              <span className="px-3 text-sm text-slate-300">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
});

ActivityLog.displayName = 'ActivityLog';

export default ActivityLog;
