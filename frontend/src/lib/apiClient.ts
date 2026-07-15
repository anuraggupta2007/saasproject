import axios, { AxiosError } from 'axios'
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NormalizedError {
  message: string
  status: number | null
  code: string | null
  raw: unknown
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryOn: number[]
}

interface ApiClientOptions {
  baseURL?: string
  timeout?: number
  retry?: Partial<RetryConfig>
}

// ---------------------------------------------------------------------------
// ApiError – typed error class returned by the client
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number | null
  code: string | null
  raw: unknown

  constructor(normalized: NormalizedError) {
    super(normalized.message)
    this.name = 'ApiError'
    this.status = normalized.status
    this.code = normalized.code
    this.raw = normalized.raw
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

// ---------------------------------------------------------------------------
// Secure in-memory token store (never touches localStorage)
// ---------------------------------------------------------------------------

const tokenStore = {
  accessToken: null as string | null,
  setAccessToken(token: string | null) {
    this.accessToken = token
  },
  getAccessToken() {
    return this.accessToken
  },
  clear() {
    this.accessToken = null
  },
}

// ---------------------------------------------------------------------------
// CSRF helper – reads a token from a <meta> tag if it exists
// ---------------------------------------------------------------------------

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') ?? null
}

// ---------------------------------------------------------------------------
// Exponential back-off delay (with jitter)
// ---------------------------------------------------------------------------

function backoffDelay(attempt: number, base: number, max: number): number {
  const exponential = Math.min(base * 2 ** attempt, max)
  const jitter = exponential * (0.5 + Math.random() * 0.5) // 50-100% of exponential
  return Math.floor(jitter)
}

// ---------------------------------------------------------------------------
// Normalize any error into a consistent shape
// ---------------------------------------------------------------------------

function normalizeError(error: unknown): NormalizedError {
  if (axios.isCancel(error)) {
    return {
      message: 'Request cancelled',
      status: null,
      code: 'ERR_CANCELED',
      raw: error,
    }
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null
    const data = error.response?.data as Record<string, unknown> | undefined
    const message =
      (data?.message as string) ??
      error.message ??
      'An unexpected error occurred'
    const code = (data?.code as string) ?? error.code ?? null

    return { message, status, code, raw: error }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: null,
      code: null,
      raw: error,
    }
  }

  return {
    message: String(error),
    status: null,
    code: null,
    raw: error,
  }
}

// ---------------------------------------------------------------------------
// Default retry configuration
// ---------------------------------------------------------------------------

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
  retryOn: [408, 429, 500, 502, 503, 504],
}

// ---------------------------------------------------------------------------
// Factory – builds a fully-configured Axios instance
// ---------------------------------------------------------------------------

