/**
 * User-Scoped Multi-Tenant Storage & Isolation Utility
 * Strictly partitions student data (Timetable, Syllabus Mastery, Chapter Progress, Bookmarks)
 * ensuring that data is saved per-user and never leaks between different student sessions.
 */

export function getCurrentUserEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('aetherstudy_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.email) return u.email.trim().toLowerCase();
    }
  } catch {}
  return null;
}

export function getCurrentUserKey(): string {
  const email = getCurrentUserEmail();
  if (email) {
    return 'u_' + email.replace(/[^a-z0-9]/g, '_');
  }
  return 'guest';
}

/**
 * Returns a partitioned storage key specific to the current logged-in user.
 * e.g. "aether_user_timetable__u_student_gmail_com"
 */
export function getUserStorageKey(baseKey: string, specificUserKey?: string): string {
  const userKey = specificUserKey || getCurrentUserKey();
  return `${baseKey}__${userKey}`;
}

/**
 * Reads a user-partitioned value from localStorage with a fallback.
 */
export function getUserStorageItem<T>(baseKey: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const key = getUserStorageKey(baseKey);
    const raw = localStorage.getItem(key);
    if (raw !== null && raw !== undefined) {
      return JSON.parse(raw);
    }
    // Backward compatibility: If no user-partitioned key exists yet, check legacy unpartitioned key
    const legacy = localStorage.getItem(baseKey);
    if (legacy !== null && legacy !== undefined) {
      const parsed = JSON.parse(legacy);
      // Migrate forward to user-partitioned key
      localStorage.setItem(key, legacy);
      return parsed;
    }
  } catch (err) {
    console.warn(`[userStorage] Failed to read ${baseKey}:`, err);
  }
  return fallback;
}

/**
 * Saves a user-partitioned value to localStorage.
 */
export function setUserStorageItem<T>(baseKey: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserStorageKey(baseKey);
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[userStorage] Failed to save ${baseKey}:`, err);
  }
}

/**
 * Removes a user-partitioned value from localStorage.
 */
export function removeUserStorageItem(baseKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getUserStorageKey(baseKey);
    localStorage.removeItem(key);
  } catch {}
}
