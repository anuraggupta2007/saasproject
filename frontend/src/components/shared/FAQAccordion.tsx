import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'

interface FAQItem {
  q: string
  a: string
}

interface FAQAccordionProps {
  title?: string
  items: FAQItem[]
  allowMultiple?: boolean
}

export function FAQAccordion({ title, items, allowMultiple = false }: FAQAccordionProps) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set())

  const toggle = (index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(allowMultiple ? prev : [])
      if (prev.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div>
      {title && (
        <h2 className="text-2xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-brand-400" /> {title}
        </h2>
      )}
      <div className="space-y-3 max-w-2xl mx-auto">
        {items.map((item, i) => (
          <div
            key={i}
            className="card cursor-pointer border border-white/5 bg-surface-800/40 hover:border-white/10"
            onClick={() => toggle(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggle(i)}
            aria-expanded={openIndices.has(i)}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-200">{item.q}</p>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${
                  openIndices.has(i) ? 'rotate-180' : ''
                }`}
              />
            </div>
            <AnimatePresence>
              {openIndices.has(i) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed border-t border-white/5 pt-3">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
