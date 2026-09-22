import React, { useState, useEffect } from 'react';
import { 
  MessageSquarePlus, 
  X, 
  Bug, 
  Lightbulb, 
  Star, 
  Send, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  HelpCircle,
  ThumbsUp
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { UserFeedback } from '../types';

export const FeedbackWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tipo, setTipo] = useState<'error' | 'mejora' | 'calificacion'>('mejora');
  const [categoria, setCategoria] = useState('General');
  const [mensaje, setMensaje] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) {
      setErrorMsg('Por favor contanos brevemente qué te gustaría sugerir o qué error ocurrió.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const feedbackPayload: Partial<UserFeedback> = {
        tipo,
        categoria,
        mensaje: mensaje.trim(),
        rating,
        url: window.location.href,
        ruta: window.location.pathname,
        usuarioId: currentUser?.uid || null,
        usuarioEmail: currentUser?.email || contactEmail.trim() || null,
        usuarioNombre: currentUser?.nombre || null,
        usuarioRol: currentUser?.rol || 'visitante',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        pantalla: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        estado: 'pendiente',
        fecha: serverTimestamp()
      };

      await addDoc(collection(db, 'feedback'), feedbackPayload);

      setSubmitted(true);
      setMensaje('');
      setTimeout(() => {
        // Leave message visible for a moment then allow reset
      }, 500);
    } catch (err: any) {
      console.error('Error saving feedback:', err);
      setErrorMsg('No se pudo enviar el reporte. Por favor intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setErrorMsg('');
      setMensaje('');
      setRating(5);
    }, 300);
  };

  return (
    <>
      {/* Floating launcher button: bottom-left to balance HelpChatbot on bottom-right */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={() => {
            if (isOpen) {
              handleResetAndClose();
            } else {
              setIsOpen(true);
            }
          }}
          aria-label="Reportar error o sugerir mejora"
          className="group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-slate-900/90 hover:bg-slate-900 dark:bg-white/90 dark:hover:bg-white text-white dark:text-slate-900 shadow-xl backdrop-blur-md border border-slate-700/50 dark:border-slate-200/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <MessageSquarePlus size={18} className="text-amber-400 dark:text-indigo-600 transition-transform group-hover:rotate-6" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <span className="font-semibold text-xs tracking-tight">
            Sugerencias / Feedback
          </span>
        </button>
      </div>

      {/* Slide-in Modal Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      Tu opinión nos ayuda a crecer
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Reportá errores o sugerí funciones para Bahía Oficios
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetAndClose}
                  aria-label="Cerrar ventana de feedback"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        ¡Muchas gracias por tu mensaje!
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Revisamos cada reporte para que encontrar y ofrecer trabajo en Bahía Blanca sea cada vez más fácil y confiable.
                      </p>
                    </div>
                    <div className="pt-4 flex justify-center gap-3">
                      <button
                        onClick={handleResetAndClose}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors shadow-sm"
                      >
                        Cerrar
                      </button>
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          setMensaje('');
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Enviar otra sugerencia
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Type Selector Buttons */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                        ¿De qué se trata tu mensaje?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setTipo('error')}
                          className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            tipo === 'error'
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <Bug size={18} className={tipo === 'error' ? 'text-rose-600' : 'text-slate-400'} />
                          <span className="text-[11px] font-bold leading-tight">Reportar Error</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTipo('mejora')}
                          className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            tipo === 'mejora'
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <Lightbulb size={18} className={tipo === 'mejora' ? 'text-indigo-600' : 'text-slate-400'} />
                          <span className="text-[11px] font-bold leading-tight">Sugerir Idea</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTipo('calificacion')}
                          className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            tipo === 'calificacion'
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <Star size={18} className={tipo === 'calificacion' ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
                          <span className="text-[11px] font-bold leading-tight">Calificar Web</span>
                        </button>
                      </div>
                    </div>

                    {/* Star Rating Scale */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          ¿Cómo calificarías tu experiencia hoy?
                        </span>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {rating === 5 && '¡Excelente!'}
                          {rating === 4 && 'Muy buena'}
                          {rating === 3 && 'Aceptable'}
                          {rating === 2 && 'Regular'}
                          {rating === 1 && 'Necesita mejorar'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            className="p-1 text-slate-300 dark:text-slate-600 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              size={24}
                              className={`transition-colors ${
                                (hoverRating !== null ? star <= hoverRating : star <= rating)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Área o sección relacionada
                      </label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="General">General / Toda la plataforma</option>
                        <option value="Buscador y Filtros">Búsqueda de profesionales y oficios</option>
                        <option value="Presupuestos y Trabajos">Solicitud de presupuestos / Bolsa de trabajo</option>
                        <option value="Contacto y WhatsApp">Contacto vía WhatsApp o Chat interno</option>
                        <option value="Perfil y Reseñas">Perfiles, fotos de trabajos o calificaciones</option>
                        <option value="Registro y Acceso">Registro, verificación o inicio de sesión</option>
                        <option value="Velocidad y Móvil">Velocidad de carga o diseño en celular</option>
                      </select>
                    </div>

                    {/* Message Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {tipo === 'error' && '¿Qué error ocurrió y cómo reproducirlo?'}
                          {tipo === 'mejora' && '¿Qué idea o mejora te gustaría tener?'}
                          {tipo === 'calificacion' && 'Comentarios o sugerencias'}
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {mensaje.length}/500
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder={
                          tipo === 'error'
                            ? 'Ej: Al hacer clic en pedir presupuesto para plomero no cargó el formulario en mi teléfono...'
                            : tipo === 'mejora'
                            ? 'Ej: Me gustaría poder filtrar profesionales que trabajen los sábados por la tarde...'
                            : 'Contanos qué te parece Bahía Oficios y qué podemos sumar...'
                        }
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      />
                    </div>

                    {/* Email for Guests or User Confirmation */}
                    {currentUser ? (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>
                          Enviando como <strong>{currentUser.nombre || currentUser.email}</strong> ({currentUser.rol})
                        </span>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Tu email (opcional, si querés que te avisemos la resolución)
                        </label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="nombre@ejemplo.com"
                          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {/* Context info pill */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span>Página actual: <code className="text-slate-600 dark:text-slate-300">{window.location.pathname}</code></span>
                      <span className="flex items-center gap-1">
                        <HelpCircle size={10} /> Confidencial & Directo
                      </span>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
                        {errorMsg}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={handleResetAndClose}
                        className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !mensaje.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Enviar Feedback</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
