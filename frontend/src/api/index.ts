import apiClient from '@/lib/apiClient'

export const userApi = {
  getProfile: () =>
    apiClient.get('/api/v1/auth/me'),

  updateProfile: (data: {
    full_name?: string
    avatar_url?: string
  }) => apiClient.patch('/api/v1/users/me', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post('/api/v1/users/me/change-password', data),

  deleteAccount: (password: string) =>
    apiClient.delete('/api/v1/users/me', { data: { password } }),
}

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; unread?: boolean }) =>
    apiClient.get('/api/v1/notifications/', { params }),

  markRead: (id: string) =>
    apiClient.patch(`/api/v1/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post('/api/v1/notifications/read-all'),

  getCount: () =>
    apiClient.get('/api/v1/notifications/unread-count'),
}

export const analyticsApi = {
  getDashboard: () =>
    apiClient.get('/api/v1/analytics/dashboard'),

  getUsage: (period?: string) =>
    apiClient.get('/api/v1/analytics/usage', { params: { period } }),

  getActivity: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/api/v1/analytics/activity', { params }),
}

export const licenseApi = {
  getCurrent: () =>
    apiClient.get('/api/v1/license/current'),

  activate: (key: string) =>
    apiClient.post('/api/v1/license/activate', { license_key: key }),

  deactivate: () =>
    apiClient.post('/api/v1/license/deactivate'),
}

export const paymentApi = {
  getPlans: () =>
    apiClient.get('/api/v1/payments/plans'),

  createCheckout: (planId: string, provider: 'stripe' | 'razorpay') =>
    apiClient.post('/api/v1/payments/checkout', { plan_id: planId, provider }),

  getBillingPortal: () =>
    apiClient.get('/api/v1/payments/billing-portal'),

  getInvoices: () =>
    apiClient.get('/api/v1/payments/invoices'),
}

export const apiKeyApi = {
  list: () =>
    apiClient.get('/api/v1/gateway/keys'),

  create: (data: { name: string; scopes?: string[] }) =>
    apiClient.post('/api/v1/gateway/keys', data),

  revoke: (id: string) =>
    apiClient.delete(`/api/v1/gateway/keys/${id}`),
}

export const supportApi = {
  listTickets: (params?: { page?: number; status?: string }) =>
    apiClient.get('/api/v1/support/tickets', { params }),

  createTicket: (data: { subject: string; description: string; priority?: string }) =>
    apiClient.post('/api/v1/support/tickets', data),

  getTicket: (id: string) =>
    apiClient.get(`/api/v1/support/tickets/${id}`),

  replyTicket: (id: string, message: string) =>
    apiClient.post(`/api/v1/support/tickets/${id}/reply`, { message }),
}

export const adminApi = {
  getUsers: (params?: { page?: number; search?: string; role?: string }) =>
    apiClient.get('/api/v1/admin/users', { params }),

  getUser: (id: string) =>
    apiClient.get(`/api/v1/admin/users/${id}`),

  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/api/v1/admin/users/${id}`, data),

  deleteUser: (id: string) =>
    apiClient.delete(`/api/v1/admin/users/${id}`),

  getStats: () =>
    apiClient.get('/api/v1/admin/stats'),

  getLogs: (params?: { page?: number; level?: string }) =>
    apiClient.get('/api/v1/admin/logs', { params }),
}
