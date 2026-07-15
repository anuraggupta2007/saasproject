import { forwardRef } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const statusConfig = {
  success: {
    icon: CheckCircle,
    className: 'text-emerald-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-400',
  },
  error: {
    icon: XCircle,
    className: 'text-red-400',
  },
  info: {
    icon: Info,
    className: 'text-blue-400',
  },
  loading: {
    icon: Loader2,
    className: 'text-brand-400 animate-spin',
  },
} as const

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
} as const

interface StatusIconProps {
  status: keyof typeof statusConfig
  size?: keyof typeof sizeMap
  className?: string
  'aria-label'?: string
}

const StatusIcon = forwardRef<HTMLSpanElement, StatusIconProps>(
  ({ status, size = 'md', className, 'aria-label': ariaLabel, ...props }, ref) => {
    const { icon: IconComponent, className: statusClassName } = statusConfig[status]
    const px = sizeMap[size]

    return (
      <span
        ref={ref}
        className={cn('inline-flex shrink-0 items-center justify-center', className)}
        role="img"
        aria-label={ariaLabel ?? status}
        {...props}
      >
        <IconComponent size={px} className={statusClassName} />
      </span>
    )
  },
)

StatusIcon.displayName = 'StatusIcon'

export { StatusIcon, type StatusIconProps }
