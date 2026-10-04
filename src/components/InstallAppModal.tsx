import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Smartphone, Download, CheckCircle2, X, Share2, 
  Sparkles, ShieldCheck, ArrowRight, Bell, Zap, Laptop,
  ExternalLink, Copy, Check, QrCode, Terminal
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { platformUtils } from '../utils/platform';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'webapk' | 'download' | 'capacitor' | 'ios';

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('webapk');

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bahiaoficios.com';
  const pwaBuilderUrl = `https://www.pwabuilder.com/report?site=${encodeURIComponent(currentUrl)}`;

  const tabs: TabType[] = ['webapk', 'download', 'capacitor', 'ios'];

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
      setActiveTab('webapk');
    }

    return () => {
      window.removeEventListener('pwa-install-ready', handleReady);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, [isOpen]);

  // Focus trap, escape key, and scroll lock for accessibility
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        focusables[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;
        const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (triggerRef.current && (triggerRef.current as HTMLElement).focus) {
        (triggerRef.current as HTMLElement).focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await platformUtils.triggerInstall();
    if (success) {
      setInstallSuccess(true);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCommands = () => {
    const cmds = `npm run build\nnpx cap sync android\ncd android && ./gradlew assembleDebug`;
    navigator.clipboard.writeText(cmds);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2000);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      setActiveTab(tabs[nextIndex]);
      document.getElementById(`tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prevIndex]);
      document.getElementById(`tab-${tabs[prevIndex]}`)?.focus();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-9999 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative my-6 focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        aria-describedby="install-modal-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Reader Live Region for copy announcements */}
        <div className="sr-only" role="status" aria-live="polite">
          {copiedUrl && 'Enlace de la aplicación copiado al portapapeles'}
          {copiedCommands && 'Comandos de compilación de Android copiados al portapapeles'}
          {installSuccess && 'La aplicación se instaló correctamente'}
        </div>

        {/* Header */}
        <div className="relative p-6 sm:p-7 bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white overflow-hidden border-b border-indigo-800/40">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" aria-hidden="true"></div>

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner" aria-hidden="true">
                <Smartphone size={24} />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full mb-1">
                  Android APK & PWA Oficial
                </span>
                <h3 id="install-modal-title" className="text-xl sm:text-2xl font-black text-white">
                  Instalar / Generar APK
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
              aria-label="Cerrar ventana de instalación"
            >
              <X size={20} />
            </button>
          </div>

          <p id="install-modal-desc" className="text-xs sm:text-sm text-slate-300 mt-3 relative z-10 leading-relaxed">
            Tené <strong>Bahía Oficios</strong> como aplicación en tu celular con notificaciones push instantáneas, ícono en tu pantalla de inicio y funcionamiento ultrarrápido.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Estado en este dispositivo:
            </span>
            {isStandalone ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={13} aria-hidden="true" />
                Instalada (Modo App Nativa)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                <Laptop size={13} aria-hidden="true" />
                Navegador Web
              </span>
            )}
          </div>

          {/* Accessible Navigation Tabs */}
          <div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold"
            role="tablist"
            aria-label="Opciones de instalación y compilación"
          >
            <button
              id="tab-webapk"
              type="button"
              role="tab"
              aria-selected={activeTab === 'webapk'}
              aria-controls="panel-webapk"
              tabIndex={activeTab === 'webapk' ? 0 : -1}
              onClick={() => setActiveTab('webapk')}
              onKeyDown={(e) => handleTabKeyDown(e, 0)}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'webapk'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. WebAPK Directa
            </button>
            <button
              id="tab-download"
              type="button"
              role="tab"
              aria-selected={activeTab === 'download'}
              aria-controls="panel-download"
              tabIndex={activeTab === 'download' ? 0 : -1}
              onClick={() => setActiveTab('download')}
              onKeyDown={(e) => handleTabKeyDown(e, 1)}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'download'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Descargar .APK
            </button>
            <button
              id="tab-capacitor"
              type="button"
              role="tab"
              aria-selected={activeTab === 'capacitor'}
              aria-controls="panel-capacitor"
              tabIndex={activeTab === 'capacitor' ? 0 : -1}
              onClick={() => setActiveTab('capacitor')}
              onKeyDown={(e) => handleTabKeyDown(e, 2)}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'capacitor'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Capacitor Nativo
            </button>
            <button
              id="tab-ios"
              type="button"
              role="tab"
              aria-selected={activeTab === 'ios'}
              aria-controls="panel-ios"
              tabIndex={activeTab === 'ios' ? 0 : -1}
              onClick={() => setActiveTab('ios')}
              onKeyDown={(e) => handleTabKeyDown(e, 3)}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              4. iPhone (iOS)
            </button>
          </div>

          {/* TAB 1: WebAPK Direct (Android Chrome Automatic APK) */}
          {activeTab === 'webapk' && (
            <div 
              id="panel-webapk"
              role="tabpanel"
              aria-labelledby="tab-webapk"
              tabIndex={0}
              className="space-y-4 animate-in fade-in duration-200 focus-visible:outline-none"
            >
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5" aria-hidden="true">
                    <Download size={18} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Instalación Oficial WebAPK de Android
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      En teléfonos Android con Google Chrome o Samsung Internet, el sistema operativo <strong>crea e instala automáticamente un APK nativo oficial</strong> con ícono en tu pantalla de inicio y soporte completo de notificaciones.
                    </p>

                    {canPrompt ? (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Instalar APK en este dispositivo ahora</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2 bg-white/80 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Pasos para instalar desde tu celular:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px]">
                          <li>Abrí <strong>Bahía Oficios</strong> en Google Chrome en tu celular.</li>
                          <li>Tocá el menú de tres puntos (<strong aria-label="menú más opciones">⋮</strong>) arriba a la derecha.</li>
                          <li>Seleccioná <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</li>
                          <li>Confirmá y Android generará el APK nativo en tu lista de apps.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QR Code for Desktop Users */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 shrink-0" aria-label={`Código QR para abrir ${currentUrl}`}>
                  <QRCodeSVG 
                    value={currentUrl} 
                    size={100} 
                    level="M" 
                    includeMargin={false}
                  />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <QrCode size={14} className="text-indigo-600" aria-hidden="true" />
                    <span>¿Estás en tu computadora?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Escaneá este código QR con la cámara de tu celular para abrir Bahía Oficios e instalar la APK directamente.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded-md px-1"
                    aria-label="Copiar enlace para compartir por WhatsApp"
                  >
                    {copiedUrl ? <Check size={12} className="text-emerald-500" aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    <span>{copiedUrl ? 'Enlace copiado al portapapeles' : 'Copiar enlace para WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Download standalone APK (PWABuilder / TWA) */}
          {activeTab === 'download' && (
            <div 
              id="panel-download"
              role="tabpanel"
              aria-labelledby="tab-download"
              tabIndex={0}
              className="space-y-4 animate-in fade-in duration-200 focus-visible:outline-none"
            >
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5" aria-hidden="true">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      Generador de APK en la Nube (Sin Android Studio)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Podés compilar un archivo instalador <strong>.apk</strong> o <strong>.aab</strong> (para Google Play Store) directamente en la nube utilizando <strong>PWABuilder</strong> (motor oficial de Microsoft y Google Bubblewrap para Trusted Web Activity).
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>URL de tu aplicación web:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[200px]">{currentUrl}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Al hacer clic en el botón de abajo, PWABuilder validará el Manifest y te permitirá descargar el paquete APK firmado listo para compartir por WhatsApp, Drive o subir a la Play Store.
                  </p>

                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    aria-label="Abrir generador de APK en PWABuilder (abre en ventana nueva)"
                  >
                    <span>Abrir Generador de APK en PWABuilder</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Capacitor Native Android project */}
          {activeTab === 'capacitor' && (
            <div 
              id="panel-capacitor"
              role="tabpanel"
              aria-labelledby="tab-capacitor"
              tabIndex={0}
              className="space-y-3 animate-in fade-in duration-200 text-xs focus-visible:outline-none"
            >
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Terminal size={14} aria-hidden="true" />
                    <span>Compilar APK nativo con Capacitor 8</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
                    aria-label="Copiar comandos de terminal para compilar el APK"
                  >
                    {copiedCommands ? <Check size={12} className="text-emerald-400" aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                    <span>{copiedCommands ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-indigo-300 overflow-x-auto leading-relaxed border border-slate-800/80" tabIndex={0} aria-label="Comandos para compilar APK">
{`# 1. Compilar web y sincronizar con Android
npm run build:apk

# 2. Compilar APK debug con Gradle
cd android && ./gradlew assembleDebug

# Ubicación del archivo APK generado:
# android/app/build/outputs/apk/debug/app-debug.apk`}
                </pre>

                <p className="text-slate-400 text-[11px] leading-relaxed">
                  O si preferís usar <strong>Android Studio</strong> con emulador o celular USB conectado:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-amber-300" tabIndex={0} aria-label="Comando para abrir en Android Studio">
                  npx cap open android
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Configuración nativa ya incluida en el proyecto:
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>App ID:</strong> <code className="text-indigo-600 dark:text-indigo-400">com.bahiaoficios.app</code></li>
                  <li><strong>Íconos Android:</strong> mipmap mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi generados.</li>
                  <li><strong>Permisos:</strong> Notificaciones push, cámara (fotos de perfil/trabajos), almacenamiento y deep linking.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: iOS Safari */}
          {activeTab === 'ios' && (
            <div 
              id="panel-ios"
              role="tabpanel"
              aria-labelledby="tab-ios"
              tabIndex={0}
              className="space-y-4 animate-in fade-in duration-200 focus-visible:outline-none"
            >
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Share2 size={16} className="text-indigo-500" aria-hidden="true" />
                  Instalar en iPhone o iPad (Safari):
                </h4>
                <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                  <li>Abrí <strong>Bahía Oficios</strong> en el navegador <strong>Safari</strong> de iOS.</li>
                  <li>Tocá el botón <strong>Compartir</strong> (ícono de cuadrado con flecha hacia arriba).</li>
                  <li>Deslizá hacia abajo y seleccioná <strong>"Agregar al Inicio"</strong> (Add to Home Screen).</li>
                  <li>Confirmá tocando <strong>"Agregar"</strong> arriba a la derecha.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span>Sincronización total en tiempo real</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
