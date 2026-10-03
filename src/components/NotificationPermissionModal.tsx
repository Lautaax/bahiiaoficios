import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Sparkles, 
  X, 
  Briefcase, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Volume2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Settings
} from 'lucide-react';
import { fcmService, FcmStatus } from '../services/fcmService';
import { useAuth } from '../context/AuthContext';
import { safeLocalStorage } from '../utils/storage';

export const NOTIFICATION_PROMPT_EVENT = 'open-notification-permission-prompt';

export const triggerNotificationPermissionPrompt = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_PROMPT_EVENT));
  }
};

interface NotificationPermissionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  autoPrompt?: boolean;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  autoPrompt = true
}) => {
  const { currentUser } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [fcmStatus, setFcmStatus] = useState<FcmStatus | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState(false);
  const [deniedGuide, setDeniedGuide] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Real mock notifications preview to show the concrete value
  const previewItems = [
    {
      id: 1,
      tag: 'NUEVO TRABAJO EN BAHÍA BLANCA',
      tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: Briefcase,
      iconBg: 'bg-emerald-500',
      title: 'Reparación urgente de cañería',
      subtitle: 'Barrio Macrocentro • Presupuesto estimado $45.000',
      time: 'Hace 2 min'
    },
    {
      id: 2,
      tag: 'RESPUESTA A TU MENSAJE',
      tagColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      icon: MessageSquare,
      iconBg: 'bg-indigo-600',
      title: 'Lautaro te envió una respuesta',
      subtitle: '“Hola! Ya vi el trabajo, ¿a qué hora puedo pasar a revisar?”',
      time: 'En vivo'
    },
    {
      id: 3,
      tag: 'PRESUPUESTO ACEPTADO',
      tagColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      icon: Zap,
      iconBg: 'bg-amber-500',
      title: '¡Tu cotización fue elegida!',
      subtitle: 'El cliente confirmó tu propuesta para iniciar el trabajo.',
      time: 'Hace 1 min'
    }
  ];

  // Rotate preview cards automatically every 3.5 seconds
  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setInterval(() => {
      setActivePreviewIndex((prev) => (prev + 1) % previewItems.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isModalOpen, previewItems.length]);

  // Check initial FCM status
  useEffect(() => {
    const checkStatus = async () => {
      const status = await fcmService.getStatus();
      setFcmStatus(status);

      // Listen for custom trigger events from anywhere in the app
      const handleCustomEvent = () => {
        setInternalIsOpen(true);
      };

      window.addEventListener(NOTIFICATION_PROMPT_EVENT, handleCustomEvent);

      // Auto-prompt logic:
      if (autoPrompt && status.permission === 'default' && status.isSupported) {
        const snoozeKey = currentUser?.uid 
          ? `notif_prompt_snooze_${currentUser.uid}` 
          : 'notif_prompt_snooze_guest';
        const snoozedUntil = Number(safeLocalStorage.getItem(snoozeKey) || 0);
        
        // Show after 4.5 seconds if not snoozed in the last 48 hours
        if (Date.now() > snoozedUntil) {
          const timeout = setTimeout(() => {
            setInternalIsOpen(true);
          }, 4500);
          return () => clearTimeout(timeout);
        }
      }

      return () => {
        window.removeEventListener(NOTIFICATION_PROMPT_EVENT, handleCustomEvent);
      };
    };

    checkStatus();
  }, [autoPrompt, currentUser]);

  const handleClose = () => {
    // Snooze for 48 hours so we don't spam the user
    const snoozeKey = currentUser?.uid 
      ? `notif_prompt_snooze_${currentUser.uid}` 
      : 'notif_prompt_snooze_guest';
    const twoDaysMs = Date.now() + 48 * 60 * 60 * 1000;
    safeLocalStorage.setItem(snoozeKey, String(twoDaysMs));

    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setDeniedGuide(false);
    setErrorMessage(null);
  };

  const handleRequestPermission = async () => {
    setRequesting(true);
    setErrorMessage(null);

    try {
      const res = await fcmService.requestPermissionAndGetToken(currentUser?.uid);
      const updatedStatus = await fcmService.getStatus();
      setFcmStatus(updatedStatus);

      if (res.success || updatedStatus.permission === 'granted') {
        // Play pleasant notification sound
        fcmService.playNotificationSound();

        // Trigger immediate test push
        await fcmService.triggerTestNotification();

        setSuccessCelebration(true);
        setTimeout(() => {
          setSuccessCelebration(false);
          handleClose();
        }, 2200);
      } else {
        if (updatedStatus.permission === 'denied') {
          setDeniedGuide(true);
        } else {
          setErrorMessage(res.error || 'No se pudieron activar las notificaciones.');
        }
      }
    } catch (err: any) {
      console.warn('[NotificationPrompt] Error requesting permission:', err);
      setErrorMessage('Hubo un inconveniente al solicitar los permisos del navegador.');
    } finally {
      setRequesting(false);
    }
  };

  // If already granted, don't show the prompt
  if (fcmStatus?.permission === 'granted' && !isModalOpen) {
    return null;
  }

  return (
    <>
      {/* Main Attention-Grabbing Permission Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl border border-indigo-500/40 shadow-2xl shadow-indigo-500/20 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Atmospheric Glow Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10 cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>

            {/* Modal Content */}
            <div className="p-6 sm:p-7">
              {/* SUCCESS CELEBRATION VIEW */}
              {successCelebration ? (
                <div className="py-8 text-center space-y-4 animate-in zoom-in-90 duration-300">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={44} className="animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    ¡Notificaciones Activadas! 🎉
                  </h3>
                  <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Te acabamos de enviar una alerta de prueba. A partir de ahora recibirás avisos inmediatos de trabajos, presupuestos y mensajes en Bahía Blanca.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    <Volume2 size={14} />
                    <span>Sonido y alertas visuales configurados</span>
                  </div>
                </div>
              ) : deniedGuide ? (
                /* INSTRUCTIONS IF PERMISSION WAS PREVIOUSLY DENIED BY BROWSER */
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Las notificaciones están bloqueadas
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tu navegador bloqueó el permiso anteriormente. Desbloquealo en 2 simples pasos:
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 text-xs text-slate-200">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <p>
                        Hacé clic en el ícono del <strong>candado 🔒 o ajustes</strong> ubicado a la izquierda de la dirección web (URL) en tu navegador.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <p>
                        Buscá la opción <strong>"Notificaciones"</strong> y cambiala a <strong>"Permitir"</strong>. Luego recargá la página.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                    >
                      Recargar Página
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* MAIN ENGAGING OPT-IN VIEW */
                <div className="space-y-5">
                  {/* Header with animated ringing bell badge */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Bell size={28} className="animate-wiggle" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                        ✓
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-extrabold uppercase tracking-wider">
                        <Sparkles size={12} className="text-amber-300" />
                        {currentUser?.rol === 'profesional' 
                          ? 'Alertas de Nuevos Trabajos' 
                          : 'Respuestas y Mensajes en Vivo'}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                        {currentUser?.rol === 'profesional'
                          ? '¡Sé el primero en cotizar y ganar trabajos en Bahía!'
                          : '¡Recibí alertas instantáneas de presupuestos y mensajes!'}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Activá las alertas en tu dispositivo para enterarte al instante de nuevos pedidos, cotizaciones y respuestas directas en Bahía Blanca.
                  </p>

                  {/* Dynamic Notification Preview Carousel */}
                  <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3.5 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> Así se ven tus alertas en tiempo real:
                      </span>
                      <span className="text-indigo-400">
                        {activePreviewIndex + 1} de {previewItems.length}
                      </span>
                    </div>

                    {/* Active Simulated Notification Card */}
                    {(() => {
                      const item = previewItems[activePreviewIndex];
                      const IconComp = item.icon;
                      return (
                        <div 
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 shadow-md flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-right-2"
                        >
                          <div className={`p-2 rounded-xl text-white ${item.iconBg} shrink-0 mt-0.5 shadow-sm`}>
                            <IconComp size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${item.tagColor}`}>
                                {item.tag}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {item.time}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white truncate">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Dots indicator */}
                    <div className="flex justify-center gap-1.5 pt-1">
                      {previewItems.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePreviewIndex(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === activePreviewIndex 
                              ? 'w-6 bg-indigo-500' 
                              : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                          }`}
                          aria-label={`Ver vista previa ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 3 Clear Benefit Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <Zap size={14} className="shrink-0" />
                        <span>Nuevos Trabajos</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Avisos al momento en que un cliente solicita un rubro.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                        <MessageSquare size={14} className="shrink-0" />
                        <span>Chat en Vivo</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Enterate al instante cuando te escriben un mensaje.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <ShieldCheck size={14} className="shrink-0" />
                        <span>Cero Spam</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        100% gratis y podés desactivarlo con 1 clic.
                      </p>
                    </div>
                  </div>

                  {/* Error notice if needed */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      disabled={requesting}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
                    >
                      {requesting ? (
                        <>
                          <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Solicitando permiso...</span>
                        </>
                      ) : (
                        <>
                          <Bell size={18} className="text-amber-300 group-hover:rotate-12 transition-transform" />
                          <span>Permitir Notificaciones Ahora</span>
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 font-semibold transition-colors text-center cursor-pointer"
                    >
                      Quizás más tarde
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
