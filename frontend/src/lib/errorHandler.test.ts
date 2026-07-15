import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyError, getErrorFallbackProps } from '@/lib/errorHandler'
import { ApiError } from '@/lib/apiClient'

describe('classifyError', () => {
  it('classifies auth errors', () => {
    const error = new ApiError({ message: 'Unauthorized', status: 401, code: null, raw: null })
    const result = classifyError(error)
    expect(result.category).toBe('auth')
    expect(result.retryable).toBe(false)
  })

  it('classifies permission errors', () => {
    const error = new ApiError({ message: 'Forbidden', status: 403, code: null, raw: null })
    const result = classifyError(error)
    expect(result.category).toBe('permission')
  })

  it('classifies not found errors', () => {
    const error = new ApiError({ message: 'Not found', status: 404, code: null, raw: null })
    const result = classifyError(error)
    expect(result.category).toBe('not_found')
  })

  it('classifies rate limit errors', () => {
    const error = new ApiError({ message: 'Rate limited', status: 429, code: null, raw: null })
    const result = classifyError(error)
    expect(result.category).toBe('rate_limit')
    expect(result.retryable).toBe(true)
  })

  it('classifies server errors', () => {
    const error = new ApiError({ message: 'Server error', status: 500, code: null, raw: null })
    const result = classifyError(error)
    expect(result.category).toBe('server')
    expect(result.retryable).toBe(true)
  })

  it('classifies network errors', () => {
    const error = new Error('Network error occurred')
    const result = classifyError(error)
    expect(result.category).toBe('network')
    expect(result.retryable).toBe(true)
  })

  it('classifies unknown errors', () => {
    const result = classifyError('some string error')
    expect(result.category).toBe('unknown')
  })
})

describe('getErrorFallbackProps', () => {
  it('returns session expired for auth errors', () => {
    const error = new ApiError({ message: 'Unauthorized', status: 401, code: null, raw: null })
    const props = getErrorFallbackProps(error)
    expect(props.title).toBe('Session Expired')
  })

  it('returns something went wrong for other errors', () => {
    const error = new Error('Generic error')
    const props = getErrorFallbackProps(error)
    expect(props.title).toBe('Something went wrong')
  })
})
