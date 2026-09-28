import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JobPost } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  X, MapPin, DollarSign, Clock, User as UserIcon, 
  Briefcase, Send, MessageCircle, CheckCircle2, 
  Share2, AlertCircle, Phone, Check, ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface JobDetailModalProps {
  job: JobPost | null;
  isOpen: boolean;
  onClose: () => void;
  onQuote?: (job: JobPost) => void;
  onViewProposals?: (job: JobPost) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onQuote,
  onViewProposals
}) => {
  const { currentUser } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const isOwner = currentUser?.uid === job.clienteId;
  const isProfessional = currentUser?.rol === 'profesional';
  const proposalsCount = job.presupuestos?.length || 0;
  const myProposal = currentUser && job.presupuestos?.find(p => p.profesionalId === currentUser.uid);
  const alreadyQuoted = Boolean(myProposal);
  const isClosed = job.estado === 'completado' || job.estado === 'cancelado';

  const formatFullDate = (fecha: any): string => {
    if (!fecha) return 'Reciente';
    try {
      const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Reciente';
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/trabajos?jobId=${job.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const cleanPhone = job.clienteTelefono ? job.clienteTelefono.replace(/\D/g, '') : '';
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/549${cleanPhone}?text=${encodeURIComponent(`Hola ${job.clienteNombre || ''}, vi tu pedido de trabajo en Bahía Oficios sobre "${job.titulo}". Te contacto para coordinar.`)}`
    : null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-9999 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200 relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 flex items-start justify-between gap-4 bg-slate-50/60 dark:bg-slate-800/80">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                <Briefcase size={13} className="text-indigo-600 dark:text-indigo-400" />
                {job.rubro}
              </span>

              {job.urgencia === 'urgente' ? (
                <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  🚨 Urgente
                </span>
              ) : job.urgencia === 'esta_semana' ? (
                <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  ⚡ Esta semana
                </span>
              ) : (
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                  🕒 Flexible
                </span>
              )}

              {isClosed ? (
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">
                  Cerrado
                </span>
              ) : (
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">
                  Abierto para Cotizar
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {job.titulo}
            </h2>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              title="Copiar enlace de este trabajo"
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {copiedLink ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Zona</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                <MapPin size={15} className="text-indigo-500 shrink-0" />
                <span className="truncate">{job.zona}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Presupuesto</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                <DollarSign size={15} className="shrink-0" />
                <span className="truncate">{job.presupuestoAproximado || 'A convenir'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Publicado por</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-slate-800 dark:text-slate-200 text-sm">
                <UserIcon size={15} className="text-slate-400 shrink-0" />
                <span className="truncate">{job.clienteNombre || 'Vecino'}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Presupuestos</span>
              <div className="flex items-center gap-1.5 mt-1 font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                <MessageCircle size={15} className="shrink-0" />
                <span>{proposalsCount} {proposalsCount === 1 ? 'oferta' : 'ofertas'}</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Descripción completa del trabajo
            </h4>
            <div className="p-4 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {job.descripcion}
            </div>
          </div>

          {/* Date info */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock size={13} />
            <span>Publicado el {formatFullDate(job.fechaCreacion)} en Bahía Blanca</span>
          </div>

          {/* If current user already submitted a quote */}
          {alreadyQuoted && myProposal && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Ya enviaste tu cotización para este trabajo
                </span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  ${Number(myProposal.montoEstimado).toLocaleString('es-AR')}
                </span>
              </div>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                Tiempo estimado: <strong>{myProposal.tiempoEstimado}</strong>. Mensaje: "{myProposal.mensaje}"
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {copiedLink && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> ¡Enlace copiado al portapapeles!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isOwner ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewProposals?.(job);
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Ver Presupuestos Recibidos ({proposalsCount})
              </button>
            ) : isProfessional ? (
              !isClosed && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuote?.(job);
                  }}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
                >
                  <Send size={15} />
                  {alreadyQuoted ? 'Editar Mi Presupuesto' : 'Pasar Presupuesto Ahora'}
                </button>
              )
            ) : (
              <Link
                to={`/signup?role=profesional&redirect=${encodeURIComponent(`/trabajos?jobId=${job.id}&cotizar=true`)}`}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 text-center"
              >
                <Briefcase size={15} />
                Registrarme como Profesional para Cotizar
              </Link>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone size={15} className="text-emerald-600" />
                Contactar por WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
