import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export const ChatBadge: React.FC = () => {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    const isClient = currentUser.rol === 'cliente';
    const field = isClient ? 'clientId' : 'workerId';

    const q = query(
      collection(db, 'chats'),
      where(field, '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUser.uid && data.hasUnread !== false) {
          count++;
        }
      });
      setUnreadCount(count);
    }, (error) => {
      console.warn("Could not subscribe to chats:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Link 
      to="/chats" 
      id="onboarding-nav-chat" 
      className="relative p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors" 
      title="Mis Chats y Presupuestos"
      aria-label="Mis Chats y Presupuestos"
    >
      <MessageSquare size={18} strokeWidth={1.8} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
          {unreadCount}
        </span>
      )}
    </Link>
  );
};
