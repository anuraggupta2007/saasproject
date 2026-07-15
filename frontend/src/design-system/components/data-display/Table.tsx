import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string) => void
  emptyMessage?: string
  loading?: boolean
  striped?: boolean
}

function SortIcon({ direction }: { direction?: 'asc' | 'desc' }) {
  return (
    <svg
      className={cn(
        'ml-1 inline h-4 w-4',
        direction ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400',
      )}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
      />
    </svg>
  )
}

function SkeletonRow<T extends Record<string, unknown>>({ columns }: { columns: Column<T>[] }) {
  return (
    <tr className="animate-pulse">
      {columns.map((col) => (
        <td key={col.key} className="px-6 py-4">
          <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
      ))}
    </tr>
  )
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
  striped = false,
}: TableProps<T>) {
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400',
                    alignClass(col.align),
                    col.sortable &&
                      'cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300',
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        direction={
                          sortColumn === col.key ? sortDirection : undefined
                        }
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} columns={columns} />
                ))
              : data.length === 0
                ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        {emptyMessage}
                      </td>
                    </tr>
                  )
                : data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={cn(
                        'transition-colors',
                        onRowClick &&
                          'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
                        striped && rowIndex % 2 === 1 && 'bg-zinc-50/50 dark:bg-zinc-900/30',
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            'px-6 py-4 text-zinc-900 dark:text-zinc-100',
                            alignClass(col.align),
                          )}
                        >
                          {col.render
                            ? col.render(row)
                            : (row[col.key] as ReactNode)}
                        </td>
                      ))}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
