import { isApiError, ApiError } from '@/lib/apiClient'
import toast from 'react-hot-toast'

// ─── Error Classification ────────────────────────────────────────────────────

export type ErrorCategory = 'auth' | 'network' | 'validation' | 'permission' | 'not_found' | 'rate_limit' | 'server' | 'unknown'

export interface ClassifiedError {
  category: ErrorCategory
  message: string
  status: number | null
  retryable: boolean
  original: unknown
}

export function classifyError(error: unknown): ClassifiedError {
  if (isApiError(error)) {
    const status = error.status
    if (status === 401) return { category: 'auth', message: 'Session expired. Please log in again.', status, retryable: false, original: error }
    if (status === 403) return { category: 'permission', message: 'You do not have permission to perform this action.', status, retryable: false, original: error }
    if (status === 404) return { category: 'not_found', message: 'The requested resource was not found.', status, retryable: false, original: error }
    if (status === 422) return { category: 'validation', message: error.message || 'Invalid input. Please check your data.', status, retryable: false, original: error }
    if (status === 429) return { category: 'rate_limit', message: 'Too many requests. Please wait and try again.', status, retryable: true, original: error }
    if (status && status >= 500) return { category: 'server', message: 'Server error. Please try again later.', status, retryable: true, original: error }
    return { category: 'unknown', message: error.message, status, retryable: false, original: error }
  }

  if (error instanceof Error) {
    if (error.message.includes('Network') || error.message.includes('network')) {
      return { category: 'network', message: 'Network error. Please check your connection.', status: null, retryable: true, original: error }
    }
    return { category: 'unknown', message: error.message, status: null, retryable: false, original: error }
  }

  return { category: 'unknown', message: 'An unexpected error occurred.', status: null, retryable: false, original: error }
}

// ─── Toast Notifications ─────────────────────────────────────────────────────

export function showErrorToast(error: unknown) {
  const classified = classifyError(error)
  toast.error(classified.message)
  return classified
}

export function showSuccessToast(message: string) {
  toast.success(message)
}

export function showWarningToast(message: string) {
  toast(message, { icon: '⚠️' })
}

// ─── Error Boundary Helpers ──────────────────────────────────────────────────

export function getErrorFallbackProps(error: unknown): { title: string; message: string } {
  const classified = classifyError(error)
  return {
    title: classified.category === 'auth' ? 'Session Expired' : 'Something went wrong',
    message: classified.message,
  }
}
