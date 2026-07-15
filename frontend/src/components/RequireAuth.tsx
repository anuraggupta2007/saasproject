import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { canAccessRoute } from '@/lib/guards'
import type { UserRole } from '@/types'

interface RequireAuthProps {
  children: ReactNode
  requiredRole?: UserRole
  fallback?: ReactNode
}

export function RequireAuth({ children, requiredRole, fallback }: RequireAuthProps) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !canAccessRoute(user, requiredRole)) {
    return fallback ? <>{fallback}</> : <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
