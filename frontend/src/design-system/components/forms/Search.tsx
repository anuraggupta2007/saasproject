import { forwardRef, useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'
import Input from './Input'
import type { InputProps } from './Input'

export interface SearchProps extends Omit<InputProps, 'type'> {
  onSearch?: (value: string) => void
  debounceMs?: number
}

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const Search = forwardRef<HTMLInputElement, SearchProps>(
  ({ onSearch, debounceMs = 300, value: controlledValue, onChange, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(controlledValue ?? '')
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue)
      }
    }, [controlledValue])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInternalValue(newValue)
      onChange?.(e)

      if (onSearch) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          onSearch(newValue)
        }, debounceMs)
      }
    }

    const handleClear = () => {
      setInternalValue('')
      onSearch?.('')
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(ref && typeof ref === 'object' ? ref.current : null, '')
        if (ref && typeof ref === 'object') {
          ref.current?.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    }

    const clearButton = internalValue ? (
      <button
        type="button"
        onClick={handleClear}
        className={cn(
          'pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 p-0.5',
          'text-[var(--ds-text-tertiary,#9ca3af)] hover:text-[var(--ds-text-primary,#e5e7eb)]',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-brand-primary,#08619d)] rounded'
        )}
        aria-label="Clear search"
        tabIndex={-1}
      >
        <XIcon className="size-4" />
      </button>
    ) : undefined

    return (
      <Input
        ref={ref}
        type="search"
        placeholder="Search..."
        value={internalValue}
        onChange={handleChange}
        leftIcon={<SearchIcon className="size-4" />}
        rightIcon={clearButton}
        className={className}
        {...props}
      />
    )
  }
)

Search.displayName = 'Search'

export default Search
