import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp as firestoreServerTimestamp,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { TimeSlot } from '../types/timetable';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCtVCt0Ai88DXOlLTJPBVNRfZF3TxruuFY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edu-tracker-7b77e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edu-tracker-7b77e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edu-tracker-7b77e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '662568204755',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:662568204755:web:237b84f0dd6e787dc8d726',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://edu-tracker-7b77e-default-rtdb.firebaseio.com',
};

// Initialize Firebase App (Singleton Pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Core Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

/**
 * Ensures a valid Firebase Auth session exists.
 * Falls back to anonymous sign-in so security rules checking `request.auth != null` succeed seamlessly.
 */
let authInitPromise: Promise<User | null> | null = null;
export async function ensureFirebaseAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          resolve(user);
        } else {
          signInAnonymously(auth)
            .then((credential) => resolve(credential.user))
            .catch((err) => {
              console.warn('[Firebase Auth] Anonymous sign-in failed (continuing with offline/public mode):', err?.message || err);
              resolve(null);
            });
        }
      });
    });
  }
  return authInitPromise;
}

/**
 * Resolves a safe, consistent key for cloud synchronization.
 * If student is logged in, sanitizes their email.
 * If guest/unregistered, returns or generates a persistent device UUID.
 */
export function getSyncUserKey(): string {
  try {
    const userRaw = localStorage.getItem('aetherstudy_user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.email) {
        return 'user_' + user.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
    }
  } catch {}

  try {
    let deviceId = localStorage.getItem('aetherstudy_device_sync_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('aetherstudy_device_sync_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'default_student_session';
  }
}

/**
 * =========================================================================
 * 1. REALTIME & FIRESTORE TIMETABLE CLOUD ENGINE
 * =========================================================================
 * Features:
 * - Sub-second bi-directional sync via Firebase Realtime Database
 * - Structured backup & indexing in Firestore
 * - Resilient offline localStorage persistence
 */
export const firebaseTimetable = {
  /**
   * Subscribe to real-time timetable updates across tabs and devices.
   */
  subscribe(
    onUpdate: (slots: TimeSlot[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const userKey = getSyncUserKey();
    const rtdbRef = ref(rtdb, `timetables/${userKey}`);

    let hasReceivedRtdb = false;

    // 1. Subscribe to Firebase Realtime Database
    const unsubscribeRtdb = onValue(
      rtdbRef,
      (snapshot) => {
        const val = snapshot.val();
        if (Array.isArray(val) && val.length > 0) {
          hasReceivedRtdb = true;
          try {
            localStorage.setItem('aether_user_timetable', JSON.stringify(val));
          } catch {}
          onUpdate(val);
        }
      },
      (err) => {
        console.warn('[Firebase RTDB Timetable] Listener note:', err?.message || err);
        if (onError) onError(err);
      }
    );

    // 2. Secondary Firestore Listener as fallback / dual-stream
    const firestoreDocRef = doc(db, 'timetables', userKey);
    const unsubscribeFirestore = onSnapshot(
      firestoreDocRef,
      (snap) => {
        if (!hasReceivedRtdb && snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.slots) && data.slots.length > 0) {
            try {
              localStorage.setItem('aether_user_timetable', JSON.stringify(data.slots));
            } catch {}
            onUpdate(data.slots);
          }
        }
      },
      (err) => {
        console.warn('[Firebase Firestore Timetable] Listener note:', err?.message || err);
      }
    );

    // Return unsubscriber function
    return () => {
      try {
        unsubscribeRtdb();
      } catch {}
      try {
        unsubscribeFirestore();
      } catch {}
    };
  },

  /**
   * Save timetable to both Realtime Database and Firestore simultaneously.
   */
  async save(slots: TimeSlot[]): Promise<{ success: boolean; cloud: boolean }> {
    // 1. Synchronously save to local storage first (instant client responsiveness)
    try {
      localStorage.setItem('aether_user_timetable', JSON.stringify(slots));
    } catch {}

    const userKey = getSyncUserKey();
    let cloudSaved = false;

    // 2. Write to Firebase Realtime Database
    try {
      await ensureFirebaseAuth();
      const rtdbRef = ref(rtdb, `timetables/${userKey}`);
      await set(rtdbRef, slots);
      cloudSaved = true;
    } catch (rtdbErr) {
      console.warn('[Firebase RTDB Save Warning]:', rtdbErr);
    }

    // 3. Write to Firestore
    try {
      const docRef = doc(db, 'timetables', userKey);
      await setDoc(
        docRef,
        {
          slots,
          updatedAt: new Date().toISOString(),
          deviceKey: userKey,
        },
        { merge: true }
      );
      cloudSaved = true;
    } catch (firestoreErr) {
      console.warn('[Firebase Firestore Save Warning]:', firestoreErr);
    }

    return { success: true, cloud: cloudSaved };
  },

  /**
   * Fetch current timetable from Realtime Database or Firestore.
   */
  async fetch(): Promise<TimeSlot[] | null> {
    const userKey = getSyncUserKey();

    // 1. Try Realtime Database
    try {
      const rtdbRef = ref(rtdb, `timetables/${userKey}`);
      const snap = await get(rtdbRef);
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val) && val.length > 0) {
          try {
            localStorage.setItem('aether_user_timetable', JSON.stringify(val));
          } catch {}
          return val;
        }
      }
    } catch (err) {
      console.warn('[Firebase RTDB Fetch]:', err);
    }

    // 2. Try Firestore
    try {
      const docRef = doc(db, 'timetables', userKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.slots) && data.slots.length > 0) {
          try {
            localStorage.setItem('aether_user_timetable', JSON.stringify(data.slots));
          } catch {}
          return data.slots;
        }
      }
    } catch (err) {
      console.warn('[Firebase Firestore Fetch]:', err);
    }

    // 3. Try LocalStorage
    try {
      const local = localStorage.getItem('aether_user_timetable');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return null;
  },
};

