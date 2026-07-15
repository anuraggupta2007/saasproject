import axios, { type AxiosError } from 'axios'

export function isAxiosError(error: unknown): error is AxiosError<{ detail?: string; message?: string }> {
  return axios.isAxiosError(error)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string; message?: string }
      | undefined
    return data?.detail || data?.message || error.message || 'Request failed'
  }
  return 'An unexpected error occurred'
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}
