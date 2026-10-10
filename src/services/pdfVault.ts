/**
 * AetherStudy High-Performance Local IndexedDB PDF Vault
 * Provides zero-latency, multi-gigabyte persistent storage for uploaded PDFs.
 * Eliminates upload timeouts, 4.5MB Vercel serverless limits, and hanging storage calls.
 */

const DB_NAME = 'AetherStudy_PDF_Vault';
const STORE_NAME = 'pdf_blobs';
const DB_VERSION = 1;

interface StoredPdf {
  id: string;
  name: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported in SSR'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// Memory cache of active Object URLs to avoid leaking memory while maintaining fast access
const activeBlobUrls = new Map<string, string>();

export const pdfVault = {
  /**
   * Store a PDF File/Blob in IndexedDB and return an active Object URL
   */
  async store(id: string, file: Blob, name: string): Promise<string> {
    try {
      const db = await getDb();
      const storedItem: StoredPdf = {
        id,
        name,
        blob: file,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(storedItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // Generate or retrieve object URL
      if (activeBlobUrls.has(id)) {
        try {
          URL.revokeObjectURL(activeBlobUrls.get(id)!);
        } catch {}
      }

      const blobUrl = URL.createObjectURL(file);
      activeBlobUrls.set(id, blobUrl);
      return blobUrl;
    } catch (err) {
      console.warn('[PDF Vault] Failed to store blob in IndexedDB, fallback to in-memory URL:', err);
      const fallbackUrl = URL.createObjectURL(file);
      activeBlobUrls.set(id, fallbackUrl);
      return fallbackUrl;
    }
  },

  /**
   * Retrieve an active Blob URL for a document ID or filename
   */
  async getUrl(idOrName: string): Promise<string | null> {
    if (!idOrName) return null;
    if (activeBlobUrls.has(idOrName)) {
      return activeBlobUrls.get(idOrName)!;
    }

    try {
      const db = await getDb();
      let item = await new Promise<StoredPdf | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(idOrName);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      // If not found by direct ID, scan for matching filename
      if (!item) {
        const cleanSearch = idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
        item = await new Promise<StoredPdf | null>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              const val: StoredPdf = cursor.value;
              const valNameClean = (val.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (
                valNameClean &&
                (valNameClean === cleanSearch ||
                  cleanSearch.includes(valNameClean) ||
                  valNameClean.includes(cleanSearch))
              ) {
                resolve(val);
                return;
              }
              cursor.continue();
            } else {
              resolve(null);
            }
          };
          cursorReq.onerror = () => resolve(null);
        });
      }

      if (item && item.blob) {
        const blobUrl = URL.createObjectURL(item.blob);
        activeBlobUrls.set(idOrName, blobUrl);
        activeBlobUrls.set(item.id, blobUrl);
        return blobUrl;
      }
      return null;
    } catch (err) {
      console.warn('[PDF Vault] Failed to read blob for ID/Name:', idOrName, err);
      return null;
    }
  },

  /**
   * Retrieve raw Blob for a document ID or filename
   */
  async getBlob(idOrName: string): Promise<Blob | null> {
    if (!idOrName) return null;
    try {
      const db = await getDb();
      let item = await new Promise<StoredPdf | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(idOrName);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (!item) {
        const cleanSearch = idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
        item = await new Promise<StoredPdf | null>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              const val: StoredPdf = cursor.value;
              const valNameClean = (val.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (
                valNameClean &&
                (valNameClean === cleanSearch ||
                  cleanSearch.includes(valNameClean) ||
                  valNameClean.includes(cleanSearch))
              ) {
                resolve(val);
                return;
              }
              cursor.continue();
            } else {
              resolve(null);
            }
          };
          cursorReq.onerror = () => resolve(null);
        });
      }

      return item?.blob || null;
    } catch (err) {
      console.warn('[PDF Vault] Failed to get blob for ID/Name:', idOrName, err);
      return null;
    }
  },

  /**
   * Check if a document is cached in the local IndexedDB vault
   */
  async has(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      return new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count(id);
        req.onsuccess = () => resolve(req.result > 0);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  /**
   * Delete a PDF from the vault
   */
  async delete(id: string): Promise<boolean> {
    if (activeBlobUrls.has(id)) {
      try {
        URL.revokeObjectURL(activeBlobUrls.get(id)!);
      } catch {}
      activeBlobUrls.delete(id);
    }

    try {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear all stored PDFs from the vault
   */
  async clearAll(): Promise<void> {
    activeBlobUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    activeBlobUrls.clear();

    try {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}
  },
};
