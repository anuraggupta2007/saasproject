import { useEffect, useState, useRef, useCallback } from 'react'

interface UseInViewOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

interface UseInViewReturn {
  ref: React.RefCallback<Element>
  isInView: boolean
}

export function useInView({
  threshold = 0,
  rootMargin = '0px',
  triggerOnce = false,
}: UseInViewOptions = {}): UseInViewReturn {
  const [isInView, setIsInView] = useState(false)
  const elementRef = useRef<Element | null>(null)
  const hasTriggered = useRef(false)

  const ref = useCallback(
    (node: Element | null) => {
      if (elementRef.current) {
        // Cleanup previous observer
        const observer = (elementRef.current as any).__inViewObserver
        if (observer) {
          observer.disconnect()
        }
      }

      elementRef.current = node

      if (!node) return

      if (triggerOnce && hasTriggered.current) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          const inView = entry.isIntersecting
          setIsInView(inView)

          if (inView && triggerOnce) {
            hasTriggered.current = true
            observer.disconnect()
          }
        },
        { threshold, rootMargin }
      )

      observer.observe(node)
      ;(node as any).__inViewObserver = observer
    },
    [threshold, rootMargin, triggerOnce]
  )

  useEffect(() => {
    return () => {
      if (elementRef.current) {
        const observer = (elementRef.current as any).__inViewObserver
        if (observer) {
          observer.disconnect()
        }
      }
    }
  }, [])

  return { ref, isInView }
}

interface UseReducedMotionReturn {
  prefersReducedMotion: boolean
}

export function useReducedMotion(): UseReducedMotionReturn {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return { prefersReducedMotion }
}

export function useStaggerDelay(index: number, staggerMs: number = 80): number {
  return index * (staggerMs / 1000)
}
