import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { DashboardNavbar } from './DashboardNavbar'
import { DashboardBreadcrumb } from './DashboardBreadcrumb'
import { NotificationPanel } from './NotificationPanel'
import { GlobalSearch } from './GlobalSearch'
import { useUIStore } from '@/store/uiStore'

interface DashboardLayoutProps {
  admin?: boolean
}

export function DashboardLayout({ admin = false }: DashboardLayoutProps) {
  const { searchOpen, setSearchOpen } = useUIStore()

  return (
    <div className="flex h-screen bg-surface-900 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardNavbar admin={admin} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <DashboardBreadcrumb />
          <Outlet />
        </main>
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationPanel />
    </div>
  )
}
