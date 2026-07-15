import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface HeroBannerProps {
  badge?: string
  badgeIcon?: ReactNode
  title: string
  titleHighlight: string
  subtitle: string
  children?: ReactNode
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: 'easeOut' as const },
  }),
}

export function HeroBanner({
  badge,
  badgeIcon,
  title,
  titleHighlight,
  subtitle,
  children,
}: HeroBannerProps) {
  return (
    <section className="relative pt-28 pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/8 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/6 blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {badge && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/20 mb-8"
          >
            {badgeIcon && <span className="text-brand-400">{badgeIcon}</span>}
            <span className="text-sm text-slate-300">{badge}</span>
          </motion.div>
        )}

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display leading-[1.1] tracking-tight mb-6"
        >
          <span className="text-white">{title}</span>
          <br />
          <span className="gradient-brand-text">{titleHighlight}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {children && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}
