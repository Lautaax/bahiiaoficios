import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Configuración de Firebase
// En un entorno real, estas variables vendrían de import.meta.env
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBw6Mdc7qCuEkelg_1JavfVyzVMIUWbaRY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bahia-oficios.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bahia-oficios",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bahia-oficios.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "706869743317",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:706869743317:web:39a0ab8258f4a8da8c9c5c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M1H268QKEP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
