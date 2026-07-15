import React from 'react'
import { cn } from '@/utils/cn'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  error?: Error | string
}

function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  error,
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

      {(description || errorMessage) && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {description ?? errorMessage}
        </p>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
            'bg-red-600 text-white shadow-sm transition-colors hover:bg-red-700',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'dark:focus:ring-offset-gray-900'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Try again
        </button>
      )}
    </div>
  )
}

ErrorState.displayName = 'ErrorState'

export { ErrorState }
export type { ErrorStateProps }
