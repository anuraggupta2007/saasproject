import type { UserRole } from '@/types'

// ─── Permission Checks ──────────────────────────────────────────────────────

import type { User } from '@/types'

export function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false
  return user.role === role
}

export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.includes(user.role)
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  if (user.role === 'super_admin') return true
  if (user.role === 'admin') return true
  return false
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin'
}

export function isSuperAdmin(user: User | null): boolean {
  return user?.role === 'super_admin'
}

export function isSupport(user: User | null): boolean {
  return user?.role === 'support'
}

export function isBillingManager(user: User | null): boolean {
  return user?.role === 'billing_manager'
}

// ─── Plan Checks ─────────────────────────────────────────────────────────────

export function hasMinimumPlan(user: User | null, minimumPlan: string): boolean {
  if (!user) return false
  const planOrder = ['free', 'starter', 'professional', 'enterprise']
  const userPlanIndex = planOrder.indexOf(user.plan)
  const minimumPlanIndex = planOrder.indexOf(minimumPlan)
  return userPlanIndex >= minimumPlanIndex
}

// ─── Route Guards ────────────────────────────────────────────────────────────

export function canAccessRoute(user: User | null, requiredRole?: UserRole): boolean {
  if (!user) return false
  if (!requiredRole) return true
  return hasAnyRole(user, [requiredRole, 'super_admin'])
}

// ─── Feature Guards ──────────────────────────────────────────────────────────

const FEATURE_ROLES: Record<string, UserRole[]> = {
  backup: ['user', 'admin', 'super_admin'],
  conversion: ['user', 'admin', 'super_admin'],
  admin: ['admin', 'super_admin'],
  billing: ['user', 'admin', 'super_admin', 'billing_manager'],
  support: ['support', 'admin', 'super_admin'],
  settings: ['user', 'admin', 'super_admin'],
}

export function canUseFeature(user: User | null, feature: string): boolean {
  if (!user) return false
  const allowedRoles = FEATURE_ROLES[feature]
  if (!allowedRoles) return true
  return hasAnyRole(user, allowedRoles)
}

// ─── Subscription Guards ─────────────────────────────────────────────────────

export function canPerformAction(user: User | null, action: string): boolean {
  if (!user) return false
  if (user.status !== 'active') return false
  if (user.plan === 'free' && action === 'export') return false
  return true
}
