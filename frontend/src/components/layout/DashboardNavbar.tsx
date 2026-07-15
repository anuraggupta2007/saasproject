import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Search, Bell, ChevronDown, Sun, Moon, Monitor,
  User, LogOut, Settings, CreditCard, Key, Shield, X
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/utils/format'

interface DashboardNavbarProps {
  admin?: boolean
}

export function DashboardNavbar({ admin = false }: DashboardNavbarProps) {
  const { toggleSidebar, theme, setTheme, searchOpen, setSearchOpen, notificationPanelOpen, setNotificationPanelOpen } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const userMenuRef = useRef<HTMLDivElement>(null)
  const themeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setUserMenuOpen(false)
        setThemeMenuOpen(false)
        setNotificationPanelOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchOpen, setNotificationPanelOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const themeOptions = [
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  const userMenuItems = admin
    ? [
        { label: 'Profile', icon: User, href: '/admin/profile' },
        { label: 'Settings', icon: Settings, href: '/admin/settings' },
        { label: 'API Keys', icon: Key, href: '/admin/api-keys' },
      ]
    : [
        { label: 'Profile', icon: User, href: '/dashboard/profile' },
        { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
        { label: 'Billing', icon: CreditCard, href: '/dashboard/billing' },
        { label: 'API Keys', icon: Key, href: '/dashboard/api-keys' },
      ]

  return (
    <>
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 w-64 text-left hover:bg-white/10 transition-colors"
            aria-label="Open search"
          >
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm text-slate-400">Search...</span>
            <kbd className="ml-auto text-xs text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Toggle theme"
              aria-expanded={themeMenuOpen}
            >
              {theme === 'dark' && <Moon className="w-4 h-4" />}
              {theme === 'light' && <Sun className="w-4 h-4" />}
              {theme === 'system' && <Monitor className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full right-0 mt-2 w-36 glass-strong rounded-xl p-1.5 shadow-xl z-50"
                  role="menu"
                >
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value)
                        setThemeMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        theme === option.value
                          ? 'text-white bg-white/10'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                      role="menuitem"
                    >
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Notifications"
            aria-expanded={notificationPanelOpen}
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  getInitials(user?.full_name || 'User')
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-200 leading-none">{user?.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.plan} plan</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full right-0 mt-2 w-56 glass-strong rounded-xl p-2 shadow-xl z-50"
                  role="menu"
                >
                  <div className="px-3 py-2 mb-1 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  {userMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                      role="menuitem"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}

                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={() => setSearchOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-xl mx-4 glass-strong rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search dashboard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none"
                  autoFocus
                  aria-label="Search"
                />
                <kbd className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded font-mono">ESC</kbd>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {searchQuery ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Search results for "{searchQuery}"
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">Quick Actions</p>
                    {[
                      { label: 'Dashboard', href: admin ? '/admin' : '/dashboard' },
                      { label: 'Settings', href: admin ? '/admin/settings' : '/dashboard/settings' },
                      { label: 'Billing', href: '/dashboard/billing' },
                      { label: 'API Keys', href: admin ? '/admin/api-keys' : '/dashboard/api-keys' },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setSearchOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}