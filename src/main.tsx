import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Registrar Service Worker para caché automático de imágenes y assets de forma segura
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('Bahía Oficios: Caché sin conexión activada.');
      },
    });
  }
} catch (swError) {
  console.warn('Bahía Oficios: Service worker registration bypassed:', swError);
}
