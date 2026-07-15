import type React from 'react'
import { cn } from '@/utils/cn'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  maxItems?: number
  className?: string
}

const DefaultSeparator = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5 shrink-0 text-[var(--ds-text-tertiary,#9ca3af)]"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const EllipsisIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5 shrink-0"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
)

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <DefaultSeparator />,
  maxItems = 5,
  className,
}) => {
  const shouldCollapse = items.length > maxItems

  const renderItems = (): BreadcrumbItem[] => {
    if (!shouldCollapse) return items

    const firstItem = items[0]
    const lastTwoItems = items.slice(-2)
    return [firstItem, ...lastTwoItems]
  }

  const displayItems = renderItems()
  const isCollapsed = shouldCollapse

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const showEllipsisBefore = isCollapsed && index === 1

          return (
            <li key={item.label} className="flex items-center gap-1">
              {showEllipsisBefore && (
                <>
                  <span
                    className="flex items-center text-[var(--ds-text-tertiary,#9ca3af)]"
                    aria-hidden="true"
                  >
                    {separator}
                  </span>
                  <span className="flex items-center text-[var(--ds-text-tertiary,#9ca3af)]">
                    <EllipsisIcon />
                  </span>
                </>
              )}

              {index > 0 && !showEllipsisBefore && (
                <span
                  className="flex items-center text-[var(--ds-text-tertiary,#9ca3af)]"
                  aria-hidden="true"
                >
                  {separator}
                </span>
              )}

              <li className="flex items-center">
                {isLast ? (
                  <span
                    aria-current="page"
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--ds-text-primary,#e5e7eb)]"
                  >
                    {item.icon && (
                      <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                    )}
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href || '#'}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-medium',
                      'text-[var(--ds-text-tertiary,#9ca3af)]',
                      'hover:text-[var(--ds-brand-primary,#08619d)]',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary,#08619d)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-primary,#111827)] focus-visible:rounded-md',
                    )}
                  >
                    {item.icon && (
                      <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                    )}
                    {item.label}
                  </a>
                )}
              </li>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumb, type BreadcrumbProps, type BreadcrumbItem }
