import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderArchive, RefreshCw, Upload, Mail,
  History, Download, Bell, Activity, User, Settings,
  CreditCard, Key, Shield, BarChart3, Users, FileText,
  Wrench, X, ChevronLeft, ChevronRight, ExternalLink,
  BookOpen, MessageSquare, ScrollText, Ticket, Search
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

interface NavChild {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  external?: boolean
}

interface NavItem {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  children?: NavChild[]
  badge?: string
  external?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true },
      {
        label: 'Email Backup',
        icon: FolderArchive,
        children: [
          { label: 'Backup Jobs', href: '/dashboard/backup', icon: FolderArchive, badge: '3' },
          { label: 'Connected Accounts', href: '/dashboard/accounts', icon: Mail },
          { label: 'Backup History', href: '/dashboard/backup-history', icon: History },
          { label: 'Schedule', href: '/dashboard/schedule', icon: RefreshCw },
        ],
      },
      {
        label: 'Converter',
        icon: RefreshCw,
        children: [
          { label: 'Convert Files', href: '/dashboard/convert', icon: RefreshCw },
          { label: 'Upload Files', href: '/dashboard/upload', icon: Upload },
          { label: 'Conversion History', href: '/dashboard/conversion-history', icon: History },
          { label: 'Downloads', href: '/dashboard/downloads', icon: Download },
        ],
      },
      { label: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: 'New' },
      { label: 'Activity Logs', href: '/dashboard/activity', icon: Activity },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', href: '/dashboard/profile', icon: User },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { label: 'API Keys', href: '/dashboard/api-keys', icon: Key },
      { label: 'License', href: '/dashboard/license', icon: Shield },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Documentation', href: 'https://docs.mailsavior.com', icon: BookOpen, external: true },
      { label: 'Contact Support', href: '/dashboard/support', icon: MessageSquare },
      { label: 'Changelog', href: 'https://changelog.mailsavior.com', icon: ScrollText, external: true },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'User Management', href: '/admin/users', icon: Users },
      { label: 'Analytics', href: '/admin', icon: BarChart3, exact: true },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Logs', href: '/admin/logs', icon: FileText },
      { label: 'Monitoring', href: '/admin/monitoring', icon: Wrench },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { sidebarCollapsed, toggleSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore()
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const isAdmin = user?.role === 'admin'

  const isActive = useCallback(
    (href: string, exact = false) => {
      if (exact) return location.pathname === href
      return location.pathname.startsWith(href)
    },
    [location.pathname]
  )

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }, [])

  const filteredSections = navSections.filter((section) => {
    if (section.label === 'Administration') return isAdmin
    return true
  })

  const flatItems: (NavItem | NavChild)[] = []
  filteredSections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children) {
        const isOpen = openGroups.has(item.label) || item.children.some((c) => isActive(c.href))
        if (isOpen || sidebarCollapsed) {
          flatItems.push(...item.children)
        } else {
          flatItems.push(item)
        }
      } else {
        flatItems.push(item)
      }
    })
  })

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!navRef.current) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            const link = itemRefs.current[focusedIndex]?.querySelector('a, button')
            if (link) (link as HTMLElement).click()
          }
          break
        case 'Escape':
          e.preventDefault()
          setSidebarOpen(false)
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(flatItems.length - 1)
          break
      }
    },
    [focusedIndex, flatItems.length, setSidebarOpen]
  )

  useEffect(() => {
    setFocusedIndex(-1)
  }, [location.pathname])

  useEffect(() => {
    if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  let globalIndex = -1

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 264 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          bg-surface-800 border-r border-white/5
          lg:relative lg:flex lg:translate-x-0
          transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
          {!sidebarCollapsed ? (
            <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="MailSavior Home">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-base font-display tracking-tight">MailSavior</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="mx-auto" aria-label="MailSavior Home">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Mail className="w-4 h-4 text-white" />
              </div>
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <nav
          ref={navRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1"
          onKeyDown={handleKeyDown}
          role="menubar"
          aria-orientation="vertical"
        >
          {filteredSections.map((section) => (
            <div key={section.label} role="group" aria-labelledby={`section-${section.label}`}>
              {(!sidebarCollapsed) && (
                <p
                  id={`section-${section.label}`}
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 pt-4 pb-1.5 select-none"
                >
                  {section.label}
                </p>
              )}
              {sidebarCollapsed && section.label !== filteredSections[0]?.label && (
                <div className="mx-3 my-2 border-t border-white/5" />
              )}
              {section.items.map((item) => {
                if (item.children) {
                  const isGroupActive = item.children.some((c) => isActive(c.href))
                  const isOpen = openGroups.has(item.label) || isGroupActive

                  return (
                    <div key={item.label} role="none">
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={`
                          sidebar-item w-full group/item relative
                          ${isGroupActive ? 'text-slate-200' : ''}
                        `}
                        title={sidebarCollapsed ? item.label : undefined}
                        role="menuitem"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        tabIndex={0}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">{item.label}</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isOpen ? 'rotate-90' : ''
                              }`}
                            />
                          </>
                        )}
                        {sidebarCollapsed && isGroupActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-500 rounded-r" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isOpen && !sidebarCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="ml-4 pl-3 border-l border-white/5 mt-0.5 space-y-0.5 overflow-hidden"
                            role="menu"
                          >
                            {item.children.map((child) => {
                              globalIndex++
                              const childIndex = globalIndex
                              return (
                                <Link
                                  key={child.href}
                                  to={child.external ? child.href : child.href}
                                  className={`
                                    sidebar-item text-xs relative
                                    ${isActive(child.href) ? 'active' : ''}
                                  `}
                                  onClick={() => setSidebarOpen(false)}
                                  role="menuitem"
                                  tabIndex={-1}
                                  ref={(el) => { itemRefs.current[childIndex] = el }}
                                  {...(child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                >
                                  <child.icon className="w-3.5 h-3.5 shrink-0" />
                                  <span className="flex-1">{child.label}</span>
                                  {child.badge && (
                                    <span
                                      className={`
                                        text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
                                        ${child.badge === 'New'
                                          ? 'bg-brand-500/20 text-brand-400'
                                          : 'bg-white/10 text-slate-400'
                                        }
                                      `}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                  {child.external && (
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                  )}
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }

                globalIndex++
                const itemIndex = globalIndex

                return (
                  <div key={item.href} role="none" className="relative">
                    {sidebarCollapsed ? (
                      <div className="relative group/tooltip">
                        <Link
                          to={item.external ? item.href! : item.href!}
                          className={`sidebar-item ${isActive(item.href!, item.exact) ? 'active' : ''}`}
                          title={item.label}
                          onClick={() => setSidebarOpen(false)}
                          role="menuitem"
                          tabIndex={-1}
                          ref={(el) => { itemRefs.current[itemIndex] = el }}
                          {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.badge && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500" />
                          )}
                        </Link>
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-surface-900 border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 z-50 pointer-events-none shadow-xl">
                          {item.label}
                          {item.badge && (
                            <span className="ml-2 text-brand-400 font-semibold">{item.badge}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={item.external ? item.href! : item.href!}
                        className={`sidebar-item ${isActive(item.href!, item.exact) ? 'active' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                        role="menuitem"
                        tabIndex={-1}
                        ref={(el) => { itemRefs.current[itemIndex] = el }}
                        {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`
                              text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
                              ${item.badge === 'New'
                                ? 'bg-brand-500/20 text-brand-400'
                                : 'bg-white/10 text-slate-400'
                              }
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.external && (
                          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                        )}
                      </Link>
                    )}
                    {isActive(item.href!, item.exact) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-500 rounded-r" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        <AnimatePresence>
          {user && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 border-t border-white/5"
            >
              <Link
                to="/dashboard/profile"
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0 ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-white/10">
                    {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-slate-500 truncate capitalize">{user.plan || 'Free'} plan</p>
                </div>
                <Settings className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarCollapsed && user && (
          <div className="p-3 border-t border-white/5 flex justify-center">
            <div className="relative group/tooltip">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10">
                  {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute left-full ml-2 bottom-0 px-2.5 py-1.5 bg-surface-900 border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 z-50 pointer-events-none shadow-xl">
                {user.full_name}
                <span className="ml-1.5 text-slate-500 capitalize">{user.plan || 'Free'} plan</span>
              </div>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}
