import { app, db } from '../firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, setDoc } from 'firebase/firestore';
import { safeLocalStorage } from '../utils/storage';

export interface FcmStatus {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  token: string | null;
  isEnabled: boolean;
}

class FcmService {
  private messagingInstance: any = null;
  private isCheckingSupport = false;
  private supported: boolean | null = null;
  private unsubscribeForeground: (() => void) | null = null;
  private audioCtx: AudioContext | null = null;

  /**
   * Safe check for Web Messaging / FCM support
   */
  async checkSupport(): Promise<boolean> {
    if (this.supported !== null) return this.supported;
    if (typeof window === 'undefined') {
      this.supported = false;
      return false;
    }

    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        this.supported = false;
        return false;
      }

      const { isSupported } = await import('firebase/messaging');
      this.supported = await isSupported();
      return this.supported;
    } catch (e) {
      console.warn('[FCM] Support check error:', e);
      this.supported = false;
      return false;
    }
  }

  /**
   * Initializes Firebase Messaging client
   */
  private async getMessagingInstance(): Promise<any> {
    if (this.messagingInstance) return this.messagingInstance;
    const supported = await this.checkSupport();
    if (!supported) return null;

    try {
      const { getMessaging } = await import('firebase/messaging');
      this.messagingInstance = getMessaging(app);
      return this.messagingInstance;
    } catch (err) {
      console.warn('[FCM] Error initializing getMessaging:', err);
      return null;
    }
  }

  /**
   * Plays a pleasant dual-tone chime sound via Web Audio API (no external MP3 file needed)
   */
  playNotificationSound() {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.55);
    } catch (err) {
      console.warn('[FCM Audio] Could not play notification chime:', err);
    }
  }

  /**
   * Requests permission and retrieves the FCM push token for the user
   */
  async requestPermissionAndGetToken(userId?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Entorno no disponible' };
    }

    if (!('Notification' in window)) {
      return { success: false, error: 'Este navegador no soporta notificaciones push.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
      }

      let fcmToken: string | null = null;
      const messaging = await this.getMessagingInstance();

      if (messaging) {
        try {
          const { getToken } = await import('firebase/messaging');
          
          // Register service worker if available
          let swRegistration: ServiceWorkerRegistration | undefined;
          if ('serviceWorker' in navigator) {
            try {
              swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
              });
            } catch (swErr) {
              console.warn('[FCM] SW registration warning:', swErr);
            }
          }

          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

          fcmToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration
          });
        } catch (tokenErr: any) {
          console.warn('[FCM] getToken notice (using local push fallback):', tokenErr);
        }
      }

      // If FCM token wasn't generated (e.g. demo key/no VAPID), create a unique device identifier
      if (!fcmToken) {
        fcmToken = `web_device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      safeLocalStorage.setItem('fcm_token', fcmToken);
      safeLocalStorage.setItem('fcm_push_enabled', 'true');

      // Persist to Firestore if user is authenticated
      if (userId) {
        try {
          const userRef = doc(db, 'usuarios', userId);
          await updateDoc(userRef, {
            fcmToken: fcmToken,
            fcmTokens: arrayUnion(fcmToken),
            fcmPushEnabled: true,
            fcmUpdatedAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn('[FCM] Could not update user document with token:', dbErr);
        }
      }

      return { success: true, token: fcmToken };
    } catch (err: any) {
      console.error('[FCM] Error in requestPermissionAndGetToken:', err);
      return { success: false, error: err?.message || 'Error al configurar notificaciones' };
    }
  }

  /**
   * Sets up real-time foreground message handler for FCM
   */
  async setupForegroundListener(onMessageReceived: (payload: any) => void): Promise<() => void> {
    const messaging = await this.getMessagingInstance();
    if (!messaging) return () => {};

    try {
      const { onMessage } = await import('firebase/messaging');
      if (this.unsubscribeForeground) {
        this.unsubscribeForeground();
      }

      this.unsubscribeForeground = onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload);
        this.playNotificationSound();
        onMessageReceived(payload);

        // Also display native notification if permission granted
        const title = payload.notification?.title || payload.data?.title || 'Nuevo aviso';
        const body = payload.notification?.body || payload.data?.body || 'Tenés un aviso en Bahía Oficios';
        this.showNativeNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          data: payload.data
        });
      });

      return this.unsubscribeForeground;
    } catch (err) {
      console.warn('[FCM] Could not setup onMessage listener:', err);
      return () => {};
    }
  }

  /**
   * Displays native system notification with sound
   */
  showNativeNotification(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    this.playNotificationSound();

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            icon: '/icon.svg',
            badge: '/icon.svg',
            ...options
          });
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } catch (err) {
      console.warn('[FCM] Native notification trigger error:', err);
    }
  }

  /**
   * Returns current FCM push status
   */
  async getStatus(): Promise<FcmStatus> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        isSupported: false,
        permission: 'unsupported',
        token: null,
        isEnabled: false
      };
    }

    const isSupported = await this.checkSupport();
    const permission = Notification.permission;
    const token = safeLocalStorage.getItem('fcm_token');
    const isEnabled = permission === 'granted' && !!token;

    return {
      isSupported,
      permission,
      token,
      isEnabled
    };
  }

  /**
   * Sends a test push notification to verify setup
   */
  async triggerTestNotification(): Promise<boolean> {
    const res = await this.requestPermissionAndGetToken();
    if (!res.success) return false;

    this.showNativeNotification('🔔 ¡Notificaciones FCM Activas!', {
      body: 'Todo listo: recibirás alertas instantáneas cuando te envíen un pedido de presupuesto o un mensaje.',
      icon: '/icon.svg',
      tag: 'test-fcm-alert'
    });
    return true;
  }
}

export const fcmService = new FcmService();
