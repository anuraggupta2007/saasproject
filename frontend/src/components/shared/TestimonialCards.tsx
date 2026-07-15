import { Star } from 'lucide-react'

interface TestimonialCardProps {
  name: string
  role: string
  avatar: string
  rating: number
  text: string
}

export function TestimonialCard({ name, role, avatar, rating, text }: TestimonialCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: rating }).map((_, j) => (
          <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        ))}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed mb-4">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-xs font-bold text-white">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  )
}
