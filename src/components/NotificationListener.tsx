import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { fcmService, FcmStatus } from '../services/fcmService';
import { quoteReminderService } from '../services/quoteReminderService';
import { checkAndTriggerPhotoIncentiveForUser } from '../services/photoIncentiveService';
import { Bell, CheckCircle2, X, Sparkles, Volume2 } from 'lucide-react';
import { safeLocalStorage } from '../utils/storage';

export const NotificationListener: React.FC = () => {
  const { currentUser } = useAuth();
  const initialLoadNotifsRef = useRef(true);
  const initialChatsLoadRef = useRef(true);
  const initialQuotesLoadRef = useRef(true);
  const [fcmStatus, setFcmStatus] = useState<FcmStatus | null>(null);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

  // Initialize FCM and register token for the user
  useEffect(() => {
    if (!currentUser) return;

    const setupFcm = async () => {
      const status = await fcmService.getStatus();
      setFcmStatus(status);

      // If user is a professional and notifications are already granted, ensure token is refreshed in DB
      if (currentUser.rol === 'profesional') {
        if (status.permission === 'granted') {
          await fcmService.requestPermissionAndGetToken(currentUser.uid);
        } else if (status.permission === 'default') {
          // Check if dismissed recently
          const dismissedAt = safeLocalStorage.getItem(`fcm_prompt_dismissed_${currentUser.uid}`);
          if (!dismissedAt || Date.now() - parseInt(dismissedAt, 10) > 24 * 60 * 60 * 1000) {
            setShowPromptBanner(true);
          }
        }
      }

      // Setup foreground listener for real-time FCM incoming pushes
      const unsubscribe = await fcmService.setupForegroundListener((payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Nuevo aviso';
        const body = payload.notification?.body || payload.data?.body || 'Tenés una novedad en Bahía Oficios';
        
        setToastMessage({ title, body });
        setTimeout(() => setToastMessage(null), 6000);
      });

      return unsubscribe;
    };

    setupFcm();
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
    if (!currentUser) return;
    
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
            tag: change.doc.id
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

  // 2. Listen for new chat messages in real-time
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
            const senderName = isClient ? (data.workerName || 'El Profesional') : (data.clientName || 'Un Cliente');
            const title = `💬 Nuevo mensaje de ${senderName}`;
            const body = data.lastMessage || 'Nuevo mensaje en tu conversación';

            fcmService.showNativeNotification(title, {
              body,
              icon: '/icon.svg',
              tag: `chat-${change.doc.id}`
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

  // 3. Listen for new incoming quote requests (Pedidos de Presupuesto) assigned to this professional
  useEffect(() => {
    if (!currentUser || currentUser.rol !== 'profesional') return;

    initialQuotesLoadRef.current = true;

    // Listen to quote requests where this professional is assigned
    const q = query(
      collection(db, 'quoteRequests'),
      where('profesionalesAsignados', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialQuotesLoadRef.current) {
        initialQuotesLoadRef.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const rubro = data.rubro || 'tu rubro';
          const title = `🚨 ¡Nuevo Pedido de Presupuesto!`;
          const body = data.titulo 
            ? `${data.titulo} (${rubro})` 
            : `Un cliente en Bahía Blanca busca ${rubro}. ¡Respondé rápido para ganar el trabajo!`;

          fcmService.showNativeNotification(title, {
            body,
            icon: '/icon.svg',
            tag: `quote-req-${change.doc.id}`
          });

          setToastMessage({ title, body });
          setTimeout(() => setToastMessage(null), 7000);
        }
      });
    }, (error) => {
      console.warn('[NotificationListener] Could not listen to assigned quote requests:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleEnablePush = async () => {
    if (!currentUser) return;
    setEnablingPush(true);
    try {
      const res = await fcmService.requestPermissionAndGetToken(currentUser.uid);
      if (res.success) {
        setShowPromptBanner(false);
        const status = await fcmService.getStatus();
        setFcmStatus(status);
        fcmService.triggerTestNotification();
      } else {
        alert(res.error || 'No se pudieron activar las notificaciones.');
      }
    } finally {
      setEnablingPush(false);
    }
  };

  const handleDismissBanner = () => {
    if (currentUser) {
      safeLocalStorage.setItem(`fcm_prompt_dismissed_${currentUser.uid}`, Date.now().toString());
    }
    setShowPromptBanner(false);
  };

  return (
    <>
      {/* Toast Alert popup for in-app alerts */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-top-4 duration-300 flex items-start gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0 mt-0.5">
            <Bell size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{toastMessage.body}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Non-intrusive banner for professionals who haven't enabled push notifications yet */}
      {showPromptBanner && currentUser?.rol === 'profesional' && (
        <div className="fixed bottom-4 right-4 z-40 max-w-md bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-indigo-500/30 flex items-start gap-3.5 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-2.5 bg-indigo-500 text-white rounded-2xl shrink-0 mt-0.5 shadow-md">
            <Sparkles size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-0.5">
              <span>ALERTA DE PEDIDOS Y MENSAJES</span>
            </div>
            <h4 className="text-sm font-bold text-white leading-tight">
              ¿Querés recibir pedidos en tiempo real?
            </h4>
            <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
              Activá las notificaciones push de Firebase para enterarte al instante cuando un cliente en Bahía Blanca pida presupuesto o te escriba.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {enablingPush ? 'Activando...' : 'Activar Alertas Push'}
              </button>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="text-xs text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-xl font-medium transition-colors"
              >
                Más tarde
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            className="text-indigo-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};
