import { describe, it, expect } from 'vitest'
import {
  hasRole,
  hasAnyRole,
  isAdmin,
  isSuperAdmin,
  hasMinimumPlan,
  canAccessRoute,
  canUseFeature,
} from '@/lib/guards'
import type { User } from '@/types'

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  email: 'test@test.com',
  full_name: 'Test User',
  role: 'user',
  isVerified: true,
  plan: 'free',
  status: 'active',
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

describe('Role Guards', () => {
  it('checks single role', () => {
    const user = makeUser({ role: 'admin' })
    expect(hasRole(user, 'admin')).toBe(true)
    expect(hasRole(user, 'super_admin')).toBe(false)
  })

  it('handles null user', () => {
    expect(hasRole(null, 'admin')).toBe(false)
  })

  it('checks any role', () => {
    const user = makeUser({ role: 'support' })
    expect(hasAnyRole(user, ['admin', 'support'])).toBe(true)
    expect(hasAnyRole(user, ['admin', 'super_admin'])).toBe(false)
  })

  it('identifies admins', () => {
    expect(isAdmin(makeUser({ role: 'admin' }))).toBe(true)
    expect(isAdmin(makeUser({ role: 'super_admin' }))).toBe(true)
    expect(isAdmin(makeUser({ role: 'user' }))).toBe(false)
  })

  it('identifies super admins', () => {
    expect(isSuperAdmin(makeUser({ role: 'super_admin' }))).toBe(true)
    expect(isSuperAdmin(makeUser({ role: 'admin' }))).toBe(false)
  })
})

describe('Plan Guards', () => {
  it('checks minimum plan', () => {
    const user = makeUser({ plan: 'professional' })
    expect(hasMinimumPlan(user, 'free')).toBe(true)
    expect(hasMinimumPlan(user, 'starter')).toBe(true)
    expect(hasMinimumPlan(user, 'professional')).toBe(true)
    expect(hasMinimumPlan(user, 'enterprise')).toBe(false)
  })

  it('handles null user', () => {
    expect(hasMinimumPlan(null, 'free')).toBe(false)
  })
})

describe('Route Guards', () => {
  it('allows access without role requirement', () => {
    expect(canAccessRoute(makeUser())).toBe(true)
  })

  it('checks route access with role', () => {
    expect(canAccessRoute(makeUser({ role: 'admin' }), 'admin')).toBe(true)
    expect(canAccessRoute(makeUser({ role: 'user' }), 'admin')).toBe(false)
  })

  it('super admin can access all routes', () => {
    expect(canAccessRoute(makeUser({ role: 'super_admin' }), 'admin')).toBe(true)
  })
})

describe('Feature Guards', () => {
  it('allows users to use backup feature', () => {
    expect(canUseFeature(makeUser({ role: 'user' }), 'backup')).toBe(true)
  })

  it('restricts admin feature to admins', () => {
    expect(canUseFeature(makeUser({ role: 'user' }), 'admin')).toBe(false)
    expect(canUseFeature(makeUser({ role: 'admin' }), 'admin')).toBe(true)
  })

  it('restricts support feature', () => {
    expect(canUseFeature(makeUser({ role: 'user' }), 'support')).toBe(false)
    expect(canUseFeature(makeUser({ role: 'support' }), 'support')).toBe(true)
  })
})