/**
 * =========================================================================
 * 2. PAPER REQUESTS CLOUD DISPATCHER & REALTIME FEED
 * =========================================================================
 * Records missing study paper requests into Firestore & Realtime Database,
 * allowing instant alerts for Super Admins.
 */
export const firebasePaperRequests = {
  async submit(data: {
    email: string;
    subject: string;
    year: string;
    notes: string;
  }): Promise<{ success: boolean; cloud: boolean; id: string }> {
    const payload = {
      ...data,
      email: data.email.trim().toLowerCase(),
      submittedAt: new Date().toISOString(),
      timestamp: Date.now(),
      status: 'pending',
      deviceKey: getSyncUserKey(),
    };

    let generatedId = 'req_' + Date.now();
    let cloudSuccess = false;

    // 1. Always persist in localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('aetherstudy_paper_requests') || '[]');
      stored.unshift(payload);
      localStorage.setItem('aetherstudy_paper_requests', JSON.stringify(stored));
    } catch {}

    // 2. Write to Firestore Collection
    try {
      await ensureFirebaseAuth();
      const docRef = await addDoc(collection(db, 'paper_requests'), {
        ...payload,
        createdAt: firestoreServerTimestamp(),
      });
      generatedId = docRef.id;
      cloudSuccess = true;
    } catch (err) {
      console.warn('[Firebase Firestore Paper Request Warning]:', err);
    }

    // 3. Write to Realtime Database Feed
    try {
      const rtdbFeedRef = ref(rtdb, 'paper_requests');
      await push(rtdbFeedRef, {
        ...payload,
        id: generatedId,
        serverTime: rtdbServerTimestamp(),
      });
      cloudSuccess = true;
    } catch (err) {
      console.warn('[Firebase RTDB Paper Request Warning]:', err);
    }

    return { success: true, cloud: cloudSuccess, id: generatedId };
  },

  /**
   * Listen to all incoming paper requests in real-time (for Admin Dashboard).
   */
  subscribe(onUpdate: (requests: any[]) => void): () => void {
    const rtdbRef = ref(rtdb, 'paper_requests');
    const unsubscribeRtdb = onValue(
      rtdbRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const list = Object.keys(val).map((k) => ({
            id: k,
            ...val[k],
          }));
          list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('[Firebase RTDB Paper Requests Listener]:', err);
      }
    );

    return () => {
      try {
        unsubscribeRtdb();
      } catch {}
    };
  },
};

