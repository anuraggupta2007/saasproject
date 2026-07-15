import { cn } from '@/utils/cn'

export interface DividerProps {
  label?: string
  className?: string
  orientation?: 'left' | 'center' | 'right'
}

export function Divider({
  label,
  className,
  orientation = 'center',
}: DividerProps) {
  if (!label) {
    return (
      <div
        className={cn(
          'h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent dark:via-zinc-700',
          className,
        )}
        role="separator"
      />
    )
  }

  return (
    <div
      className={cn('flex items-center', className)}
      role="separator"
    >
      {(orientation === 'center' || orientation === 'left') && (
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-300 dark:to-zinc-700" />
      )}
      {orientation === 'right' && <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />}

      <span className="px-4 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </span>

      {(orientation === 'center' || orientation === 'right') && (
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-300 dark:to-zinc-700" />
      )}
      {orientation === 'left' && <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />}
    </div>
  )
}
