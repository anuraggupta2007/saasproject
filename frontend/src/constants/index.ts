export const API_VERSION = 'v1'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const APP_NAME = 'MailSavior'

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'mailsavior-auth-token',
  THEME: 'mailsavior-theme',
  SIDEBAR_COLLAPSED: 'mailsavior-sidebar-collapsed',
} as const

export interface Plan {
  id: string
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  limits: {
    max_storage_gb: number
    max_conversions_per_day: number
    max_backup_size_gb: number
    api_access: boolean
    priority_support: boolean
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      '5 conversions per day',
      '1 GB storage',
      'Basic email formats',
      'Community support',
    ],
    limits: {
      max_storage_gb: 1,
      max_conversions_per_day: 5,
      max_backup_size_gb: 1,
      api_access: false,
      priority_support: false,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price_monthly: 9.99,
    price_yearly: 99.99,
    features: [
      '50 conversions per day',
      '10 GB storage',
      'All email formats',
      'Email support',
      'PST/MBOX conversion',
    ],
    limits: {
      max_storage_gb: 10,
      max_conversions_per_day: 50,
      max_backup_size_gb: 10,
      api_access: false,
      priority_support: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price_monthly: 24.99,
    price_yearly: 249.99,
    features: [
      'Unlimited conversions',
      '100 GB storage',
      'All email formats',
      'Priority support',
      'API access',
      'Batch processing',
      'Advanced filters',
    ],
    limits: {
      max_storage_gb: 100,
      max_conversions_per_day: -1,
      max_backup_size_gb: 100,
      api_access: true,
      priority_support: true,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_monthly: 79.99,
    price_yearly: 799.99,
    features: [
      'Unlimited everything',
      '1 TB storage',
      'All email formats',
      'Dedicated support',
      'API access',
      'Batch processing',
      'Advanced filters',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: {
      max_storage_gb: 1000,
      max_conversions_per_day: -1,
      max_backup_size_gb: 1000,
      api_access: true,
      priority_support: true,
    },
  },
]

export const SUPPORTED_FORMATS = [
  'pst',
  'mbox',
  'eml',
  'msg',
  'pdf',
  'html',
  'csv',
] as const

export const OUTPUT_FORMATS = [
  { label: 'PDF', value: 'pdf' },
  { label: 'EML', value: 'eml' },
  { label: 'MBOX', value: 'mbox' },
  { label: 'HTML', value: 'html' },
  { label: 'CSV', value: 'csv' },
  { label: 'MSG', value: 'msg' },
  { label: 'PST', value: 'pst' },
] as const

export const MAX_FILE_SIZE_MB = 10240
