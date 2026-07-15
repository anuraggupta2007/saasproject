import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import { useUIStore } from '@/store/uiStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

export function Providers({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useUIStore((s) => s.resolvedTheme)
  const isDark = resolvedTheme === 'dark'

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: isDark ? '#1e1e30' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#0f172a',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0'
            }
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HelmetProvider>
  )
}
