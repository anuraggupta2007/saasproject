import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface PricingCardProps {
  name: string
  price: { monthly: number | null; lifetime?: number | null }
  description: string
  icon: ReactNode
  color: string
  features: string[]
  missing?: string[]
  cta: string
  href: string
  popular?: boolean
  index?: number
}

export function PricingCard({
  name,
  price,
  description,
  icon,
  color,
  features,
  missing = [],
  cta,
  href,
  popular = false,
  index = 0,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex flex-col rounded-2xl p-6 border transition-all ${
        popular
          ? 'border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10'
          : 'border-white/8 bg-surface-700/50 hover:border-white/15'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge badge-brand text-xs px-3 py-1 shadow-lg">Most Popular</span>
        </div>
      )}

      <div className="mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>

      <div className="mb-6">
        {price.monthly === null ? (
          <p className="text-2xl font-extrabold text-white">Custom</p>
        ) : price.monthly === 0 ? (
          <p className="text-2xl font-extrabold text-white">$0</p>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-white">${price.monthly}</span>
            <span className="text-slate-500 text-sm mb-1">/mo</span>
          </div>
        )}
        {price.lifetime && (
          <p className="text-xs text-accent-400 mt-1">Lifetime: ${price.lifetime} one-time</p>
        )}
      </div>

      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
            <span className="text-slate-300">{f}</span>
          </li>
        ))}
        {missing.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm opacity-40">
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">—</span>
            <span className="text-slate-500">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        to={href}
        className={popular ? 'btn-primary text-center justify-center' : 'btn-secondary text-center justify-center'}
      >
        {cta}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  )
}
