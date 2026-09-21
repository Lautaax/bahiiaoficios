import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para caché automático de imágenes y assets
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('Bahía Oficios: Caché sin conexión activada.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
