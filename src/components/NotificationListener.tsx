import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { requestNotificationPermission, sendPushNotification } from '../utils/notifications';

export const NotificationListener: React.FC = () => {
  const { currentUser } = useAuth();
  const initialLoadRef = useRef(true);
  const initialChatsLoadRef = useRef(true);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Listen for new notifications (e.g., quote requests)
  useEffect(() => {
    if (!currentUser) return;
    
    initialLoadRef.current = true;

    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', currentUser.uid),
      where('leida', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          sendPushNotification(data.titulo || 'Nueva Notificación', {
            body: data.mensaje || 'Tienes una nueva notificación en Bahía Oficios.',
            icon: '/vite.svg'
          });
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for new chat messages
  useEffect(() => {
    if (!currentUser) return;
    
    initialChatsLoadRef.current = true;

    const isClient = currentUser.rol === 'cliente';
    const field = isClient ? 'clientId' : 'workerId';

    const q = query(
      collection(db, 'chats'),
      where(field, '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialChatsLoadRef.current) {
        initialChatsLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          // Only notify if the last message was NOT sent by the current user
          if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUser.uid) {
            const senderName = isClient ? data.workerName : data.clientName;
            sendPushNotification(`Nuevo mensaje de ${senderName}`, {
              body: data.lastMessage,
              icon: '/vite.svg'
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null;
};
