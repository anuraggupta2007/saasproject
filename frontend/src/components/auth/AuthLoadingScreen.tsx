import { Mail } from 'lucide-react'

interface AuthLoadingScreenProps {
  message?: string
}

export function AuthLoadingScreen({ message = 'Loading...' }: AuthLoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center animated-gradient-bg">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-4 glow-brand-sm animate-pulse">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          {message}
        </div>
      </div>
    </div>
  )
}
