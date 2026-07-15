// Brand / Primary - shared across themes
const primary = {
  50: '#f0f7ff',
  100: '#dfeeff',
  200: '#b8ddff',
  300: '#79c4ff',
  400: '#33a8ff',
  500: '#0a7bc2',
  600: '#08619d',
  700: '#074e83',
  800: '#0a3f69',
  900: '#0e3457',
  950: '#082239',
} as const

// Accent / Success - shared across themes
const accent = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#009688',
  600: '#00796b',
  700: '#00695c',
  800: '#00574d',
  900: '#004a41',
} as const

// Warning - shared across themes
const warning = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
} as const

// Danger - shared across themes
const danger = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
} as const

// Info - shared across themes
const info = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
} as const

// Light mode colors
export const lightColors = {
  primary,
  accent,
  warning,
  danger,
  info,
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  background: {
    DEFAULT: '#ffffff',
    subtle: '#f8fafc',
    muted: '#f1f5f9',
  },
  surface: {
    DEFAULT: '#ffffff',
    raised: '#f8fafc',
    overlay: '#ffffff',
  },
  border: {
    DEFAULT: '#e2e8f0',
    strong: '#cbd5e1',
    subtle: '#f1f5f9',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    onPrimary: '#ffffff',
  },
} as const

// Dark mode colors
export const darkColors = {
  primary,
  accent,
  warning,
  danger,
  info,
  neutral: {
    50: '#1e293b',
    100: '#1a2332',
    200: '#161d2e',
    300: '#0f172a',
    400: '#64748b',
    500: '#94a3b8',
    600: '#cbd5e1',
    700: '#e2e8f0',
    800: '#f1f5f9',
    900: '#f8fafc',
    950: '#ffffff',
  },
  background: {
    DEFAULT: '#0a0a0f',
    subtle: '#0f0f1a',
    muted: '#161625',
  },
  surface: {
    DEFAULT: '#161625',
    raised: '#1e1e30',
    overlay: '#252540',
  },
  border: {
    DEFAULT: '#1e1e30',
    strong: '#2e2e52',
    subtle: '#161625',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    tertiary: '#64748b',
    inverse: '#0f172a',
    onPrimary: '#ffffff',
  },
} as const

interface ColorScale {
  readonly 50: string
  readonly 100: string
  readonly 200: string
  readonly 300: string
  readonly 400: string
  readonly 500: string
  readonly 600: string
  readonly 700: string
  readonly 800: string
  readonly 900: string
  readonly 950?: string
}

interface SharedColors {
  readonly primary: typeof primary
  readonly accent: typeof accent
  readonly warning: typeof warning
  readonly danger: typeof danger
  readonly info: typeof info
}

export interface ThemeColors extends SharedColors {
  readonly neutral: ColorScale
  readonly background: {
    readonly DEFAULT: string
    readonly subtle: string
    readonly muted: string
  }
  readonly surface: {
    readonly DEFAULT: string
    readonly raised: string
    readonly overlay: string
  }
  readonly border: {
    readonly DEFAULT: string
    readonly strong: string
    readonly subtle: string
  }
  readonly text: {
    readonly primary: string
    readonly secondary: string
    readonly tertiary: string
    readonly inverse: string
    readonly onPrimary: string
  }
}
