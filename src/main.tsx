import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Gestión del Service Worker: en desarrollo o preview desregistramos para evitar conflictos de caché
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
      // PWA service worker registered via vite-plugin-pwa script injection
    } else {
      // En modo desarrollo/preview, desregistrar cualquier Service Worker previo para evitar pantalla en blanco
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
  }
} catch (swError) {
  console.warn('Bahía Oficios: Service worker registration bypassed:', swError);
}
