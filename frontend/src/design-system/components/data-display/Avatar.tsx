import { useState } from 'react'
import { cn } from '@/utils/cn'

export interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?: 'circle' | 'square' | 'rounded'
  status?: 'online' | 'offline' | 'away' | 'busy'
}

const sizeClasses: Record<string, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const shapeClasses: Record<string, string> = {
  circle: 'rounded-full',
  square: 'rounded-none',
  rounded: 'rounded-lg',
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-zinc-400',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
}

const statusSizes: Record<string, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
}

const gradients = [
  'from-blue-500 to-purple-500',
  'from-emerald-500 to-cyan-500',
  'from-rose-500 to-orange-500',
  'from-violet-500 to-pink-500',
  'from-amber-500 to-red-500',
  'from-teal-500 to-blue-500',
]

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  shape = 'circle',
  status,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden font-medium text-white',
          sizeClasses[size],
          shapeClasses[shape],
          !showImage &&
            name &&
            `bg-gradient-to-br ${getGradient(name)}`,
          !showImage && !name && 'bg-zinc-300 dark:bg-zinc-700',
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || ''}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : name ? (
          <span>{getInitials(name)}</span>
        ) : (
          <svg
            className="h-1/2 w-1/2 text-zinc-500 dark:text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-zinc-900',
            statusColors[status],
            statusSizes[size],
          )}
        />
      )}
    </div>
  )
}
