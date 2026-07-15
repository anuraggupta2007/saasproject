// ─── Environment Validation ──────────────────────────────────────────────────

interface EnvConfig {
  VITE_API_URL: string
  VITE_WS_URL: string
  VITE_APP_NAME: string
  VITE_APP_VERSION: string
  VITE_ENABLE_OAUTH: boolean
  VITE_ENABLE_ANALYTICS: boolean
  VITE_ENABLE_SENTRY: boolean
  VITE_SENTRY_DSN: string
  VITE_SENTRY_TRACES_SAMPLE_RATE: number
}

function getEnvVar(key: string, fallback?: string): string {
  const value = import.meta.env[key] as string | undefined
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback
    if (import.meta.env.PROD) {
      console.warn(`[env] Missing required environment variable: ${key}`)
    }
    return ''
  }
  return value
}

function getEnvBoolean(key: string, fallback = false): boolean {
  const value = getEnvVar(key, String(fallback))
  return value === 'true' || value === '1'
}

function getEnvNumber(key: string, fallback = 0): number {
  const value = getEnvVar(key, String(fallback))
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}

export const env: EnvConfig = {
  VITE_API_URL: getEnvVar('VITE_API_URL', 'http://localhost:8000'),
  VITE_WS_URL: getEnvVar('VITE_WS_URL', 'ws://localhost:8000/ws'),
  VITE_APP_NAME: getEnvVar('VITE_APP_NAME', 'MailSavior'),
  VITE_APP_VERSION: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  VITE_ENABLE_OAUTH: getEnvBoolean('VITE_ENABLE_OAUTH', true),
  VITE_ENABLE_ANALYTICS: getEnvBoolean('VITE_ENABLE_ANALYTICS', false),
  VITE_ENABLE_SENTRY: getEnvBoolean('VITE_ENABLE_SENTRY', false),
  VITE_SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN'),
  VITE_SENTRY_TRACES_SAMPLE_RATE: getEnvNumber('VITE_SENTRY_TRACES_SAMPLE_RATE', 0.2),
}

// Validate critical env vars in production
if (import.meta.env.PROD) {
  const required = ['VITE_API_URL']
  for (const key of required) {
    if (!import.meta.env[key]) {
      console.error(`[env] Critical environment variable missing: ${key}`)
    }
  }
}
