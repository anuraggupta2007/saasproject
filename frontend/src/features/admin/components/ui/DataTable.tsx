import { memo, useMemo, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/features/backup/components/ui/Button';
import type { SortDirection } from '../../types';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  total?: number;
  page?: number;
  totalPages?: number;
  sortField?: string;
  sortDirection?: SortDirection;
  onSort?: (field: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  getRowId?: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page = 1,
  totalPages = 1,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
  onRowClick,
  selectedIds = [],
  onSelect,
  onSelectAll,
  getRowId,
  emptyMessage = 'No data found',
  className,
}: DataTableProps<T>) {
  const allIds = useMemo(() => data.map((item) => getRowId?.(item) ?? ''), [data, getRowId]);
  const allSelected = data.length > 0 && allIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      onSelectAll?.([]);
    } else {
      onSelectAll?.(allIds.filter(Boolean));
    }
  }, [allSelected, allIds, onSelectAll]);

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            {onSelect && (
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="rounded border-white/20 bg-white/5 accent-brand-500"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider',
                  col.sortable && 'cursor-pointer hover:text-white select-none',
                  col.className
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onSelect ? 1 : 0)} className="px-4 py-12 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, i) => {
              const id = getRowId?.(item) ?? '';
              return (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-white/5 hover:bg-white/5 transition-colors',
                    onRowClick && 'cursor-pointer',
                    selectedIds.includes(id) && 'bg-brand-500/10'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {onSelect && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => onSelect(id)}
                        className="rounded border-white/20 bg-white/5 accent-brand-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-sm text-white', col.className)}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <span className="text-sm text-slate-400">
            {total !== undefined && `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1} leftIcon={<ChevronLeft className="w-4 h-4" />}>
              Prev
            </Button>
            <span className="px-3 text-sm text-slate-300">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages} leftIcon={<ChevronRight className="w-4 h-4" />}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
