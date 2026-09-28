import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';
import { checkAndExpireUserVip, isVipActive } from '../utils/vipUtils';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => {},
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore: () => void;
    console.log('[FirebaseAuth] Starting auth listener registration...');

    // Safety timeout: if onAuthStateChanged or Firestore listener hangs, don't leave the screen blank forever
    const safetyTimer = setTimeout(() => {
      console.warn('[FirebaseAuth] Safety timeout reached (2500ms). Forcing loading: false to ensure app renders.');
      setLoading(false);
    }, 2500);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      console.log('[FirebaseAuth] onAuthStateChanged fired:', firebaseUser ? `UID=${firebaseUser.uid} (${firebaseUser.email})` : 'No user');
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      
      if (firebaseUser) {
        // Immediate fallback so UI can render right away without blank screen
        setCurrentUser(prev => prev || {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          nombre: firebaseUser.displayName || 'Usuario',
          fotoUrl: firebaseUser.photoURL || '',
          rol: 'cliente',
          ciudad: 'Bahía Blanca',
          zona: 'Todas',
          isAdmin: firebaseUser.email === 'lautaroj.aguilera@gmail.com'
        });

        // Set up real-time listener for user document
        const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
        console.log(`[FirebaseAuth] Subscribing to Firestore document: usuarios/${firebaseUser.uid}`);
        
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
          clearTimeout(safetyTimer);
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data() as Omit<User, 'uid'>;
            const isSuperAdmin = firebaseUser.email === 'lautaroj.aguilera@gmail.com';

            try {
              if (userData.profesionalInfo?.isVip) {
                const active = isVipActive(userData.profesionalInfo);
                if (!active) {
                  checkAndExpireUserVip(firebaseUser.uid, userData.profesionalInfo);
                  userData.profesionalInfo.isVip = false;
                }
              }
            } catch (vipErr) {
              console.warn('[FirebaseAuth] Notice checking VIP status:', vipErr);
            }

            console.log('[FirebaseAuth] User profile loaded from Firestore:', {
              uid: firebaseUser.uid,
              nombre: userData.nombre,
              rol: userData.rol,
              isAdmin: userData.isAdmin || isSuperAdmin
            });
            setCurrentUser({ uid: firebaseUser.uid, ...userData, isNewUser: false, isAdmin: userData.isAdmin || isSuperAdmin });
          } else {
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              nombre: firebaseUser.displayName || '',
              fotoUrl: firebaseUser.photoURL || '',
              rol: 'cliente',
              ciudad: '',
              zona: '',
              isNewUser: true,
              isAdmin: firebaseUser.email === 'lautaroj.aguilera@gmail.com'
            });
          }
          setLoading(false);
        }, (error) => {
          clearTimeout(safetyTimer);
          console.warn('[FirebaseAuth] Notice: could not load full user document from Firestore (using Auth basic info):', error);
          setLoading(false);
        });
      } else {
        clearTimeout(safetyTimer);
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const logout = async () => {
    await firebaseSignOut(auth);
    // Cleanup is handled by useEffect
  };

  const value = {
    currentUser,
    loading,
    logout,
    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
