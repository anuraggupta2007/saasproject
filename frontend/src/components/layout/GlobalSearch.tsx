import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  ArrowRight,
  LayoutDashboard,
  Settings,
  FolderArchive,
  RefreshCw,
  History,
  Download,
  Bell,
  User,
  CreditCard,
  Key,
  Shield,
  Ticket,
  FileText,
  BarChart3,
  Users,
  Command,
  Clock,
  Hash,
} from 'lucide-react'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  category: 'Pages' | 'Actions' | 'Recent'
  description?: string
}

const quickLinks: SearchResult[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'Pages' },
  { id: 'backup', label: 'Backup Jobs', href: '/dashboard/backup', icon: FolderArchive, category: 'Pages' },
  { id: 'convert', label: 'Convert Files', href: '/dashboard/convert', icon: RefreshCw, category: 'Pages' },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings, category: 'Pages' },
  { id: 'profile', label: 'Profile', href: '/dashboard/profile', icon: User, category: 'Pages' },
  { id: 'billing', label: 'Billing', href: '/dashboard/billing', icon: CreditCard, category: 'Pages' },
  { id: 'notifications', label: 'Notifications', href: '/dashboard/notifications', icon: Bell, category: 'Pages' },
  { id: 'history', label: 'Backup History', href: '/dashboard/backup-history', icon: History, category: 'Pages' },
  { id: 'downloads', label: 'Downloads', href: '/dashboard/downloads', icon: Download, category: 'Pages' },
  { id: 'api-keys', label: 'API Keys', href: '/dashboard/api-keys', icon: Key, category: 'Pages' },
  { id: 'license', label: 'License', href: '/dashboard/license', icon: Shield, category: 'Pages' },
  { id: 'support', label: 'Support', href: '/dashboard/support', icon: Ticket, category: 'Pages' },
  { id: 'activity', label: 'Activity Logs', href: '/dashboard/activity', icon: FileText, category: 'Pages' },
  { id: 'admin', label: 'Admin Dashboard', href: '/admin', icon: BarChart3, category: 'Pages' },
  { id: 'admin-users', label: 'Manage Users', href: '/admin/users', icon: Users, category: 'Pages' },
]

