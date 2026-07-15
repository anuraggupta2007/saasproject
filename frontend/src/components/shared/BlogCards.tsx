import { Calendar, Clock, ArrowRight } from 'lucide-react'

interface BlogCardProps {
  title: string
  excerpt: string
  category: string
  date: string
  author?: string
  readTime: string
  gradient: string
  onClick?: () => void
}

export function BlogCard({ title, excerpt, category, date, readTime, gradient, onClick }: BlogCardProps) {
  return (
    <article
      className="card flex flex-col justify-between hover:scale-[1.01] transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-4">
        <div className={`h-40 rounded-xl bg-gradient-to-br ${gradient} opacity-80 mb-4`} />
        <span className="badge badge-neutral text-xs">{category}</span>
        <h3 className="text-lg font-bold text-white leading-snug hover:text-brand-300 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-3">{excerpt}</p>
      </div>
      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> {date}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {readTime}
        </div>
      </div>
    </article>
  )
}

interface BlogFeaturedCardProps {
  title: string
  excerpt: string
  category: string
  date: string
  readTime: string
  gradient: string
  onClick?: () => void
}

export function BlogFeaturedCard({ title, excerpt, category, date, readTime, gradient, onClick }: BlogFeaturedCardProps) {
  return (
    <div
      className="card border border-white/5 bg-surface-800/40 p-6 md:p-10 flex flex-col lg:flex-row gap-8 hover:border-white/10 cursor-pointer"
      onClick={onClick}
    >
      <div className={`flex-1 rounded-xl bg-gradient-to-br ${gradient} min-h-[250px] flex items-center justify-center p-6 text-center`}>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white max-w-md">{title}</h2>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <span className="badge badge-brand">{category}</span>
          <h2 className="text-2xl font-bold text-white hover:text-brand-300 transition-colors">{title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{excerpt}</p>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {date}</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {readTime}</div>
          </div>
          <button className="text-brand-400 hover:text-brand-300 font-semibold text-sm flex items-center gap-1.5 group">
            Read Article <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  )
}
