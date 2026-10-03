import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle2, MessageCircle, AlertCircle, Sparkles, Send } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { quoteReminderService } from '../services/quoteReminderService';

export interface ReviewReminderDetail {
  profesionalId?: string;
  profesionalNombre?: string;
  rubro?: string;
  clienteTelefono?: string;
}

export const OPEN_REVIEW_REMINDER_EVENT = 'open-review-reminder-event';

export const triggerReviewReminderModal = (detail?: ReviewReminderDetail) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_REVIEW_REMINDER_EVENT, { detail }));
  }
};

interface ReviewReminderModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  profesionalId?: string;
  profesionalNombre?: string;
  rubro?: string;
  clienteTelefono?: string;
}

export const ReviewReminderModal: React.FC<ReviewReminderModalProps> = ({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  profesionalId: propsProId = '',
  profesionalNombre: propsProNombre = 'tu profesional',
  rubro: propsRubro = 'el trabajo',
  clienteTelefono: propsClienteTelefono = ''
}) => {
  const { currentUser } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [data, setData] = useState<ReviewReminderDetail>({
    profesionalId: propsProId,
    profesionalNombre: propsProNombre,
    rubro: propsRubro,
    clienteTelefono: propsClienteTelefono
  });

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar datos si vienen por props
  useEffect(() => {
    if (propsIsOpen !== undefined) {
      setInternalOpen(propsIsOpen);
    }
    if (propsProId || propsProNombre || propsRubro) {
      setData({
        profesionalId: propsProId,
        profesionalNombre: propsProNombre,
        rubro: propsRubro,
        clienteTelefono: propsClienteTelefono
      });
    }
  }, [propsIsOpen, propsProId, propsProNombre, propsRubro, propsClienteTelefono]);

  // Escuchar evento global
  useEffect(() => {
    const handleOpen = (e: any) => {
      const detail = e.detail as ReviewReminderDetail | undefined;
      if (detail) {
        setData({
          profesionalId: detail.profesionalId || '',
          profesionalNombre: detail.profesionalNombre || 'tu profesional',
          rubro: detail.rubro || 'el trabajo',
          clienteTelefono: detail.clienteTelefono || ''
        });
      }
      setInternalOpen(true);
    };

    window.addEventListener(OPEN_REVIEW_REMINDER_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_REVIEW_REMINDER_EVENT, handleOpen);
  }, []);

  const handleClose = () => {
    setInternalOpen(false);
    if (propsOnClose) propsOnClose();
  };

  if (!internalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comentario.trim()) {
      setErrorMsg('Por favor contanos brevemente cómo fue la atención y el trabajo.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await addDoc(collection(db, 'resenas'), {
        profesionalId: data.profesionalId || 'general',
        profesionalNombre: data.profesionalNombre || 'Profesional',
        clienteId: currentUser?.uid || 'invitado',
        clienteNombre: currentUser?.nombre || 'Vecino de Bahía',
        clienteFoto: currentUser?.fotoUrl || '',
        calificacion: rating,
        comentario: comentario.trim(),
        rubro: data.rubro || 'Oficios',
        fecha: serverTimestamp(),
        origen: 'recordatorio_5_dias'
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setComentario('');
        handleClose();
      }, 2200);
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setErrorMsg('Hubo un error al registrar tu reseña. Por favor intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const whatsAppLink = data.clienteTelefono
    ? quoteReminderService.generateReviewWhatsAppLink(
        data.clienteTelefono, 
        currentUser?.nombre || 'Vecino', 
        data.rubro || 'el trabajo', 
        data.profesionalNombre
      )
    : null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30 shadow-inner">
              <Star size={20} className="fill-amber-400 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                Calificación a los 5 Días
              </span>
              <h3 className="text-base font-bold text-white mt-1">¿Pudiste realizar el trabajo?</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={34} className="animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">¡Muchas gracias por calificar!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Tu opinión ayuda a construir una comunidad de profesionales confiables en Bahía Blanca.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                Han pasado 5 días de tu consulta de <strong>{data.rubro}</strong> con <strong>{data.profesionalNombre}</strong>. ¿Cómo calificarías la atención, puntualidad y trabajo realizado?
              </div>

              {/* Star Rating Selector */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        size={28}
                        className={`${
                          star <= (hoverRating ?? rating)
                            ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                            : 'text-slate-300 dark:text-slate-600'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-2">
                  {rating === 5 && '⭐⭐⭐⭐⭐ ¡Excelente trabajo y puntualidad!'}
                  {rating === 4 && '⭐⭐⭐⭐ Muy buen servicio'}
                  {rating === 3 && '⭐⭐⭐ Aceptable / Cumplió'}
                  {rating === 2 && '⭐⭐ Regular / Hubo detalles'}
                  {rating === 1 && '⭐ Mala experiencia'}
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-700 dark:text-slate-300">
                  Tu comentario u opinión:
                </label>
                <textarea
                  rows={3}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Ej: Llegó puntual, presupuesto claro y dejó todo impecable en mi casa..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>{loading ? 'Guardando reseña...' : 'Publicar Calificación'}</span>
                </button>

                {whatsAppLink && (
                  <a
                    href={whatsAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <MessageCircle size={14} />
                    <span>Responder por WhatsApp</span>
                  </a>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
