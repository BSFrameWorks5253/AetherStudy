import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useServerStorage
 * A robust, type-safe hook for syncing application state directly with the backend server.
 * Provides debounce saving, optimistic UI updates, and server health tracking.
 */
export function useServerStorage<T>(
  fetcher: () => Promise<T>,
  saver: (value: T) => Promise<unknown>,
  initialFallback: T,
  debounceMs: number = 800
): [T, (val: T | ((prev: T) => T)) => void, boolean, boolean] {
  const [data, setData] = useState<T>(initialFallback);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const debounceTimerRef = useRef<number | null>(null);

  // Initial fetch from server
  useEffect(() => {
    let isMounted = true;
    fetcher()
      .then((serverData) => {
        if (isMounted && serverData !== undefined && serverData !== null) {
          setData(serverData);
          setIsConnected(true);
        }
      })
      .catch((err) => {
        console.warn('[useServerStorage] Server fetch failed, using fallback:', err);
        if (isMounted) setIsConnected(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setData((prev) => {
        const nextValue = updater instanceof Function ? updater(prev) : updater;

        // Debounced save to server
        if (debounceTimerRef.current) {
          window.clearTimeout(debounceTimerRef.current);
        }

        setIsSaving(true);
        debounceTimerRef.current = window.setTimeout(async () => {
          try {
            await saver(nextValue);
            setIsConnected(true);
          } catch (err) {
            console.error('[useServerStorage] Error persisting to server:', err);
            setIsConnected(false);
          } finally {
            setIsSaving(false);
          }
        }, debounceMs);

        return nextValue;
      });
    },
    [saver, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return [data, updateData, isSaving, isConnected];
}
