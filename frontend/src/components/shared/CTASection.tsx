import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface CTASectionProps {
  icon?: ReactNode
  title: string
  description: string
  primaryAction: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
}

export function CTASection({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: CTASectionProps) {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl p-12 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 50%, rgba(236,72,153,0.1) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-brand-600/15 blur-[80px]" />
          </div>
          <div className="relative z-10">
            {icon && (
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6 glow-brand">
                {icon}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-4">
              {title}
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">{description}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={primaryAction.href} className="btn-primary btn-xl glow-brand">
                {primaryAction.label} <ArrowRight className="w-5 h-5" />
              </Link>
              {secondaryAction && (
                <Link to={secondaryAction.href} className="btn-ghost btn-xl">
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
