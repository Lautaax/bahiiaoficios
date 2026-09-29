import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
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
      navigator.serviceWorker.register('/sw.js').then(() => {
        console.log('Bahía Oficios: Caché sin conexión activada.');
      });
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
