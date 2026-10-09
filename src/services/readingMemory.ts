/**
 * Reading Memory & Bookmarks Service
 * Persists last-read page, scroll progress, and custom bookmarks
 * with local-first storage and automatic cloud synchronization.
 */

export interface ReadingProgress {
  docKey: string;
  title: string;
  currentPage: number;
  numPages: number;
  percent: number;
  lastReadAt: string;
}

export interface DocBookmark {
  id: string;
  docKey: string;
  page: number;
  title?: string;
  note?: string;
  createdAt: string;
}

const STORAGE_KEY_PROGRESS = 'aether_reading_progress_v1';
const STORAGE_KEY_BOOKMARKS = 'aether_bookmarks_v1';

// Generate a clean, deterministic doc key
export const getCanonicalDocKey = (url: string, title?: string): string => {
  if (!url) return title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'unknown_doc';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    const filename = parts[parts.length - 1] || 'doc';
    return decodeURIComponent(filename).toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  } catch {
    return url.replace(/[^a-z0-9_.-]/g, '_');
  }
};

class ReadingMemoryService {
  private progressCache: Map<string, ReadingProgress> = new Map();
  private bookmarksCache: Map<string, DocBookmark[]> = new Map();
  private isInitialized = false;

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    try {
      const rawProg = localStorage.getItem(STORAGE_KEY_PROGRESS);
      if (rawProg) {
        const parsed = JSON.parse(rawProg);
        Object.entries(parsed).forEach(([k, v]) => {
          this.progressCache.set(k, v as ReadingProgress);
        });
      }

      const rawBm = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
      if (rawBm) {
        const parsed = JSON.parse(rawBm);
        Object.entries(parsed).forEach(([k, v]) => {
          this.bookmarksCache.set(k, v as DocBookmark[]);
        });
      }
    } catch (e) {
      console.warn('Failed to initialize ReadingMemory from localStorage:', e);
    }
    this.isInitialized = true;
  }

  private persistProgress() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, ReadingProgress> = {};
      this.progressCache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist reading progress:', e);
    }
  }

  private persistBookmarks() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, DocBookmark[]> = {};
      this.bookmarksCache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist bookmarks:', e);
    }
  }

  public getProgress(docKey: string): ReadingProgress | null {
    this.init();
    return this.progressCache.get(docKey) || null;
  }

  public getAllProgress(): Record<string, ReadingProgress> {
    this.init();
    const result: Record<string, ReadingProgress> = {};
    this.progressCache.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  }

  public saveProgress(
    docKey: string,
    title: string,
    currentPage: number,
    numPages: number
  ): ReadingProgress {
    this.init();
    const validTotal = Math.max(numPages, 1);
    const validPage = Math.min(Math.max(currentPage, 1), validTotal);
    const percent = Math.round((validPage / validTotal) * 100);

    const progress: ReadingProgress = {
      docKey,
      title,
      currentPage: validPage,
      numPages: validTotal,
      percent,
      lastReadAt: new Date().toISOString(),
    };

    this.progressCache.set(docKey, progress);
    this.persistProgress();

    // Trigger local storage event for reactive UI updates across tabs/components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aether-reading-progress-updated', {
          detail: progress,
        })
      );
    }

    // Background sync to server if available
    this.syncProgressToCloud(progress).catch(() => {});

    return progress;
  }

  public getBookmarks(docKey: string): DocBookmark[] {
    this.init();
    return this.bookmarksCache.get(docKey) || [];
  }

  public addBookmark(
    docKey: string,
    page: number,
    title?: string,
    note?: string
  ): DocBookmark {
    this.init();
    const list = this.getBookmarks(docKey);
    const existing = list.find((b) => b.page === page);
    if (existing) {
      existing.title = title || existing.title;
      existing.note = note || existing.note;
      this.persistBookmarks();
      return existing;
    }

    const newBookmark: DocBookmark = {
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      docKey,
      page,
      title: title || `Page ${page}`,
      note: note || '',
      createdAt: new Date().toISOString(),
    };

    list.push(newBookmark);
    list.sort((a, b) => a.page - b.page);
    this.bookmarksCache.set(docKey, list);
    this.persistBookmarks();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aether-bookmarks-updated', {
          detail: { docKey, bookmarks: list },
        })
      );
    }

    this.syncBookmarksToCloud(docKey, list).catch(() => {});

    return newBookmark;
  }

  public removeBookmark(docKey: string, page: number): void {
    this.init();
    const list = this.getBookmarks(docKey);
    const filtered = list.filter((b) => b.page !== page);
    this.bookmarksCache.set(docKey, filtered);
    this.persistBookmarks();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aether-bookmarks-updated', {
          detail: { docKey, bookmarks: filtered },
        })
      );
    }

    this.syncBookmarksToCloud(docKey, filtered).catch(() => {});
  }

  public isBookmarked(docKey: string, page: number): boolean {
    const list = this.getBookmarks(docKey);
    return list.some((b) => b.page === page);
  }

  // Cloud Synchronization
  private async syncProgressToCloud(progress: ReadingProgress): Promise<void> {
    try {
      const user = localStorage.getItem('aether_user');
      const email = user ? JSON.parse(user).email : 'guest@aetherstudy.internal';

      await fetch('/api/user/reading-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          action: 'SAVE_PROGRESS',
          progress,
        }),
      });
    } catch {
      // Offline fallback silent
    }
  }

  private async syncBookmarksToCloud(docKey: string, bookmarks: DocBookmark[]): Promise<void> {
    try {
      const user = localStorage.getItem('aether_user');
      const email = user ? JSON.parse(user).email : 'guest@aetherstudy.internal';

      await fetch('/api/user/reading-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          action: 'SAVE_BOOKMARKS',
          docKey,
          bookmarks,
        }),
      });
    } catch {
      // Offline fallback silent
    }
  }
}

export const readingMemory = new ReadingMemoryService();
