import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      
      if (firebaseUser) {
        // Set up real-time listener for user document
        const userDocRef = doc(db, 'usuarios', firebaseUser.uid);
        
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const userData = docSnapshot.data() as Omit<User, 'uid'>;
            const isSuperAdmin = firebaseUser.email === 'lautaroj.aguilera@gmail.com';
            setCurrentUser({ uid: firebaseUser.uid, ...userData, isNewUser: false, isAdmin: userData.isAdmin || isSuperAdmin });
          } else {
            // User exists in Auth but not in Firestore (New User)
            console.log('User document not found in Firestore, treating as new user');
            setCurrentUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              nombre: firebaseUser.displayName || '',
              fotoUrl: firebaseUser.photoURL || '',
              rol: 'cliente', // Default, will be set in complete profile
              ciudad: '',
              zona: '',
              isNewUser: true
            });
          }
          setLoading(false);
        }, (error) => {
          console.error('Error fetching user data:', error);
          setCurrentUser(null);
          setLoading(false);
        });
      } else {
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
