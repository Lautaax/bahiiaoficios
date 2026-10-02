import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Smartphone, Download, CheckCircle2, X, Share2, 
  Sparkles, ShieldCheck, ArrowRight, Bell, Zap, Laptop
} from 'lucide-react';
import { platformUtils } from '../utils/platform';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'manual'>('android');

  useEffect(() => {
    setIsStandalone(platformUtils.isStandalone());
    setCanPrompt(platformUtils.canInstallPwa());

    const handleReady = () => setCanPrompt(true);
    const handleInstalled = () => {
      setInstallSuccess(true);
      setIsStandalone(true);
    };

    window.addEventListener('pwa-install-ready', handleReady);
    window.addEventListener('pwa-installed', handleInstalled);

    if (platformUtils.isIos()) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }

    return () => {
      window.removeEventListener('pwa-install-ready', handleReady);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await platformUtils.triggerInstall();
    if (success) {
      setInstallSuccess(true);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-9999 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 sm:p-7 bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white overflow-hidden border-b border-indigo-800/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                <Smartphone size={24} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full mb-1">
                  Web & APK Móvil
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Instalar Bahía Oficios
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal de instalación"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-3 relative z-10 leading-relaxed">
            Tené la plataforma siempre a mano en tu celular con notificaciones push instantáneas, sin ocupar espacio y con sincronización total entre Web y APK.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Estado de la app en este dispositivo:
            </span>
            {isStandalone ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={13} />
                Instalada (Modo App)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                <Laptop size={13} />
                Navegador Web
              </span>
            )}
          </div>

          {/* Device Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-2 px-3 rounded-xl transition-all ${
                activeTab === 'android'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Android (APK)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-3 rounded-xl transition-all ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              iPhone (iOS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-3 rounded-xl transition-all ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Desarrollador
            </button>
          </div>

          {/* Tab 1: Android WebAPK / Install */}
          {activeTab === 'android' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                    <Download size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Instalación Directa WebAPK (Recomendado)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      Android genera automáticamente una <strong>APK nativa oficial</strong> en tu teléfono. Se abre en ventana completa sin barra de navegación y con icono en tu menú de apps.
                    </p>

                    {canPrompt ? (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all active:scale-95"
                      >
                        <Download size={14} />
                        <span>Instalar en este celular ahora</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Pasos en Google Chrome / Navegador:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px]">
                          <li>Tocá el menú de tres puntos (<strong>⋮</strong>) arriba a la derecha.</li>
                          <li>Elegí <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                          <li>Confirmá y ¡listo! Se instalará como APK en tu pantalla de inicio.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ventajas */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <Bell size={14} className="text-indigo-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Notificaciones Push</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <Zap size={14} className="text-amber-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Carga Ultra Rápida</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: iOS Guide */}
          {activeTab === 'ios' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Share2 size={16} className="text-indigo-500" />
                  Cómo instalar en iPhone o iPad (Safari):
                </h4>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>Abrí <strong>Bahía Oficios</strong> en el navegador Safari.</li>
                  <li>Tocá el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba abajo en la pantalla).</li>
                  <li>Deslizá hacia abajo y seleccioná <strong>"Agregar al Inicio"</strong> (Add to Home Screen).</li>
                  <li>Confirmá con <strong>"Agregar"</strong> en la esquina superior derecha.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 3: Capacitor APK Compiler details */}
          {activeTab === 'manual' && (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 font-mono text-[11px] leading-relaxed">
                <p className="text-slate-400 mb-2">// Compilar APK nativa con Capacitor:</p>
                <p className="text-emerald-400">1. npm run build</p>
                <p className="text-emerald-400">2. npx cap sync android</p>
                <p className="text-emerald-400">3. cd android &amp;&amp; ./gradlew assembleDebug</p>
                <p className="text-slate-400 mt-2">// Genera el archivo APK en:</p>
                <p className="text-amber-300">android/app/build/outputs/apk/debug/app-debug.apk</p>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                La configuración nativa de Capacitor ya está generada en el proyecto con permisos de cámara, almacenamiento para fotos y notificaciones.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>100% Sincronizado en tiempo real</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
