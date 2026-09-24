import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { requestNotificationPermission, sendPushNotification } from '../utils/notifications';
import { quoteReminderService } from '../services/quoteReminderService';
import { checkAndTriggerPhotoIncentiveForUser } from '../services/photoIncentiveService';

export const NotificationListener: React.FC = () => {
  const { currentUser } = useAuth();
  const initialLoadRef = useRef(true);
  const initialChatsLoadRef = useRef(true);

  // Automatic check for pending quotes older than 24h & photo incentive for workers with 0 views
  useEffect(() => {
    // Run throttled check on mount and whenever user status changes
    quoteReminderService.checkIfDueAndRun(currentUser?.uid);

    if (currentUser?.rol === 'profesional') {
      checkAndTriggerPhotoIncentiveForUser(currentUser);
    }

    // Also run periodic check every 15 minutes while app is open
    const interval = setInterval(() => {
      quoteReminderService.checkIfDueAndRun(currentUser?.uid);
      if (currentUser?.rol === 'profesional') {
        checkAndTriggerPhotoIncentiveForUser(currentUser);
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

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
    }, (error) => {
      console.warn("Could not listen to notifications:", error);
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
    }, (error) => {
      console.warn("Could not listen to chat updates:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null;
};
