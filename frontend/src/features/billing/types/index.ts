export type PlanInterval = 'monthly' | 'yearly' | 'lifetime';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'paused';
export type LicenseStatus = 'active' | 'inactive' | 'expired' | 'revoked' | 'pending';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'canceled';
export type PaymentMethodType = 'card' | 'paypal' | 'razorpay' | 'bank_transfer';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
  unit?: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  tier: 'free' | 'personal' | 'professional' | 'business' | 'enterprise';
  prices: Record<PlanInterval, PlanPrice | null>;
  features: PlanFeature[];
  limits: PlanLimits;
  isPopular?: boolean;
  cta?: string;
}

export interface PlanPrice {
  amount: number;
  currency: Currency;
  monthlyEquivalent?: number;
  savings?: number;
  savingsPercentage?: number;
}

export interface PlanLimits {
  backupJobs: number;
  conversionJobs: number;
  storageBytes: number;
  apiRequests: number;
  accounts: number;
  maxFileSize: number;
  retentionDays: number;
  concurrentJobs: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  interval: PlanInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  price: PlanPrice;
  paymentMethodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface License {
  id: string;
  key: string;
  planId: string;
  planName: string;
  status: LicenseStatus;
  type: 'subscription' | 'perpetual' | 'trial';
  activatedAt?: string;
  expiresAt?: string;
  lastValidatedAt?: string;
  activations: LicenseActivation[];
  maxActivations: number;
  createdAt: string;
}

export interface LicenseActivation {
  id: string;
  deviceName: string;
  platform: string;
  activatedAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  paypal?: {
    email: string;
  };
  razorpay?: {
    vpa: string;
  };
  bankTransfer?: {
    bankName: string;
    last4: string;
  };
  billingAddress?: BillingAddress;
  createdAt: string;
}

export interface BillingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId?: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  planName: string;
  amount: number;
  currency: Currency;
  tax: number;
  total: number;
  description: string;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string;
  dueDate?: string;
  downloadUrl: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface BillingHistoryEntry {
  id: string;
  type: 'payment' | 'refund' | 'subscription_change' | 'license_activate' | 'coupon_apply';
  description: string;
  amount?: number;
  currency?: Currency;
  status: PaymentStatus | 'applied' | 'activated';
  invoiceId?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  minAmount?: number;
  valid: boolean;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  finalAmount: number;
  error?: string;
}

export interface UsageStats {
  backupJobsUsed: number;
  backupJobsLimit: number;
  conversionJobsUsed: number;
  conversionJobsLimit: number;
  storageUsed: number;
  storageLimit: number;
  apiRequestsUsed: number;
  apiRequestsLimit: number;
  accountsUsed: number;
  accountsLimit: number;
}

export interface UsageHistoryPoint {
  date: string;
  backupJobs: number;
  conversionJobs: number;
  storageBytes: number;
  apiRequests: number;
}

export interface BillingDashboardData {
  subscription: Subscription | null;
  license: License | null;
  usage: UsageStats;
  recentInvoices: Invoice[];
  outstandingBalance: number;
  nextBillingDate: string | null;
  licenseExpiration: string | null;
}

export interface CheckoutSession {
  id: string;
  planId: string;
  interval: PlanInterval;
  amount: number;
  currency: Currency;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  paymentMethodId?: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
}

export interface CheckoutFormData {
  planId: string;
  interval: PlanInterval;
  couponCode: string;
  paymentMethodId: string;
  billingAddress: BillingAddress;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Notification {
  id: string;
  type: 'payment_success' | 'payment_failed' | 'subscription_renewed' | 'subscription_expiring' | 'license_activated' | 'license_expiring' | 'invoice_generated';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
