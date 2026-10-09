import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { firebaseStudyProgress } from '../services/firebase';

export interface StudyBookmark {
  pdfId: string;
  page: number;
  note: string;
  timestamp?: string;
}

export interface StudyStoreState {
  // 1. Persistent State Elements
  openedPapers: string[];
  completedPapers: string[];
  pdfProgress: Record<string, number>;
  bookmarks: StudyBookmark[];

  // 2. Explicit Actions
  markAsOpened: (id: string) => void;
  toggleComplete: (id: string) => void;
  updatePageProgress: (id: string, page: number) => void;
  addBookmark: (id: string, page: number, note: string) => void;
  removeBookmark: (id: string, page: number) => void;

  // 3. Convenience Selectors
  isOpened: (id: string) => boolean;
  isCompleted: (id: string) => boolean;
  getPageProgress: (id: string) => number;
  getBookmarksForPdf: (id: string) => StudyBookmark[];
  isBookmarked: (id: string, page: number) => boolean;
  resetProgress: (id: string) => void;
}

/**
 * Global Persistent Study Store (Zustand + localStorage)
 * Guarantees zero state loss across browser reloads, route switches,
 * and Vercel serverless sessions.
 */
export const useStudyStore = create<StudyStoreState>()(
  persist(
    (set, get) => ({
      openedPapers: [],
      completedPapers: [],
      pdfProgress: {},
      bookmarks: [],

      markAsOpened: (id: string) => {
        if (!id) return;
        set((state) => {
          if (state.openedPapers.includes(id)) return state;
          return { openedPapers: [...state.openedPapers, id] };
        });
      },

      toggleComplete: (id: string) => {
        if (!id) return;
        set((state) => {
          const isDone = state.completedPapers.includes(id);
          return {
            completedPapers: isDone
              ? state.completedPapers.filter((p) => p !== id)
              : [...state.completedPapers, id],
          };
        });
      },

      updatePageProgress: (id: string, page: number) => {
        if (!id || page < 1) return;
        set((state) => ({
          pdfProgress: {
            ...state.pdfProgress,
            [id]: page,
          },
        }));
      },

      addBookmark: (id: string, page: number, note: string) => {
        if (!id || page < 1) return;
        set((state) => {
          const filtered = state.bookmarks.filter(
            (b) => !(b.pdfId === id && b.page === page)
          );
          return {
            bookmarks: [
              ...filtered,
              {
                pdfId: id,
                page,
                note: note.trim() || `Bookmark on Page ${page}`,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        });
      },

      removeBookmark: (id: string, page: number) => {
        if (!id) return;
        set((state) => ({
          bookmarks: state.bookmarks.filter(
            (b) => !(b.pdfId === id && b.page === page)
          ),
        }));
      },

      isOpened: (id: string) => {
        return get().openedPapers.includes(id);
      },

      isCompleted: (id: string) => {
        return get().completedPapers.includes(id);
      },

      getPageProgress: (id: string) => {
        return get().pdfProgress[id] || 1;
      },

      getBookmarksForPdf: (id: string) => {
        return get().bookmarks.filter((b) => b.pdfId === id);
      },

      isBookmarked: (id: string, page: number) => {
        return get().bookmarks.some(
          (b) => b.pdfId === id && b.page === page
        );
      },

      resetProgress: (id: string) => {
        set((state) => {
          const nextProgress = { ...state.pdfProgress };
          delete nextProgress[id];
          return {
            pdfProgress: nextProgress,
            completedPapers: state.completedPapers.filter((p) => p !== id),
            bookmarks: state.bookmarks.filter((b) => b.pdfId !== id),
          };
        });
      },
    }),
    {
      name: 'aetherstudy-vault-store-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Cloud State Synchronization with Firebase Realtime Database & Firestore
let cloudSyncTimer: any = null;
if (typeof window !== 'undefined') {
  useStudyStore.subscribe((state) => {
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      firebaseStudyProgress.sync({
        openedPapers: state.openedPapers,
        completedPapers: state.completedPapers,
        pdfProgress: state.pdfProgress,
        bookmarks: state.bookmarks,
      }).catch(() => {});
    }, 1200);
  });

  // Pull initial progress from cloud if available
  setTimeout(() => {
    firebaseStudyProgress.fetch().then((cloudData) => {
      if (cloudData && typeof cloudData === 'object') {
        useStudyStore.setState((prev) => ({
          openedPapers: Array.from(new Set([...prev.openedPapers, ...(cloudData.openedPapers || [])])),
          completedPapers: Array.from(new Set([...prev.completedPapers, ...(cloudData.completedPapers || [])])),
          pdfProgress: { ...(cloudData.pdfProgress || {}), ...prev.pdfProgress },
          bookmarks: [
            ...(cloudData.bookmarks || []),
            ...prev.bookmarks.filter(
              (b) => !(cloudData.bookmarks || []).some((cb: any) => cb.pdfId === b.pdfId && cb.page === b.page)
            ),
          ],
        }));
      }
    }).catch(() => {});
  }, 500);
}
