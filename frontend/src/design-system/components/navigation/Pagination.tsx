import type React from 'react'
import { useMemo, useCallback } from 'react'
import { cn } from '@/utils/cn'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  siblingCount?: number
  className?: string
}

const ChevronLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)

const ChevronRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ChevronDoubleLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </svg>
)

const ChevronDoubleRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden="true"
  >
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </svg>
)

const Ellipsis = () => (
  <span className="flex items-center justify-center size-8 text-[var(--ds-text-tertiary,#9ca3af)]">
    ...
  </span>
)

function generatePaginationRange(currentPage: number, totalPages: number, siblingCount: number) {
  const totalVisible = siblingCount * 2 + 5

  if (totalPages <= totalVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblingCount }, (_, i) => i + 1)
    return [...leftRange, 'ellipsis-right', totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblingCount },
      (_, i) => totalPages - (3 + 2 * siblingCount) + i + 1,
    )
    return [1, 'ellipsis-left', ...rightRange]
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  )
  return [1, 'ellipsis-left', ...middleRange, 'ellipsis-right', totalPages]
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  showFirstLast = false,
  siblingCount = 1,
  className,
}) => {
  const pages = useMemo(
    () => generatePaginationRange(page, totalPages, siblingCount),
    [page, totalPages, siblingCount],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (page > 1) onPageChange(page - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          if (page < totalPages) onPageChange(page + 1)
          break
        case 'Home':
          e.preventDefault()
          onPageChange(1)
          break
        case 'End':
          e.preventDefault()
          onPageChange(totalPages)
          break
      }
    },
    [page, totalPages, onPageChange],
  )

  if (totalPages <= 1) return null

  const buttonBase = cn(
    'inline-flex items-center justify-center rounded-md',
    'text-sm font-medium',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary,#6366f1)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-bg-primary,#111827)]',
    'disabled:pointer-events-none disabled:opacity-50',
  )

  return (
    <nav
      aria-label="Pagination"
      role="navigation"
      onKeyDown={handleKeyDown}
      className={cn('flex items-center gap-1', className)}
    >
      {showFirstLast && (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="Go to first page"
          className={cn(
            buttonBase,
            'size-8',
            'text-[var(--ds-text-tertiary,#9ca3af)]',
            'hover:bg-[var(--ds-bg-secondary,#1f2937)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
          )}
        >
          <ChevronDoubleLeft />
        </button>
      )}

      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Go to previous page"
        className={cn(
          buttonBase,
          'size-8',
          'text-[var(--ds-text-tertiary,#9ca3af)]',
          'hover:bg-[var(--ds-bg-secondary,#1f2937)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
        )}
      >
        <ChevronLeft />
      </button>

      {pages.map((pageNum, _index) => {
        if (typeof pageNum === 'string') {
          return <Ellipsis key={pageNum} />
        }

        const isActive = pageNum === page

        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${pageNum}`}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              buttonBase,
              'size-8',
              isActive
                ? 'bg-[var(--ds-brand-primary,#6366f1)] text-white shadow-sm'
                : 'text-[var(--ds-text-tertiary,#9ca3af)] hover:bg-[var(--ds-bg-secondary,#1f2937)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
            )}
          >
            {pageNum}
          </button>
        )
      })}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Go to next page"
        className={cn(
          buttonBase,
          'size-8',
          'text-[var(--ds-text-tertiary,#9ca3af)]',
          'hover:bg-[var(--ds-bg-secondary,#1f2937)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
        )}
      >
        <ChevronRight />
      </button>

      {showFirstLast && (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Go to last page"
          className={cn(
            buttonBase,
            'size-8',
            'text-[var(--ds-text-tertiary,#9ca3af)]',
            'hover:bg-[var(--ds-bg-secondary,#1f2937)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
          )}
        >
          <ChevronDoubleRight />
        </button>
      )}
    </nav>
  )
}

export { Pagination, type PaginationProps }
