/**
 * Utilidades de detección de plataforma (Web vs APK / PWA Standalone)
 * y disparador de instalación de WebAPK para Android y escritorio.
 */

let deferredInstallPrompt: any = null;

// Escuchar el evento de instalación nativa en Android y navegadores Chromium
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

export const platformUtils = {
  // Indica si la aplicación está corriendo dentro de una APK / PWA instalada en pantalla
  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  },

  // Detecta si es un dispositivo Android
  isAndroid(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /android/i.test(navigator.userAgent || '');
  },

  // Detecta si es un dispositivo iOS (iPhone / iPad)
  isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  },

  // Retorna si el navegador permite disparar la instalación directa de la WebAPK
  canInstallPwa(): boolean {
    return Boolean(deferredInstallPrompt);
  },

  // Dispara el prompt nativo de Android / Chrome para instalar la app
  async triggerInstall(): Promise<boolean> {
    if (!deferredInstallPrompt) return false;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return choice.outcome === 'accepted';
    } catch (e) {
      console.warn('Error triggering install prompt:', e);
      return false;
    }
  }
};
