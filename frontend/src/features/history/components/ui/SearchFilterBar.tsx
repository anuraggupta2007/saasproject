import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/features/backup/components/ui/Input';
import { Button } from '@/features/backup/components/ui/Button';
import type { UnifiedHistoryFilter, JobType, JobStatus } from '../../types';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: UnifiedHistoryFilter;
  onFilterChange: (filters: UnifiedHistoryFilter) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  savedFilters?: Array<{ id: string; name: string }>;
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filter: UnifiedHistoryFilter) => void;
  className?: string;
}

export const SearchFilterBar = memo(
  forwardRef<HTMLDivElement, SearchFilterBarProps>(
    ({ searchQuery, onSearchChange, filters, onFilterChange, onClearFilters, showFilters, onToggleFilters, savedFilters, onSaveFilter, onLoadFilter, className }, ref) => {
      const hasActiveFilters = Object.keys(filters).some((key) => {
        const val = (filters as any)[key];
        return val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
      });

      return (
        <div ref={ref} className={cn('space-y-3', className)}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search by job ID, name, or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'brand' : 'outline'}
              size="sm"
              onClick={onToggleFilters}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              Filters {hasActiveFilters && `(${Object.keys(filters).length})`}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                Clear All
              </Button>
            )}
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Job Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['backup', 'conversion', 'scheduled'] as JobType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          const current = filters.jobType || [];
                          const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
                          onFilterChange({ ...filters, jobType: updated.length > 0 ? updated : undefined });
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                          filters.jobType?.includes(type)
                            ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {(['completed', 'failed', 'running', 'cancelled'] as JobStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          const current = filters.status || [];
                          const updated = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
                          onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-lg border transition-colors',
                          filters.status?.includes(status)
                            ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/30'
                        )}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value || undefined })}
                      className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                    <input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value || undefined })}
                      className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Search</label>
                  <Input
                    placeholder="Email or provider..."
                    value={filters.accountEmail?.[0] || ''}
                    onChange={(e) => onFilterChange({ ...filters, accountEmail: e.target.value ? [e.target.value] : undefined })}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      );
    }
  )
);

SearchFilterBar.displayName = 'SearchFilterBar';
