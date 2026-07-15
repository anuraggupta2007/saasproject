import React from 'react'
import { cn } from '@/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  icon?: React.ReactNode
  closable?: boolean
  onClose?: () => void
  className?: string
}

const variantStyles: Record<
  NonNullable<AlertProps['variant']>,
  {
    border: string
    bg: string
    text: string
    icon: string
  }
> = {
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500',
  },
  success: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-500',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-800 dark:text-amber-200',
    icon: 'text-amber-500',
  },
  error: {
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500',
  },
}

const DefaultIcon: Record<NonNullable<AlertProps['variant']>, React.ReactNode> = {
  info: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', title, children, icon, closable = false, onClose, className }, ref) => {
    const styles = variantStyles[variant]

    return (
      <AnimatePresence>
        <motion.div
          ref={ref}
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'relative rounded-r-md border-l-4 p-4',
            styles.border,
            styles.bg,
            className
          )}
        >
          <div className="flex items-start gap-3">
            {(icon ?? DefaultIcon[variant]) && (
              <div className={cn('mt-0.5 shrink-0', styles.icon)}>
                {icon ?? DefaultIcon[variant]}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={cn('text-sm font-semibold', styles.text)}>{title}</h3>
              )}
              <div className={cn('text-sm', title && 'mt-1', styles.text)}>{children}</div>
            </div>

            {closable && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'shrink-0 rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10',
                  styles.text
                )}
                aria-label="Close alert"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }
)

Alert.displayName = 'Alert'

export { Alert }
export type { AlertProps }
