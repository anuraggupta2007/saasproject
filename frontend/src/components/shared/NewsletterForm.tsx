import { useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface NewsletterFormProps {
  variant?: 'inline' | 'card'
}

export function NewsletterForm({ variant = 'inline' }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    toast.success('Thanks for subscribing!')
    setEmail('')
    setLoading(false)
  }

  if (variant === 'card') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-3 justify-center"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-md mx-auto">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 text-sm">
        {loading ? '...' : 'Subscribe'}
      </button>
    </form>
  )
}
