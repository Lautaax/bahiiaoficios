// Service Worker para Firebase Cloud Messaging (FCM) en Bahía Oficios
// Este archivo maneja notificaciones push en segundo plano para profesionales y clientes

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuración básica para el Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForWorker",
  projectId: "bahia-oficios",
  messagingSenderId: "389274910243",
  appId: "1:389274910243:web:987a6b5c"
};

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || '🔔 Bahía Oficios - Nuevo Aviso';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Tenés un nuevo pedido de presupuesto o mensaje pendiente.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.data?.tag || 'bahia-oficios-notification',
      data: {
        url: payload.data?.url || '/dashboard-profesional',
        ...payload.data
      },
      vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Error inicializando Firebase Messaging en SW:', err);
}

// Fallback para eventos de Push nativos
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || data.notification?.title || '🔔 Nuevo aviso en Bahía Oficios';
    const options = {
      body: data.body || data.notification?.body || 'Revisá tus consultas y pedidos recibidos.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.tag || 'bahia-push',
      data: {
        url: data.url || '/dashboard-profesional',
        ...data
      },
      vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('🔔 Nuevo aviso en Bahía Oficios', {
        body: text,
        icon: '/icon.svg'
      })
    );
  }
});

// Manejo del clic en la notificación para abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard-profesional';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la pestaña ya está abierta, enfocarla
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
