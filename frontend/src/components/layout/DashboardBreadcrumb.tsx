import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, Mail, Users, ArrowLeftRight, Upload, History,
  Download, Bell, Activity, User, Settings, CreditCard,
  Key, Shield, Headphones, ShieldCheck, UserCog, DollarSign,
  FileText, ActivitySquare, ChevronRight
} from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  backup: 'Email Backup',
  accounts: 'Connected Accounts',
  convert: 'Converter',
  upload: 'Upload Files',
  history: 'History',
  downloads: 'Downloads',
  notifications: 'Notifications',
  activity: 'Activity',
  profile: 'Profile',
  settings: 'Settings',
  billing: 'Billing',
  'api-keys': 'API Keys',
  license: 'License',
  support: 'Support',
  admin: 'Admin',
  users: 'User Management',
  payments: 'Payments',
  logs: 'Logs',
  monitoring: 'Monitoring',
}

const routeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: Home,
  backup: Mail,
  accounts: Users,
  convert: ArrowLeftRight,
  upload: Upload,
  history: History,
  downloads: Download,
  notifications: Bell,
  activity: Activity,
  profile: User,
  settings: Settings,
  billing: CreditCard,
  'api-keys': Key,
  license: Shield,
  support: Headphones,
  admin: ShieldCheck,
  users: UserCog,
  payments: DollarSign,
  logs: FileText,
  monitoring: ActivitySquare,
}

interface BreadcrumbSegment {
  label: string
  href: string
  isLast: boolean
}

export function DashboardBreadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const breadcrumbItems: BreadcrumbSegment[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    return { label, href, isLast }
  })

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      aria-label="Breadcrumb"
      className="mb-6"
    >
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </li>

        {breadcrumbItems.map((item, i) => {
          const Icon = routeIcons[segments[i]]
          const isMiddle = i > 0 && !item.isLast
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 shrink-0" />
              {isMiddle && i > 1 && (
                <span className="hidden md:inline text-slate-600">...</span>
              )}
              {item.isLast ? (
                <span className="flex items-center gap-1.5 text-white font-medium">
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className={`flex items-center gap-1.5 hover:text-white transition-colors ${
                    isMiddle ? 'hidden sm:flex' : ''
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </motion.nav>
  )
}
