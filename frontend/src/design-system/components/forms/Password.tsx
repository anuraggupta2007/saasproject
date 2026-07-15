import { forwardRef, useState } from 'react'
import { cn } from '@/utils/cn'
import Input from './Input'
import type { InputProps } from './Input'

export interface PasswordProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean
}

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ showToggle = true, className, rightIcon, ...props }, ref) => {
    const [visible, setVisible] = useState(false)

    const toggleButton = showToggle ? (
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={cn(
          'pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 p-0.5',
          'text-[var(--ds-text-tertiary,#9ca3af)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary,#6366f1)] rounded'
        )}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    ) : undefined

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        rightIcon={rightIcon ?? toggleButton}
        className={className}
        {...props}
      />
    )
  }
)

Password.displayName = 'Password'

export default Password
