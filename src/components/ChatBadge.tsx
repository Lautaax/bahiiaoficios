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
    <Link to="/chats" id="onboarding-nav-chat" className="relative p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors" title="Mis Mensajes">
      <MessageSquare size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
          {unreadCount}
        </span>
      )}
    </Link>
  );
};
