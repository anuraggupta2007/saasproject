// ─── Logger Levels ───────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  source?: string
}

// ─── Logger Configuration ────────────────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL = import.meta.env.PROD ? LOG_LEVELS.info : LOG_LEVELS.debug

// ─── Logger Instance ─────────────────────────────────────────────────────────

class Logger {
  private buffer: LogEntry[] = []
  private flushInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (import.meta.env.PROD) {
      this.flushInterval = setInterval(() => this.flush(), 30_000)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= MIN_LEVEL
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source: 'frontend',
    }
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return

    const entry = this.formatMessage(level, message, data)

    // Console output
    const consoleFn = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[level]

    if (data) {
      consoleFn(`[${level.toUpperCase()}] ${message}`, data)
    } else {
      consoleFn(`[${level.toUpperCase()}] ${message}`)
    }

    // Buffer for production logging
    if (import.meta.env.PROD) {
      this.buffer.push(entry)
    }
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data)
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data)
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data)
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data)
  }

  // API request logging
  apiRequest(method: string, url: string, status?: number, duration?: number) {
    this.info(`API ${method} ${url}`, { status, duration })
  }

  // Performance logging
  performance(name: string, duration: number) {
    this.info(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` })
  }

  // User action logging
  action(action: string, data?: unknown) {
    this.info(`Action: ${action}`, data)
  }

  // Flush buffered logs (for production logging services)
  private flush() {
    if (this.buffer.length === 0) return

    const entries = [...this.buffer]
    this.buffer = []

    // Send to logging service (Sentry, LogRocket, etc.)
    if (import.meta.env.PROD && entries.length > 0) {
      // Placeholder for logging service integration
      // Example: loggingService.sendBatch(entries)
    }
  }

  destroy() {
    if (this.flushInterval) clearInterval(this.flushInterval)
    this.flush()
  }
}

export const logger = new Logger()

// ─── API Performance Monitor ─────────────────────────────────────────────────

export function logApiPerformance(method: string, url: string, start: number) {
  const duration = performance.now() - start
  logger.apiRequest(method, url, undefined, duration)

  // Warn on slow requests
  if (duration > 5000) {
    logger.warn(`Slow API request: ${method} ${url}`, { duration })
  }
}

// ─── Error Reporting Hook ────────────────────────────────────────────────────

export function reportError(error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    ...context,
  })

  // Send to Sentry if enabled
  if (import.meta.env.VITE_ENABLE_SENTRY === 'true' && import.meta.env.VITE_SENTRY_DSN) {
    // Dynamic import to avoid loading Sentry in development
    import('@sentry/react').then(({ captureException }) => {
      captureException(error, { extra: context })
    }).catch(() => {
      // Sentry not available
    })
  }
}
