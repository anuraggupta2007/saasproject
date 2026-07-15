import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type Permission } from '@/store/authStore'
import { AuthLoadingScreen } from './AuthLoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
  permissions?: Permission[]
  fallback?: string
}

export function ProtectedRoute({
  children,
  adminOnly = false,
  permissions = [],
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, reason: 'unauthenticated' }}
        replace
      />
    )
  }

  if (adminOnly && user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to={fallback || '/dashboard'} replace />
  }

  if (permissions.length > 0) {
    const hasPermission = useAuthStore.getState().hasPermission
    const hasAll = permissions.every((p) => hasPermission(p))
    if (!hasAll) {
      return <Navigate to={fallback || '/dashboard'} replace />
    }
  }

  return <>{children}</>
}

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

interface AdminRouteProps {
  children: React.ReactNode
  fallback?: string
}

export function AdminRoute({ children, fallback = '/dashboard' }: AdminRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isLoading } = useAuthStore()

  if (isLoading) {
    return <AuthLoadingScreen />
  }

  // Authenticated users go to dashboard, others see public content
  return <>{children}</>
}
