import { getUserStorageKey } from '../utils/userStorage';
import { readingMemory, getCanonicalDocKey } from './readingMemory';

export interface RecentDocument {
  id: string;
  name: string;
  originalName?: string;
  subject: string;
  standard?: string;
  category?: 'textbook' | 'notes';
  chapterNumber?: string;
  chapterTitle?: string;
  streamUrl?: string;
  serverUrl?: string;
  url?: string;
  lastViewedAt: string;
  currentPage?: number;
  numPages?: number;
  percent?: number;
}

const STORAGE_KEY = 'aether_recent_documents_v1';

export class RecentDocumentsService {
  private static getKey(): string {
    return getUserStorageKey(STORAGE_KEY);
  }

  public static getRecentDocuments(): RecentDocument[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = this.getKey();
      const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY);
      let list: RecentDocument[] = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(list)) list = [];

      // Enrich with latest readingMemory progress
      const allProgress = readingMemory.getAllProgress();
      list = list.map((doc) => {
        const canonicalKey = getCanonicalDocKey(
          doc.streamUrl || doc.serverUrl || doc.url || '',
          doc.name || doc.originalName
        );
        const progress = allProgress[canonicalKey];
        if (progress) {
          return {
            ...doc,
            currentPage: progress.currentPage,
            numPages: progress.numPages,
            percent: progress.percent,
            lastViewedAt: progress.lastReadAt || doc.lastViewedAt,
          };
        }
        return doc;
      });

      // Sort descending by most recent
      list.sort(
        (a, b) =>
          new Date(b.lastViewedAt || 0).getTime() -
          new Date(a.lastViewedAt || 0).getTime()
      );

      return list;
    } catch (err) {
      console.warn('[RecentDocuments] Failed to load recents:', err);
      return [];
    }
  }

  public static addRecentDocument(
    doc: Partial<RecentDocument> & { name: string; subject: string }
  ): void {
    if (typeof window === 'undefined' || !doc || !doc.name) return;
    try {
      const existing = this.getRecentDocuments();
      const docUrl = doc.streamUrl || doc.serverUrl || doc.url || '';
      const docNameLower = doc.name.trim().toLowerCase();
      const filtered = existing.filter((item) => {
        if (doc.id && item.id === doc.id) return false;
        if (item.name.trim().toLowerCase() === docNameLower) return false;
        if (docUrl && (item.streamUrl === docUrl || item.serverUrl === docUrl || item.url === docUrl)) {
          return false;
        }
        return true;
      });

      const canonicalKey = getCanonicalDocKey(docUrl, doc.name);
      const progress = readingMemory.getProgress(canonicalKey);

      const newItem: RecentDocument = {
        id: doc.id || `doc-recent-${Date.now()}`,
        name: doc.name,
        originalName: doc.originalName || doc.name,
        subject: doc.subject,
        standard: doc.standard || '12',
        category: doc.category || 'notes',
        chapterNumber: doc.chapterNumber || '',
        chapterTitle: doc.chapterTitle || '',
        streamUrl: doc.streamUrl || '',
        serverUrl: doc.serverUrl || '',
        url: doc.url || '',
        lastViewedAt: new Date().toISOString(),
        currentPage: progress?.currentPage || doc.currentPage || 1,
        numPages: progress?.numPages || doc.numPages || 1,
        percent: progress?.percent || doc.percent || 0,
      };

      const updated = [newItem, ...filtered].slice(0, 25);
      const key = this.getKey();
      localStorage.setItem(key, JSON.stringify(updated));

      window.dispatchEvent(
        new CustomEvent('aether-recents-updated', { detail: updated })
      );
    } catch (err) {
      console.warn('[RecentDocuments] Failed to record recent:', err);
    }
  }

  public static removeRecentDocument(idOrName: string): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getRecentDocuments();
      const updated = existing.filter(
        (d) => d.id !== idOrName && d.name !== idOrName
      );
      const key = this.getKey();
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('aether-recents-updated', { detail: updated })
      );
    } catch (err) {
      console.warn('[RecentDocuments] Failed to remove recent:', err);
    }
  }

  public static clearRecentDocuments(): void {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getKey();
      localStorage.removeItem(key);
      window.dispatchEvent(
        new CustomEvent('aether-recents-updated', { detail: [] })
      );
    } catch (err) {
      console.warn('[RecentDocuments] Failed to clear recents:', err);
    }
  }
}

export const recentDocuments = RecentDocumentsService;
