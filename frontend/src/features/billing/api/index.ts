import apiClient from '@/lib/apiClient';
import type {
  Plan,
  Subscription,
  License,
  PaymentMethod,
  PaymentMethodType,
  Invoice,
  BillingHistoryEntry,
  CouponValidation,
  UsageStats,
  UsageHistoryPoint,
  BillingDashboardData,
  CheckoutSession,
  CheckoutFormData,
  BillingAddress,
  PaginatedResponse,
  Currency,
  PlanInterval,
} from '../types';

const BASE = '/api/v1/billing';

export const billingApi = {
  plans: {
    list: () =>
      apiClient.get<Plan[]>(`${BASE}/plans`).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<Plan>(`${BASE}/plans/${id}`).then((res) => res.data),
  },

  subscription: {
    current: () =>
      apiClient.get<Subscription | null>(`${BASE}/subscription`).then((res) => res.data),
    upgrade: (planId: string, interval: PlanInterval) =>
      apiClient.post<Subscription>(`${BASE}/subscription/upgrade`, { planId, interval }).then((res) => res.data),
    downgrade: (planId: string) =>
      apiClient.post<Subscription>(`${BASE}/subscription/downgrade`, { planId }).then((res) => res.data),
    cancel: (atPeriodEnd = true) =>
      apiClient.post<Subscription>(`${BASE}/subscription/cancel`, { atPeriodEnd }).then((res) => res.data),
    resume: () =>
      apiClient.post<Subscription>(`${BASE}/subscription/resume`).then((res) => res.data),
    renew: () =>
      apiClient.post<Subscription>(`${BASE}/subscription/renew`).then((res) => res.data),
  },

  license: {
    current: () =>
      apiClient.get<License | null>(`${BASE}/license`).then((res) => res.data),
    activate: (key: string) =>
      apiClient.post<License>(`${BASE}/license/activate`, { key }).then((res) => res.data),
    deactivate: (activationId: string) =>
      apiClient.post<License>(`${BASE}/license/deactivate`, { activationId }).then((res) => res.data),
    details: () =>
      apiClient.get<License>(`${BASE}/license/details`).then((res) => res.data),
    regenerate: () =>
      apiClient.post<License>(`${BASE}/license/regenerate`).then((res) => res.data),
  },

  paymentMethods: {
    list: () =>
      apiClient.get<PaymentMethod[]>(`${BASE}/payment-methods`).then((res) => res.data),
    add: (data: { type: PaymentMethodType; token?: string; billingAddress?: BillingAddress }) =>
      apiClient.post<PaymentMethod>(`${BASE}/payment-methods`, data).then((res) => res.data),
    remove: (id: string) =>
      apiClient.delete(`${BASE}/payment-methods/${id}`).then((res) => res.data),
    setDefault: (id: string) =>
      apiClient.put<PaymentMethod>(`${BASE}/payment-methods/${id}/default`).then((res) => res.data),
    updateBillingAddress: (id: string, address: BillingAddress) =>
      apiClient.put<PaymentMethod>(`${BASE}/payment-methods/${id}/address`, address).then((res) => res.data),
  },

  checkout: {
    create: (data: CheckoutFormData) =>
      apiClient.post<CheckoutSession>(`${BASE}/checkout`, data).then((res) => res.data),
    confirm: (sessionId: string) =>
      apiClient.post<CheckoutSession>(`${BASE}/checkout/${sessionId}/confirm`).then((res) => res.data),
    status: (sessionId: string) =>
      apiClient.get<CheckoutSession>(`${BASE}/checkout/${sessionId}`).then((res) => res.data),
  },

  invoices: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get<PaginatedResponse<Invoice>>(`${BASE}/invoices`, { params }).then((res) => res.data),
    get: (id: string) =>
      apiClient.get<Invoice>(`${BASE}/invoices/${id}`).then((res) => res.data),
    download: (id: string) =>
      apiClient.get(`${BASE}/invoices/${id}/download`, { responseType: 'blob' }).then((res) => res.data),
  },

  history: {
    list: (params?: { page?: number; limit?: number; type?: string; search?: string }) =>
      apiClient.get<PaginatedResponse<BillingHistoryEntry>>(`${BASE}/history`, { params }).then((res) => res.data),
    export: (params?: { dateFrom?: string; dateTo?: string }) =>
      apiClient.get(`${BASE}/history/export`, { params, responseType: 'blob' }).then((res) => res.data),
  },

  coupons: {
    validate: (code: string, planId: string, interval: PlanInterval) =>
      apiClient.post<CouponValidation>(`${BASE}/coupons/validate`, { code, planId, interval }).then((res) => res.data),
  },

  usage: {
    current: () =>
      apiClient.get<UsageStats>(`${BASE}/usage`).then((res) => res.data),
    history: (days?: number) =>
      apiClient.get<UsageHistoryPoint[]>(`${BASE}/usage/history`, { params: { days } }).then((res) => res.data),
  },

  dashboard: {
    data: () =>
      apiClient.get<BillingDashboardData>(`${BASE}/dashboard`).then((res) => res.data),
  },
};
