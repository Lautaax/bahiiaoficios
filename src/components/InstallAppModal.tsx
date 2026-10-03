import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Smartphone, Download, CheckCircle2, X, Share2, 
  Sparkles, ShieldCheck, ArrowRight, Bell, Zap, Laptop,
  ExternalLink, Copy, Check, QrCode, Terminal, Layers
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { platformUtils } from '../utils/platform';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [activeTab, setActiveTab] = useState<'webapk' | 'download' | 'capacitor' | 'ios'>('webapk');

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bahiaoficios.com';
  const pwaBuilderUrl = `https://www.pwabuilder.com/report?site=${encodeURIComponent(currentUrl)}`;

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

  const modalContent = (
    <div 
      className="fixed inset-0 z-9999 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative my-6"
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
                  Android APK & PWA Oficial
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Instalar / Generar APK
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 mt-3 relative z-10 leading-relaxed">
            Tené <strong>Bahía Oficios</strong> como aplicación nativa en tu celular con notificaciones push instantáneas, ícono en tu pantalla de inicio y funcionamiento ultrarrápido.
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
                <CheckCircle2 size={13} />
                Instalada (Modo App Nativa)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                <Laptop size={13} />
                Navegador Web
              </span>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('webapk')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer ${
                activeTab === 'webapk'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              1. WebAPK Directa
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('download')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer ${
                activeTab === 'download'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Descargar .APK
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('capacitor')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer ${
                activeTab === 'capacitor'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Capacitor Nativo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer ${
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
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
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Instalar APK en este dispositivo ahora</span>
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2 bg-white/80 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Pasos para instalar desde tu celular:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-[11px]">
                          <li>Abrí <strong>Bahía Oficios</strong> en Google Chrome en tu celular.</li>
                          <li>Tocá el menú de tres puntos (<strong>⋮</strong>) arriba a la derecha.</li>
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
                <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 shrink-0">
                  <QRCodeSVG 
                    value={currentUrl} 
                    size={100} 
                    level="M" 
                    includeMargin={false}
                  />
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <QrCode size={14} className="text-indigo-600" />
                    <span>¿Estás en tu computadora?</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Escaneá este código QR con la cámara de tu celular para abrir Bahía Oficios e instalar la APK directamente.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1 cursor-pointer"
                  >
                    {copiedUrl ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedUrl ? 'Enlace copiado al portapapeles' : 'Copiar enlace para WhatsApp'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Download standalone APK (PWABuilder / TWA) */}
          {activeTab === 'download' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
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
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs"
                  >
                    <span>Abrir Generador de APK en PWABuilder</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Capacitor Native Android project */}
          {activeTab === 'capacitor' && (
            <div className="space-y-3 animate-in fade-in duration-200 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Terminal size={14} />
                    <span>Compilar APK nativo con Capacitor 8</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCommands}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedCommands ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedCommands ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>

                <pre className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-indigo-300 overflow-x-auto leading-relaxed border border-slate-800/80">
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
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-amber-300">
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
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <Share2 size={16} className="text-indigo-500" />
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
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>Sincronización total en tiempo real</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
