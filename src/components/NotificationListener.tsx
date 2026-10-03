import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { fcmService } from '../services/fcmService';
import { quoteReminderService } from '../services/quoteReminderService';
import { checkAndTriggerPhotoIncentiveForUser } from '../services/photoIncentiveService';
import { Bell, X } from 'lucide-react';
import { NotificationPermissionModal } from './NotificationPermissionModal';

export const NotificationListener: React.FC = () => {
  const { currentUser } = useAuth();
  const initialLoadNotifsRef = useRef(true);
  const initialChatsLoadRef = useRef(true);
  const initialQuotesLoadRef = useRef(true);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  // Initialize FCM foreground listener & token sync
  useEffect(() => {
    let unsubscribeForeground: (() => void) | undefined;

    const setupFcm = async () => {
      const status = await fcmService.getStatus();

      // If notifications are granted and user is logged in, ensure token is refreshed in DB
      if (status.permission === 'granted' && currentUser?.uid) {
        await fcmService.requestPermissionAndGetToken(currentUser.uid);
      }

      // Setup foreground listener for real-time FCM incoming pushes
      unsubscribeForeground = await fcmService.setupForegroundListener((payload) => {
        const title = payload.notification?.title || payload.data?.title || '🔔 Nuevo aviso en Bahía Oficios';
        const body = payload.notification?.body || payload.data?.body || 'Tenés una novedad en Bahía Oficios';
        
        setToastMessage({ title, body });
        setTimeout(() => setToastMessage(null), 6000);
      });
    };

    setupFcm();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [currentUser]);

  // Periodic quote reminder checks & photo incentive
  useEffect(() => {
    if (!currentUser) return;

    quoteReminderService.checkIfDueAndRun(currentUser?.uid);

    if (currentUser?.rol === 'profesional') {
      checkAndTriggerPhotoIncentiveForUser(currentUser);
    }

    const interval = setInterval(() => {
      quoteReminderService.checkIfDueAndRun(currentUser?.uid);
      if (currentUser?.rol === 'profesional') {
        checkAndTriggerPhotoIncentiveForUser(currentUser);
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // 1. Listen for new direct notifications in Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    initialLoadNotifsRef.current = true;

    const q = query(
      collection(db, 'notificaciones'),
      where('userId', '==', currentUser.uid),
      where('leida', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoadNotifsRef.current) {
        initialLoadNotifsRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const title = data.titulo || '🔔 Nueva Notificación';
          const body = data.mensaje || 'Tienes una nueva notificación en Bahía Oficios.';

          fcmService.showNativeNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: `notif_${change.doc.id}`,
            data: { url: '/dashboard' }
          });

          setToastMessage({ title, body });
          setTimeout(() => setToastMessage(null), 6000);
        }
      });
    }, (error) => {
      console.warn('[NotificationListener] Could not listen to notifications:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Listen for incoming unread chats to notify the user
  useEffect(() => {
    if (!currentUser?.uid) return;

    initialChatsLoadRef.current = true;

    const roleField = currentUser.rol === 'profesional' ? 'workerId' : 'clientId';
    const qChats = query(
      collection(db, 'chats'),
      where(roleField, '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(qChats, (snapshot) => {
      if (initialChatsLoadRef.current) {
        initialChatsLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          // Check if latest message was sent by the other party
          if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUser.uid) {
            const senderName = data.lastMessageSenderName || 'Un usuario';
            const title = `💬 Nuevo mensaje de ${senderName}`;
            const body = data.lastMessage || 'Te han enviado un mensaje nuevo en Bahía Oficios';

            fcmService.showNativeNotification(title, {
              body,
              icon: '/icon.svg',
              badge: '/icon.svg',
              tag: `chat_${change.doc.id}`,
              data: { url: `/chat/${change.doc.id}` }
            });

            setToastMessage({ title, body });
            setTimeout(() => setToastMessage(null), 6000);
          }
        }
      });
    }, (error) => {
      console.warn('[NotificationListener] Could not listen to chat updates:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Listen for assigned direct quote requests for professionals
  useEffect(() => {
    if (!currentUser?.uid || currentUser.rol !== 'profesional') return;

    initialQuotesLoadRef.current = true;

    const qQuotes = query(
      collection(db, 'quoteRequests'),
      where('profesionalesAsignados', 'array-contains', currentUser.uid),
      where('estado', '==', 'pendiente')
    );

    const unsubscribe = onSnapshot(qQuotes, (snapshot) => {
      if (initialQuotesLoadRef.current) {
        initialQuotesLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const title = '⚡ ¡Nuevo pedido de presupuesto!';
          const body = `Un cliente busca un ${data.rubro || 'servicio'} en ${data.zona || 'Bahía Blanca'}. ¡Respondé rápido!`;

          fcmService.showNativeNotification(title, {
            body,
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: `quote_${change.doc.id}`,
            data: { url: '/dashboard-profesional' }
          });

          setToastMessage({ title, body });
          setTimeout(() => setToastMessage(null), 6000);
        }
      });
    }, (error) => {
      console.warn('[NotificationListener] Could not listen to assigned quote requests:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <>
      {/* High-Impact Notification Permission Modal & Floating Quick-Pill */}
      <NotificationPermissionModal autoPrompt={true} />

      {/* Floating In-App Toast Popup */}
      {toastMessage && (
        <div 
          className="fixed top-4 right-4 z-50 max-w-sm w-full bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 flex items-start gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl text-white shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
            <Bell size={18} className="animate-wiggle" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white truncate">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">{toastMessage.body}</p>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};
