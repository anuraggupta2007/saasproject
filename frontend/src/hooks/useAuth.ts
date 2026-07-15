import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const { user, isAuthenticated, logout, setUser, setTokens } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    logout()
    navigate('/login')
  }, [logout, navigate])

  return { user, isAuthenticated, logout: handleLogout, setUser, setTokens }
}
