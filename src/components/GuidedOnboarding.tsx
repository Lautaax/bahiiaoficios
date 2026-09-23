import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Briefcase, MessageSquare, X, ChevronRight, ChevronLeft, 
  Sparkles, CheckCircle2, HelpCircle, ArrowRight, Mic, MapPin, 
  MessageCircle, ExternalLink, RotateCcw, Zap, ShieldCheck, Check
} from 'lucide-react';
import { safeLocalStorage } from '../utils/storage';
import { useNavigate, useLocation } from 'react-router-dom';

export interface TourStep {
  id: string;
  targetId?: string;
  fallbackTargetId?: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  tipText: string;
  previewType: 'search' | 'quotes' | 'chat';
  actionButton?: {
    label: string;
    action: () => void;
  };
}

const STORAGE_KEY = 'bahia_oficios_onboarding_completed_v1';
const PROMPT_SEEN_KEY = 'bahia_oficios_onboarding_prompt_seen_v1';
const TOUR_EVENT = 'bahia_start_onboarding_tour';

// Helper function so any component (Navbar, Help page, Footer) can trigger the tour
export const triggerOnboardingTour = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT));
  }
};

export const GuidedOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [showPromptBanner, setShowPromptBanner] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'center' }>({
    top: 0,
    left: 0,
    placement: 'bottom'
  });
  const [isCompletedState, setIsCompletedState] = useState(false);

  const isNavigatingRef = useRef(false);

  // 3 Core Steps as requested:
  // 1. Cómo buscar profesionales
  // 2. Cómo solicitar presupuestos
  // 3. Cómo contactar mediante el chat
  const steps: TourStep[] = [
    {
      id: 'search',
      targetId: 'onboarding-search-step',
      fallbackTargetId: 'onboarding-search-input',
      title: 'Cómo buscar profesionales',
      subtitle: 'Encontrá especialistas calificados en Bahía Blanca',
      description: 'Escribí el oficio que necesitás (plomero, electricista, gasista, etc.) o usá el dictado por voz tocando el micrófono. Podés filtrar por zona o barrio y ver valoraciones de otros clientes.',
      badge: 'Paso 1: Búsqueda rápida',
      icon: Search,
      accentColor: 'indigo',
      tipText: '💡 Tip: Probá la búsqueda por voz tocando el micrófono o explorá las categorías rápidas.',
      previewType: 'search',
      actionButton: {
        label: 'Probar buscador con "Electricista"',
        action: () => {
          const input = document.getElementById('onboarding-search-input') as HTMLInputElement | null;
          if (input) {
            input.focus();
            input.value = 'Electricista';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    },
    {
      id: 'quotes',
      targetId: 'onboarding-quotes-step',
      fallbackTargetId: 'onboarding-nav-jobs',
      title: 'Cómo solicitar presupuestos',
      subtitle: 'Publicá gratis lo que necesitás y compará cotizaciones',
      description: '¿Tenés una obra, reparación o urgencia? Entrá a "Trabajos Solicitados" y creá tu publicación sin ningún costo ni comisión. Los profesionales verificados te enviarán presupuestos y vos elegís.',
      badge: 'Paso 2: Presupuestos sin costo',
      icon: Briefcase,
      accentColor: 'emerald',
      tipText: '💡 Tip: Es 100% gratuito para clientes. Vos decidís qué cotización te conviene y acordás directamente.',
      previewType: 'quotes',
      actionButton: {
        label: 'Ir a Trabajos Solicitados',
        action: () => {
          navigate('/trabajos');
        }
      }
    },
    {
      id: 'chat',
      targetId: 'onboarding-chat-step',
      fallbackTargetId: 'onboarding-featured-pros',
      title: 'Cómo contactar por chat y WhatsApp',
      subtitle: 'Trato directo e instantáneo sin intermediarios',
      description: 'Al ver un profesional podés iniciar un chat interno en tiempo real para acordar detalles o escribirle directamente a su WhatsApp oficial con un solo toque.',
      badge: 'Paso 3: Contacto directo',
      icon: MessageSquare,
      accentColor: 'amber',
      tipText: '💡 Tip: Todos tus mensajes quedan respaldados en la sección "Mis Chats" de la barra superior.',
      previewType: 'chat'
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Element calculation and positioning
  const updateTargetRect = useCallback(() => {
    if (!isOpen || isCompletedState) {
      setTargetRect(null);
      return;
    }

    const targetId = currentStep?.targetId;
    let element: HTMLElement | null = null;
    
    if (targetId) {
      element = document.getElementById(targetId);
      if (!element && currentStep.fallbackTargetId) {
        element = document.getElementById(currentStep.fallbackTargetId);
      }
    }

    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect(rect);

    // Scroll into view if needed
    const isInViewport = (
      rect.top >= 60 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - 60
    );

    if (!isInViewport && !isNavigatingRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Determine tooltip position
    const tooltipWidth = Math.min(window.innerWidth - 32, 450);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'top' | 'bottom' | 'center' = 'bottom';
    let top = 0;
    let left = Math.max(16, Math.min(rect.left + (rect.width / 2) - (tooltipWidth / 2), window.innerWidth - tooltipWidth - 16));

    if (window.innerWidth < 640) {
      // Mobile positioning: center-aligned or placed with safe bounds
      if (rect.top > window.innerHeight / 2) {
        placement = 'top';
        top = Math.max(65, rect.top - 360);
      } else {
        placement = 'bottom';
        top = Math.min(window.innerHeight - 380, rect.bottom + 14);
      }
      left = 16;
    } else {
      if (spaceBelow >= 340 || spaceBelow >= spaceAbove) {
        placement = 'bottom';
        top = rect.bottom + 14;
      } else {
        placement = 'top';
        top = Math.max(20, rect.top - 340);
      }
    }

    setTooltipPosition({ top, left, placement });
  }, [isOpen, isCompletedState, currentStep]);

  // First time visitor prompt banner - strictly runs ONLY ONCE and never repeats
  useEffect(() => {
    try {
      const hasCompleted = safeLocalStorage.getItem(STORAGE_KEY);
      const hasSeenPrompt = safeLocalStorage.getItem(PROMPT_SEEN_KEY);
      if (!hasCompleted && !hasSeenPrompt) {
        // Record immediately that the prompt was triggered so it will never repeat again
        safeLocalStorage.setItem(PROMPT_SEEN_KEY, 'true');
        const timer = setTimeout(() => {
          setShowPromptBanner(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch {
      // fallback safe
    }
  }, []);

  // Listen for custom trigger event
  useEffect(() => {
    const handleStartTour = () => {
      setShowPromptBanner(false);
      setIsCompletedState(false);
      setCurrentStepIndex(0);

      if (location.pathname !== '/') {
        isNavigatingRef.current = true;
        navigate('/');
        setTimeout(() => {
          isNavigatingRef.current = false;
          setIsOpen(true);
        }, 350);
      } else {
        setIsOpen(true);
      }
    };

    window.addEventListener(TOUR_EVENT, handleStartTour);
    return () => window.removeEventListener(TOUR_EVENT, handleStartTour);
  }, [location.pathname, navigate]);

  // Recalculate rect on step change or resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    const handleResizeOrScroll = () => {
      requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [isOpen, currentStepIndex, isCompletedState, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isCompletedState]);

  const handleStartTour = () => {
    setShowPromptBanner(false);
    setIsCompletedState(false);
    setCurrentStepIndex(0);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => setIsOpen(true), 300);
    } else {
      setIsOpen(true);
    }
  };

  const handleCloseTour = () => {
    setIsOpen(false);
    setIsCompletedState(false);
    try {
      safeLocalStorage.setItem(STORAGE_KEY, 'true');
      safeLocalStorage.setItem(PROMPT_SEEN_KEY, 'true');
    } catch {
      // safe
    }
  };

  const handleDismissPrompt = () => {
    setShowPromptBanner(false);
    try {
      safeLocalStorage.setItem(STORAGE_KEY, 'true');
      safeLocalStorage.setItem(PROMPT_SEEN_KEY, 'true');
    } catch {
      // safe
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Show completion celebration
      setIsCompletedState(true);
      try {
        safeLocalStorage.setItem(STORAGE_KEY, 'true');
        safeLocalStorage.setItem(PROMPT_SEEN_KEY, 'true');
      } catch {
        // safe
      }
    }
  };

  const handlePrev = () => {
    if (isCompletedState) {
      setIsCompletedState(false);
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const StepIcon = currentStep?.icon || Sparkles;

  // Mini preview renderer based on step
  const renderMiniPreview = (type: 'search' | 'quotes' | 'chat') => {
    if (type === 'search') {
      return (
        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 mb-3.5">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <Search size={13} className="text-indigo-500" />
            <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Electricista en Villa Mitre...</span>
            <Mic size={13} className="text-rose-500 animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
              ⚡ Electricistas
            </span>
            <span className="text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200/60 dark:border-sky-800/60">
              🔧 Plomería
            </span>
            <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
              🔥 Gasistas
            </span>
            <span className="text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-800/60">
              🚨 24 Horas
            </span>
          </div>
        </div>
      );
    }

    if (type === 'quotes') {
      return (
        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 mb-3.5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">1</span>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">Publicás tu pedido</p>
              <p className="text-[9px] text-slate-400">Gratis en 1 min</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">2</span>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">Recibís ofertas</p>
              <p className="text-[9px] text-slate-400">De especialistas</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-base font-black text-amber-600 dark:text-amber-400">3</span>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mt-0.5">Elegís y listo</p>
              <p className="text-[9px] text-slate-400">Sin comisiones</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'chat') {
      return (
        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 mb-3.5">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <MessageCircle size={14} />
              <span>WhatsApp Directo</span>
            </span>
            <span className="text-slate-400 font-bold">+</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              <MessageSquare size={14} />
              <span>Chat Interno</span>
            </span>
          </div>
          <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2">
            Hablás directo con el profesional en Bahía Blanca sin intermediarios
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* 1. First-time invitation prompt banner */}
      <AnimatePresence>
        {showPromptBanner && !isOpen && (
          <motion.aside
            id="onboarding-welcome-prompt"
            aria-label="Invitación al tutorial interactivo"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-5 left-4 sm:left-6 z-50 max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-2xl rounded-2xl p-4 sm:p-5 text-slate-900 dark:text-white"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Guía de bienvenida
                  </span>
                  <button 
                    onClick={handleDismissPrompt}
                    aria-label="Cerrar aviso"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  >
                    <X size={15} />
                  </button>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  ¿Es tu primera vez en Bahía Oficios?
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Hacé un recorrido rápido de 1 minuto para ver cómo <strong>buscar profesionales</strong>, <strong>pedir presupuestos</strong> y <strong>chatear directo</strong>.
                </p>

                <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id="btn-start-onboarding-tour"
                    onClick={handleStartTour}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <span>Iniciar recorrido</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    id="btn-dismiss-onboarding-tour"
                    onClick={handleDismissPrompt}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Omitir
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Interactive Spotlight Backdrop and Tooltips */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] pointer-events-auto">
            {/* SVG cutout mask overlay for spotlight effect */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-auto"
              style={{ width: '100vw', height: '100vh' }}
              onClick={handleCloseTour}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && !isCompletedState && (
                    <rect
                      x={Math.max(0, targetRect.left - 8)}
                      y={Math.max(0, targetRect.top - 8)}
                      width={targetRect.width + 16}
                      height={targetRect.height + 16}
                      rx="16"
                      ry="16"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.78)"
                mask="url(#tour-spotlight-mask)"
              />
            </svg>

            {/* Glowing spotlight border around target element */}
            {targetRect && !isCompletedState && (
              <div
                className="absolute pointer-events-none transition-all duration-300 rounded-2xl border-2 border-indigo-400 ring-4 ring-indigo-500/30 animate-pulse shadow-2xl"
                style={{
                  top: Math.max(0, targetRect.top - 8),
                  left: Math.max(0, targetRect.left - 8),
                  width: targetRect.width + 16,
                  height: targetRect.height + 16,
                }}
              />
            )}

            {/* Completion Screen Modal */}
            {isCompletedState ? (
              <motion.div
                id="onboarding-completion-card"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[calc(100vw-32px)] max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 text-center text-slate-900 dark:text-white"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>

                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  ¡Recorrido completado!
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 mb-2">
                  ¡Ya conocés cómo funciona Bahía Oficios!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  Podés buscar profesionales en cualquier momento, publicar trabajos para recibir presupuestos gratis y contactar vía chat o WhatsApp.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 mb-6 flex items-center gap-2 text-left">
                  <HelpCircle size={18} className="text-indigo-500 shrink-0" />
                  <span>¿Querés volver a ver esta guía? Hacé clic en <strong>"¿Cómo funciona?"</strong> en la barra superior.</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    onClick={handleCloseTour}
                    className="w-full sm:flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Comenzar a explorar
                  </button>
                  <button
                    onClick={() => {
                      setIsCompletedState(false);
                      setCurrentStepIndex(0);
                    }}
                    className="w-full sm:w-auto py-3 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    <span>Repetir tour</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Interactive Step Tooltip Card */
              <motion.div
                id="onboarding-tooltip-card"
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'fixed',
                  top: targetRect ? tooltipPosition.top : '50%',
                  left: targetRect ? tooltipPosition.left : '50%',
                  transform: targetRect ? undefined : 'translate(-50%, -50%)',
                  maxWidth: '450px',
                  width: 'calc(100vw - 32px)',
                }}
                className="z-[10000] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 shadow-2xl rounded-2xl p-5 text-slate-900 dark:text-slate-100"
              >
                {/* Header with Badge, Step Counter, Close */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    <StepIcon size={13} className="text-indigo-600 dark:text-indigo-400" />
                    <span>{currentStep.badge}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {currentStepIndex + 1} de {steps.length}
                    </span>
                    <button
                      onClick={handleCloseTour}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Cerrar tutorial (Esc)"
                      aria-label="Cerrar tutorial"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Step Title & Subtitle */}
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                  {currentStep.title}
                </h3>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 mb-2.5">
                  {currentStep.subtitle}
                </p>

                {/* Main Description */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                  {currentStep.description}
                </p>

                {/* Visual Mini-Preview Illustration */}
                {renderMiniPreview(currentStep.previewType)}

                {/* Tip Callout */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 mb-3.5 leading-normal">
                  {currentStep.tipText}
                </div>

                {/* Action button if present */}
                {currentStep.actionButton && (
                  <div className="mb-3.5">
                    <button
                      type="button"
                      onClick={currentStep.actionButton.action}
                      className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      <span>{currentStep.actionButton.label}</span>
                    </button>
                  </div>
                )}

                {/* Footer Dots & Navigation */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {steps.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => setCurrentStepIndex(idx)}
                        title={`Ir a paso ${idx + 1}`}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentStepIndex 
                            ? 'w-6 bg-indigo-600 dark:bg-indigo-400' 
                            : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                        aria-label={`Paso ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStepIndex > 0 && (
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft size={14} />
                        <span>Anterior</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <span>{currentStepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
                      {currentStepIndex === steps.length - 1 ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GuidedOnboarding;
