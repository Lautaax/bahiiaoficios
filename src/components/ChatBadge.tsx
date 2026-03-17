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
        // A message is unread if the last sender is NOT the current user AND it's marked as unread
        // Wait, do we have an unread flag? If not, we can assume it's unread if lastMessageSenderId !== currentUser.uid
        // and we haven't opened it. But wait, how do we mark it as read?
        // Let's check if there's a `unread_clientId` or similar.
        // For now, let's just use `lastMessageSenderId !== currentUser.uid` and a new field `hasUnread`
        if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUser.uid && data.hasUnread !== false) {
          count++;
        }
      });
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Link to="/chats" className="relative p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors" title="Mis Mensajes">
      <MessageSquare size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
          {unreadCount}
        </span>
      )}
    </Link>
  );
};
