import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useLocalStorage
 * A robust, typed React hook that synchronizes state with window.localStorage.
 * Features:
 * - Error resilient (falls back smoothly if storage quota exceeded or disabled)
 * - Auto-sync across multiple windows/tabs via storage event listener
 * - Functional updates support: setValue((prev) => next)
 * - Returns a boolean save status flag for showing auto-save indicator in UI
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const saveTimeoutRef = useRef<number | null>(null);

  // Read initial stored value safely
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((current) => {
          const valueToStore = value instanceof Function ? value(current) : value;

          if (typeof window !== 'undefined') {
            setIsSaving(true);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));

            if (saveTimeoutRef.current) {
              window.clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = window.setTimeout(() => {
              setIsSaving(false);
            }, 600);
          }

          return valueToStore;
        });
      } catch (error) {
        console.error(`[useLocalStorage] Error setting key "${key}":`, error);
      }
    },
    [key]
  );

  // Synchronize across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`[useLocalStorage] Storage sync error for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [key]);

  return [storedValue, setValue, isSaving];
}
