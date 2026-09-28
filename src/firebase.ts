import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase
// En un entorno real, estas variables vendrían de import.meta.env
import { getFunctions } from 'firebase/functions';

const env = (import.meta as any).env || process.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyKeyForTestingPurposes1234567',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-app.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-app',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-app.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
let analyticsInstance: any = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (err) {
    console.warn("Firebase Analytics could not be initialized:", err);
  }
}
export const analytics = analyticsInstance;
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
