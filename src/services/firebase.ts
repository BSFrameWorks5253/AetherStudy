import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCtVCt0Ai88DXOlLTJPBVNRfZF3TxruuFY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "edu-tracker-7b77e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "edu-tracker-7b77e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "edu-tracker-7b77e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "662568204755",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:662568204755:web:237b84f0dd6e787dc8d726"
};

// Initialize Firebase (singleton pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