/**
 * =========================================================================
 * 3. STUDY PROGRESS & BOOKMARKS CLOUD SYNC
 * =========================================================================
 */
export const firebaseStudyProgress = {
  async sync(data: {
    openedPapers?: string[];
    completedPapers?: string[];
    pdfProgress?: Record<string, number>;
    bookmarks?: any[];
  }): Promise<void> {
    const userKey = getSyncUserKey();
    const payload = {
      ...data,
      lastActive: new Date().toISOString(),
    };

    try {
      await ensureFirebaseAuth();
      // RTDB sync
      const rtdbRef = ref(rtdb, `study_progress/${userKey}`);
      await set(rtdbRef, payload);
      // Firestore sync
      const docRef = doc(db, 'study_progress', userKey);
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.warn('[Firebase Study Progress Sync]:', err);
    }
  },

  async fetch(): Promise<any | null> {
    const userKey = getSyncUserKey();
    try {
      const rtdbRef = ref(rtdb, `study_progress/${userKey}`);
      const snap = await get(rtdbRef);
      if (snap.exists()) {
        return snap.val();
      }
    } catch {}

    try {
      const docRef = doc(db, 'study_progress', userKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch {}

    return null;
  },
};

/**
 * =========================================================================
 * 4. REALTIME ACTIVE STUDENTS LIVE PRESENCE
 * =========================================================================
 * Shows live social proof counter ("🟢 38 HSC Students Active Now").
 */
export const firebasePresence = {
  start(): () => void {
    const userKey = getSyncUserKey();
    const myConnectionsRef = ref(rtdb, `presence/${userKey}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(myConnectionsRef).remove();
        set(myConnectionsRef, {
          active: true,
          timestamp: rtdbServerTimestamp(),
        }).catch(() => {});
      }
    });

    return () => {
      try {
        unsubscribe();
        set(myConnectionsRef, null).catch(() => {});
      } catch {}
    };
  },

  subscribeActiveCount(callback: (count: number) => void): () => void {
    const presenceRef = ref(rtdb, 'presence');
    const unsubscribe = onValue(
      presenceRef,
      (snap) => {
        const val = snap.val();
        let count = 0;
        if (val && typeof val === 'object') {
          count = Object.keys(val).length;
        }
        // Baseline social proof: ensure at least active user is shown
        callback(Math.max(1, count));
      },
      () => {
        callback(1);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  },
};

/**
 * =========================================================================
 * 5. REALTIME ANNOUNCEMENTS & NOTIFICATIONS
 * =========================================================================
 */
export const firebaseNotifications = {
  subscribe(callback: (notifs: any[]) => void): () => void {
    const rtdbRef = ref(rtdb, 'notifications');
    const unsubscribe = onValue(
      rtdbRef,
      (snap) => {
        const val = snap.val();
        if (val && typeof val === 'object') {
          const list = Object.keys(val).map((k) => ({
            id: k,
            ...val[k],
          }));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          callback(list);
        }
      },
      (err) => {
        console.warn('[Firebase RTDB Notifications]:', err);
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  },

  async publish(notif: any): Promise<boolean> {
    try {
      await ensureFirebaseAuth();
      const rtdbRef = ref(rtdb, 'notifications');
      await push(rtdbRef, notif);

      await addDoc(collection(db, 'notifications'), {
        ...notif,
        createdAt: firestoreServerTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn('[Firebase Publish Notification]:', err);
      return false;
    }
  },
};

export default app;