const RECENT_KEY = 'mailsavior-recent-searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(term: string) {
  const recent = getRecentSearches().filter((r) => r !== term)
  recent.unshift(term)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY)
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allItems = useMemo<SearchResult[]>(() => {
    const recentItems: SearchResult[] = recentSearches.map((term, i) => ({
      id: `recent-${i}`,
      label: term,
      href: '',
      icon: Clock,
      category: 'Recent' as const,
    }))

    const actionItems: SearchResult[] = [
      { id: 'action-new-backup', label: 'Create New Backup Job', href: '/dashboard/backup', icon: FolderArchive, category: 'Actions', description: 'Set up a new email backup' },
      { id: 'action-convert', label: 'Convert Files', href: '/dashboard/convert', icon: RefreshCw, category: 'Actions', description: 'Convert emails to different formats' },
      { id: 'action-upload', label: 'Upload Files', href: '/dashboard/upload', icon: FileText, category: 'Actions', description: 'Upload email files for conversion' },
      { id: 'action-view-history', label: 'View History', href: '/dashboard/backup-history', icon: History, category: 'Actions', description: 'Check your backup history' },
      { id: 'action-download', label: 'Download Files', href: '/dashboard/downloads', icon: Download, category: 'Actions', description: 'Access your downloaded files' },
    ]

    return [...actionItems, ...quickLinks, ...recentItems]
  }, [recentSearches])

  type CategoryKey = 'Recent' | 'Pages' | 'Actions'

  const results = useMemo<Record<CategoryKey, SearchResult[]>>(() => {
    if (!query.trim()) {
      return {
        Recent: recentSearches.slice(0, MAX_RECENT).map((term, i) => ({
          id: `recent-${i}`,
          label: term,
          href: '',
          icon: Clock,
          category: 'Recent' as const,
        })),
        Pages: quickLinks.slice(0, 6),
        Actions: allItems.filter((i) => i.category === 'Actions').slice(0, 4),
      }
    }

    const q = query.toLowerCase()
    const matched = allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
    )

    const grouped: Record<CategoryKey, SearchResult[]> = {
      Recent: [],
      Pages: [],
      Actions: [],
    }
    for (const item of matched) {
      const cat = item.category as CategoryKey
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }
    return grouped
  }, [query, allItems, recentSearches])

  const flatResults = useMemo(() => {
    const order: CategoryKey[] = ['Recent', 'Pages', 'Actions']
    const items: SearchResult[] = []
    for (const cat of order) {
      if (results[cat]) items.push(...results[cat])
    }
    return items
  }, [results])

  const totalResults = flatResults.length

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIndex(0)
      setRecentSearches(getRecentSearches())
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          onClose()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSelect = useCallback(
    (item: SearchResult) => {
      if (item.category === 'Recent' && item.label) {
        setQuery(item.label)
        return
      }

      if (query.trim()) {
        saveRecentSearch(query.trim())
        setRecentSearches(getRecentSearches())
      }

      navigate(item.href)
      onClose()
    },
    [navigate, onClose, query]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % totalResults)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + totalResults) % totalResults)
    } else if (e.key === 'Enter' && flatResults[activeIndex]) {
      e.preventDefault()
      handleSelect(flatResults[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleClearRecent = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const categoryOrder: CategoryKey[] = ['Recent', 'Pages', 'Actions']
  const visibleCategories = categoryOrder.filter((cat) => results[cat]?.length)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-[560px] bg-surface-800 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Global search"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                <Search className="w-5 h-5 text-slate-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, actions..."
                  className="flex-1 bg-transparent text-base text-white placeholder:text-slate-600 outline-none"
                  role="combobox"
                  aria-expanded={totalResults > 0}
                  aria-controls="global-search-listbox"
                  aria-activedescendant={
                    flatResults[activeIndex]
                      ? `search-item-${flatResults[activeIndex].id}`
                      : undefined
                  }
                  aria-autocomplete="list"
                />
                <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-slate-600 bg-white/5 px-2 py-1 rounded-md font-mono shrink-0">
                  <Command className="w-3 h-3" />K
                </kbd>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                id="global-search-listbox"
                role="listbox"
                className="max-h-[380px] overflow-y-auto py-2"
              >
                {totalResults === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Hash className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No results found for &ldquo;{query}&rdquo;</p>
                    <p className="text-xs text-slate-600 mt-1">Try a different search term</p>
                  </div>
                ) : (
                  visibleCategories.map((cat) => {
                    const items = results[cat]
                    if (!items?.length) return null

                    let itemIndex = 0
                    for (const c of visibleCategories) {
                      if (c === cat) break
                      itemIndex += results[c].length
                    }

                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between px-5 pt-3 pb-1">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            {cat}
                          </span>
                          {cat === 'Recent' && items.length > 0 && (
                            <button
                              onClick={handleClearRecent}
                              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {items.map((item: SearchResult, i: number) => {
                          const globalIndex = itemIndex + i
                          const isActive = globalIndex === activeIndex
                          const Icon = item.icon

                          return (
                            <button
                              key={item.id}
                              id={`search-item-${item.id}`}
                              role="option"
                              aria-selected={isActive}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                isActive ? 'bg-white/5 text-white' : 'text-slate-400 hover:bg-white/3 hover:text-slate-200'
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-brand-400' : 'text-slate-600'
                                }`}
                              />
                              <span className="flex-1 text-sm truncate">{item.label}</span>
                              {item.description && (
                                <span className="text-xs text-slate-600 truncate max-w-[160px] hidden sm:block">
                                  {item.description}
                                </span>
                              )}
                              {isActive && (
                                <ArrowRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white/5 px-1.5 py-0.5 rounded font-mono text-[10px]">Esc</kbd>
                    Close
                  </span>
                </div>
                <span className="text-slate-700">
                  {totalResults} result{totalResults !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