export function createApiClient(options: ApiClientOptions = {}): AxiosInstance {
  const {
    baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
    timeout = 30_000,
    retry: retryOverrides,
  } = options

  const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retryOverrides }

  const client = axios.create({
    baseURL,
    timeout,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // -----------------------------------------------------------------------
  // Request interceptor – attach access token, CSRF header, idempotency key
  // -----------------------------------------------------------------------

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Access token
      const token = tokenStore.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // CSRF token (for non-GET/HEAD requests)
      const method = (config.method ?? 'get').toLowerCase()
      if (!['get', 'head', 'options'].includes(method)) {
        const csrf = getCsrfToken()
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf
        }
      }

      return config
    },
    (error: unknown) => Promise.reject(error),
  )

  // -----------------------------------------------------------------------
  // Response interceptor – retry, token refresh, error normalization
  // -----------------------------------------------------------------------

  let isRefreshing = false
  let refreshPromise: Promise<string> | null = null
  const failedQueue: Array<{
    resolve: (token: string) => void
    reject: (err: unknown) => void
  }> = []

  function processQueue(error: unknown, token: string | null = null) {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) reject(error)
      else resolve(token as string)
    })
    failedQueue.length = 0
  }

  async function handleRefresh(_originalRequest: InternalAxiosRequestConfig): Promise<string> {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = (async () => {
        try {
          const response = await client.post('/api/v1/auth/refresh')
          const { access_token } = response.data as { access_token: string }
          tokenStore.setAccessToken(access_token)
          processQueue(null, access_token)
          return access_token
        } catch (err) {
          processQueue(err, null)
          tokenStore.clear()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          throw err
        } finally {
          isRefreshing = false
          refreshPromise = null
        }
      })()
    }

    return refreshPromise!
  }

  function shouldRetry(
    error: AxiosError,
    attempt: number,
  ): boolean {
    if (attempt >= retryConfig.maxRetries) return false

    const status = error.response?.status
    if (status && retryConfig.retryOn.includes(status)) return true

    // Retry on network errors (no response)
    if (!error.response && error.code !== 'ERR_CANCELED') return true

    return false
  }

  async function retryRequest(
    config: InternalAxiosRequestConfig,
    attempt: number,
    _error: AxiosError,
  ): Promise<AxiosResponse> {
    const delay = backoffDelay(
      attempt,
      retryConfig.baseDelayMs,
      retryConfig.maxDelayMs,
    )
    await new Promise((r) => setTimeout(r, delay))

    // Re-attach the access token in case it was refreshed during the delay
    const token = tokenStore.getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return client.request(config)
  }

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean
        _attempt?: number
      }

      if (!config) {
        return Promise.reject(new ApiError(normalizeError(error)))
      }

      // --- 1. Retry strategy ------------------------------------------------
      const attempt = (config._attempt ?? 0) + 1
      config._attempt = attempt

      if (!config._retry && shouldRetry(error, attempt)) {
        try {
          return await retryRequest(config, attempt, error)
        } catch (retryErr) {
          // Fall through to normal error handling below
          return Promise.reject(
            new ApiError(normalizeError(retryErr instanceof AxiosError ? retryErr : error)),
          )
        }
      }

      // --- 2. Token refresh on 401 -----------------------------------------
      if (error.response?.status === 401 && !config._retry) {
        config._retry = true

        try {
          await handleRefresh(config)
          const newToken = tokenStore.getAccessToken()
          if (newToken && config.headers) {
            config.headers.Authorization = `Bearer ${newToken}`
          }
          return client.request(config)
        } catch {
          return Promise.reject(new ApiError(normalizeError(error)))
        }
      }

      // --- 3. Global error handling for common status codes -----------------
      const status = error.response?.status
      const normalized = normalizeError(error)

      switch (status) {
        case 403:
          normalized.message =
            (error.response?.data as Record<string, unknown>)?.message as string ??
            'Access denied – you do not have permission to perform this action'
          break
        case 404:
          normalized.message =
            (error.response?.data as Record<string, unknown>)?.message as string ??
            'Resource not found'
          break
        case 429:
          normalized.message =
            (error.response?.data as Record<string, unknown>)?.message as string ??
            'Too many requests – please try again later'
          break
        case 500:
        case 502:
        case 503:
        case 504:
          normalized.message =
            (error.response?.data as Record<string, unknown>)?.message as string ??
            'Server error – please try again later'
          break
      }

      if (!error.response && error.code !== 'ERR_CANCELED') {
        normalized.message =
          'Network error – please check your connection and try again'
      }

      return Promise.reject(new ApiError(normalized))
    },
  )

  // Expose the token store so consumers can manage auth state without importing
  // a separate store – keeps things decoupled from any particular state library.
  ;(client as unknown as Record<string, unknown>).__tokenStore = tokenStore

  return client
}

// ---------------------------------------------------------------------------
// Default singleton instance
// ---------------------------------------------------------------------------

const apiClient = createApiClient()

// Re-export the token store helpers bound to the default client so existing
// imports like `useAuthStore.getState().setAccessToken(...)` can be replaced.
export const setAccessToken = (token: string | null) =>
  tokenStore.setAccessToken(token)
export const getAccessToken = () => tokenStore.getAccessToken()
export const clearTokens = () => tokenStore.clear()

export { tokenStore }

export default apiClient
