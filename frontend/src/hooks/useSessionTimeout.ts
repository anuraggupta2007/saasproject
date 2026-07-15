import { useEffect, useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

interface UseSessionTimeoutOptions {
  timeout?: number // in milliseconds, default 30 minutes
  warningBefore?: number // in milliseconds, default 5 minutes
  onWarning?: () => void
  onExpired?: () => void
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes
    warningBefore = 5 * 60 * 1000, // 5 minutes
    onWarning,
    onExpired,
  } = options

  const { isAuthenticated, logout, updateLastActivity, checkSessionTimeout } = useAuthStore()
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(timeout)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (expiredTimerRef.current) clearTimeout(expiredTimerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const handleExpired = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    logout()
    onExpired?.()
    window.location.href = '/login?reason=session_expired'
  }, [clearAllTimers, logout, onExpired])

  const startTimers = useCallback(() => {
    clearAllTimers()

    // Warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      onWarning?.()

      // Countdown
      let remaining = warningBefore
      intervalRef.current = setInterval(() => {
        remaining -= 1000
        setRemainingTime(remaining)
        if (remaining <= 0) {
          handleExpired()
        }
      }, 1000)
    }, timeout - warningBefore)

    // Expired timer (fallback)
    expiredTimerRef.current = setTimeout(() => {
      handleExpired()
    }, timeout)
  }, [timeout, warningBefore, onWarning, handleExpired, clearAllTimers])

  const handleRefresh = useCallback(() => {
    clearAllTimers()
    setShowWarning(false)
    updateLastActivity()
    startTimers()
  }, [clearAllTimers, updateLastActivity, startTimers])

  // Track activity
  useEffect(() => {
    if (!isAuthenticated) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handleActivity = () => {
      if (!showWarning) {
        updateLastActivity()
      }
    }

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, showWarning, updateLastActivity])

  // Start timers on mount
  useEffect(() => {
    if (isAuthenticated) {
      updateLastActivity()
      startTimers()
    }

    return clearAllTimers
  }, [isAuthenticated, startTimers, clearAllTimers, updateLastActivity])

  // Check session on focus
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated && checkSessionTimeout()) {
        handleExpired()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isAuthenticated, checkSessionTimeout, handleExpired])

  return {
    showWarning,
    remainingTime,
    handleRefresh,
    handleExpired,
  }
}
