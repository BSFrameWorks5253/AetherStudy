import { useState, useEffect, useRef, useCallback } from 'react';
import { useStudyStore } from '../store/useStudyStore';

interface UseDebounceProgressOptions {
  pdfId: string;
  initialPage?: number;
  totalPages?: number;
  delayMs?: number;
}

interface UseDebounceProgressReturn {
  /** The immediate page number for snappy, instant UI rendering */
  displayPage: number;
  /** The debounced page number synced to persistent storage */
  debouncedPage: number;
  /** Direct page setter */
  setPage: (newPage: number) => void;
  /** Navigate to next page with bounds check */
  nextPage: () => void;
  /** Navigate to previous page with bounds check */
  prevPage: () => void;
  /** True while the user is rapidly flipping pages and the 500ms sync has not yet fired */
  isPendingSync: boolean;
}

/**
 * State-Saving Debouncer Hook
 * Prevents canvas lag and localStorage churn when students rapidly flip pages.
 * - Updates local UI state immediately (0ms lag).
 * - Debounces writes to Zustand store & localStorage by 500ms.
 */
export const useDebounceProgress = ({
  pdfId,
  initialPage = 1,
  totalPages = 999,
  delayMs = 500,
}: UseDebounceProgressOptions): UseDebounceProgressReturn => {
  const updatePageProgress = useStudyStore((state) => state.updatePageProgress);
  const getPageProgress = useStudyStore((state) => state.getPageProgress);

  // Initialize from Zustand store if available, else initialPage
  const [displayPage, setDisplayPage] = useState<number>(() => {
    if (pdfId) {
      const stored = getPageProgress(pdfId);
      if (stored && stored > 0) return stored;
    }
    return initialPage > 0 ? initialPage : 1;
  });

  const [debouncedPage, setDebouncedPage] = useState<number>(displayPage);
  const [isPendingSync, setIsPendingSync] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep displayPage in sync when pdfId changes
  useEffect(() => {
    if (!pdfId) return;
    const stored = getPageProgress(pdfId);
    const target = stored && stored > 0 ? stored : (initialPage > 0 ? initialPage : 1);
    setDisplayPage(target);
    setDebouncedPage(target);
    setIsPendingSync(false);
  }, [pdfId, initialPage, getPageProgress]);

  // Debounce sync logic
  useEffect(() => {
    if (!pdfId) return;

    setIsPendingSync(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedPage(displayPage);
      updatePageProgress(pdfId, displayPage);
      setIsPendingSync(false);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [displayPage, pdfId, delayMs, updatePageProgress]);

  const setPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages > 0 ? totalPages : 999));
      setDisplayPage(clamped);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    setDisplayPage((prev) => Math.min(prev + 1, totalPages > 0 ? totalPages : prev + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setDisplayPage((prev) => Math.max(1, prev - 1));
  }, []);

  return {
    displayPage,
    debouncedPage,
    setPage,
    nextPage,
    prevPage,
    isPendingSync,
  };
};

export default useDebounceProgress;
