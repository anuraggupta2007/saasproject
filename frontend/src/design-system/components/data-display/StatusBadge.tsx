import { Badge, type BadgeProps } from '../feedback/Badge'

const statusColorMap: Record<string, BadgeProps['variant']> = {
  completed: 'success',
  success: 'success',
  active: 'success',
  approved: 'success',
  verified: 'success',
  pending: 'warning',
  processing: 'warning',
  in_progress: 'warning',
  waiting: 'warning',
  review: 'warning',
  failed: 'danger',
  error: 'danger',
  rejected: 'danger',
  expired: 'danger',
  cancelled: 'danger',
  inactive: 'neutral',
  draft: 'neutral',
  unknown: 'neutral',
}

export interface StatusBadgeProps {
  status: string
  dot?: boolean
  className?: string
}

export function StatusBadge({ status, dot = true, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/[\s-]/g, '_')
  const variant = statusColorMap[key] || 'neutral'
  return (
    <Badge variant={variant} dot={dot} className={className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
