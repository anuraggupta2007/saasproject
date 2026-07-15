import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

// ─── Debounce ────────────────────────────────────────────────────────────────

export function useDebounceFn<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
}

// ─── Throttle ────────────────────────────────────────────────────────────────

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => { inThrottle.current = false; }, limit);
      }
    },
    [callback, limit]
  );
}

// ─── Click Outside ───────────────────────────────────────────────────────────

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const handleClick = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      handlerRef.current();
    }
  }, [ref]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handlerRef.current();
  }, []);

  const attach = useCallback(() => {
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
  }, [handleClick, handleKeyDown]);

  const detach = useCallback(() => {
    document.removeEventListener('mousedown', handleClick);
    document.removeEventListener('keydown', handleKeyDown);
  }, [handleClick, handleKeyDown]);

  return { attach, detach };
}

// ─── Clipboard Util ──────────────────────────────────────────────────────────

export function useClipboardUtil() {
  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }, []);

  return { copy };
}

// ─── Window Size Util ────────────────────────────────────────────────────────

export function useWindowSizeUtil() {
  const getSize = () => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  return getSize();
}

// ─── Local Storage Util ──────────────────────────────────────────────────────

export function useLocalStorageUtil<T>(key: string, initialValue: T) {
  const getStoredValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const storedRef = useRef<T>(getStoredValue());

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedRef.current) : value;
    storedRef.current = valueToStore;
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  }, [key]);

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    storedRef.current = initialValue;
  }, [key, initialValue]);

  return { value: storedRef.current, setValue, removeValue };
}

// ─── Online Status ───────────────────────────────────────────────────────────

export function useOnlineStatus() {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

// ─── Media Query ─────────────────────────────────────────────────────────────

export function useMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia(query);
  return mql.matches;
}
