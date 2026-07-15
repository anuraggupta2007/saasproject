export const typography = {
  fontFamily: {
    sans: "'Inter', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
    display: "'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// Semantic typography presets
export const textStyles = {
  display: 'text-5xl font-extrabold font-display tracking-tight',
  h1: 'text-4xl font-extrabold font-display tracking-tight',
  h2: 'text-3xl font-bold font-display tracking-tight',
  h3: 'text-2xl font-bold font-display',
  h4: 'text-xl font-semibold',
  h5: 'text-lg font-semibold',
  h6: 'text-base font-semibold',
  subtitle: 'text-lg text-secondary leading-relaxed',
  bodyLarge: 'text-lg leading-relaxed',
  body: 'text-base leading-relaxed',
  bodySmall: 'text-sm leading-relaxed',
  small: 'text-sm',
  caption: 'text-xs',
  code: 'text-sm font-mono',
  label: 'text-sm font-medium',
} as const

export type FontFamily = typeof typography.fontFamily
export type FontSize = typeof typography.fontSize
export type FontWeight = typeof typography.fontWeight
export type TextStyles = typeof textStyles
