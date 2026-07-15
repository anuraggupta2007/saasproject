import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../api';
import type {
  Plan,
  Subscription,
  License,
  PaymentMethod,
  Invoice,
  BillingHistoryEntry,
  CouponValidation,
  UsageStats,
  UsageHistoryPoint,
  BillingDashboardData,
  CheckoutFormData,
  BillingAddress,
  Currency,
  PlanInterval,
} from '../types';

const KEYS = {
  plans: ['billing', 'plans'] as const,
  plan: (id: string) => ['billing', 'plans', id] as const,
  subscription: ['billing', 'subscription'] as const,
  license: ['billing', 'license'] as const,
  licenseDetails: ['billing', 'license', 'details'] as const,
  paymentMethods: ['billing', 'payment-methods'] as const,
  checkout: (id: string) => ['billing', 'checkout', id] as const,
  invoices: ['billing', 'invoices'] as const,
  invoice: (id: string) => ['billing', 'invoices', id] as const,
  history: ['billing', 'history'] as const,
  usage: ['billing', 'usage'] as const,
  usageHistory: ['billing', 'usage', 'history'] as const,
  dashboard: ['billing', 'dashboard'] as const,
  coupon: (code: string, planId: string, interval: string) =>
    ['billing', 'coupon', code, planId, interval] as const,
};

export function usePlans() {
  return useQuery({
    queryKey: KEYS.plans,
    queryFn: () => billingApi.plans.list(),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: KEYS.plan(id),
    queryFn: () => billingApi.plans.get(id),
    enabled: !!id,
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: KEYS.subscription,
    queryFn: () => billingApi.subscription.current(),
    staleTime: 60 * 1000,
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: PlanInterval }) =>
      billingApi.subscription.upgrade(planId, interval),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: KEYS.usage });
    },
  });
}

export function useDowngradeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => billingApi.subscription.downgrade(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (atPeriodEnd?: boolean) => billingApi.subscription.cancel(atPeriodEnd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.subscription.resume(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useRenewSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.subscription.renew(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useCurrentLicense() {
  return useQuery({
    queryKey: KEYS.license,
    queryFn: () => billingApi.license.current(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLicenseDetails() {
  return useQuery({
    queryKey: KEYS.licenseDetails,
    queryFn: () => billingApi.license.details(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => billingApi.license.activate(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.license });
      queryClient.invalidateQueries({ queryKey: KEYS.licenseDetails });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useDeactivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activationId: string) => billingApi.license.deactivate(activationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.license });
      queryClient.invalidateQueries({ queryKey: KEYS.licenseDetails });
    },
  });
}

export function useRegenerateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.license.regenerate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.license });
      queryClient.invalidateQueries({ queryKey: KEYS.licenseDetails });
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: KEYS.paymentMethods,
    queryFn: () => billingApi.paymentMethods.list(),
    staleTime: 60 * 1000,
  });
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; token?: string; billingAddress?: BillingAddress }) =>
      billingApi.paymentMethods.add(data as { type: any; token?: string; billingAddress?: BillingAddress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.paymentMethods });
    },
  });
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.paymentMethods.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.paymentMethods });
    },
  });
}

export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billingApi.paymentMethods.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.paymentMethods });
    },
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckoutFormData) => billingApi.checkout.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
    },
  });
}

export function useConfirmCheckout(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.checkout.confirm(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.subscription });
      queryClient.invalidateQueries({ queryKey: KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: KEYS.license });
      queryClient.invalidateQueries({ queryKey: KEYS.usage });
    },
  });
}

export function useInvoiceList(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: [...KEYS.invoices, params],
    queryFn: () => billingApi.invoices.list(params),
    staleTime: 30 * 1000,
  });
}

export function useDownloadInvoice() {
  return useMutation({
    mutationFn: (id: string) => billingApi.invoices.download(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useBillingHistory(params?: { page?: number; limit?: number; type?: string; search?: string }) {
  return useQuery({
    queryKey: [...KEYS.history, params],
    queryFn: () => billingApi.history.list(params),
    staleTime: 30 * 1000,
  });
}

export function useExportBillingHistory() {
  return useMutation({
    mutationFn: (params?: { dateFrom?: string; dateTo?: string }) =>
      billingApi.history.export(params),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useValidateCoupon(code: string, planId: string, interval: PlanInterval) {
  return useQuery({
    queryKey: KEYS.coupon(code, planId, interval),
    queryFn: () => billingApi.coupons.validate(code, planId, interval),
    enabled: !!code && !!planId && !!interval,
    staleTime: 0,
    retry: false,
  });
}

export function useUsageStats() {
  return useQuery({
    queryKey: KEYS.usage,
    queryFn: () => billingApi.usage.current(),
    staleTime: 60 * 1000,
  });
}

export function useUsageHistory(days?: number) {
  return useQuery({
    queryKey: [...KEYS.usageHistory, days],
    queryFn: () => billingApi.usage.history(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBillingDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn: () => billingApi.dashboard.data(),
    staleTime: 60 * 1000,
  });
}
