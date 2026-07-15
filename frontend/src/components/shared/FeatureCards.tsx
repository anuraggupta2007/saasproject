import { motion } from 'framer-motion'
import type { ReactNode, ComponentType, ForwardRefExoticComponent } from 'react'

type IconComponent = ComponentType<{ className?: string }> | ForwardRefExoticComponent<{ className?: string }>

interface FeatureCardProps {
  icon: ReactNode | IconComponent
  title: string
  description: string
  color?: string
  index?: number
}

export function FeatureCard({ icon, title, description, color = '#08619d', index = 0 }: FeatureCardProps) {
  const renderIcon = () => {
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
      const Icon = icon as IconComponent
      return <Icon className="w-6 h-6" />
    }
    return icon
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="glass-card p-6 hover:border-white/15 transition-all group"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
        style={{ background: `${color}18`, color }}
      >
        {renderIcon()}
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  )
}

interface FeatureGridProps {
  features: Array<{
    icon: ReactNode
    title: string
    description: string
    color?: string
  }>
  columns?: 2 | 3 | 4
}

export function FeatureGrid({ features, columns = 3 }: FeatureGridProps) {
  const gridClass = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 ${gridClass} gap-5`}>
      {features.map((f, i) => (
        <FeatureCard key={f.title} {...f} index={i} />
      ))}
    </div>
  )
}
