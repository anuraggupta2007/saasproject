import apiClient from '@/lib/apiClient'

export interface LoginPayload {
  email: string
  password: string
  remember_me?: boolean
}

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post('/api/v1/auth/login', data),

  register: (data: RegisterPayload) =>
    apiClient.post('/api/v1/auth/register', data),

  logout: () =>
    apiClient.post('/api/v1/auth/logout'),

  refresh: () =>
    apiClient.post('/api/v1/auth/refresh'),

  me: () =>
    apiClient.get('/api/v1/auth/me'),

  forgotPassword: (email: string) =>
    apiClient.post('/api/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/api/v1/auth/reset-password', { token, new_password: password }),

  verifyEmail: (token: string) =>
    apiClient.post('/api/v1/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post('/api/v1/auth/resend-verification', { email }),

  oauthGoogleUrl: () =>
    apiClient.get('/api/v1/auth/oauth/google'),

  oauthMicrosoftUrl: () =>
    apiClient.get('/api/v1/auth/oauth/microsoft'),
}
