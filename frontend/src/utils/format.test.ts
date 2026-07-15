import { describe, it, expect } from 'vitest'
import { cn } from '@/utils/cn'
import { formatBytes, formatDate, formatDuration, truncate, slugify, getInitials } from '@/utils/format'

describe('cn utility', () => {
  it('merges class names', () => {
    const result = cn('text-white', 'bg-black')
    expect(result).toContain('text-white')
    expect(result).toContain('bg-black')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toContain('base')
    expect(result).toContain('extra')
    expect(result).not.toContain('hidden')
  })

  it('deduplicates tailwind classes', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })
})

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('formats with custom decimals', () => {
    expect(formatBytes(1536, 1)).toBe('1.5 KB')
  })
})

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(45)).toBe('45s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3661)).toBe('1h 1m')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello\u2026')
  })

  it('returns short strings unchanged', () => {
    expect(truncate('Hi', 5)).toBe('Hi')
  })
})

describe('slugify', () => {
  it('creates slugs from strings', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('handles special characters', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world')
  })
})

describe('getInitials', () => {
  it('gets initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('gets single initial', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('handles empty string', () => {
    expect(getInitials('')).toBe('')
  })
})
