import React, { useState, useMemo } from 'react';
import { 
  X, 
  MessageCircle, 
  Share2, 
  Check, 
  MapPin, 
  Users, 
  Sparkles, 
  Send, 
  Copy, 
  ThumbsUp, 
  Building2 
} from 'lucide-react';
import { ZONAS } from '../constants';

export interface NeighborhoodShareProfessional {
  uid: string;
  nombre: string;
  rubro: string;
  zona?: string;
  ratingAvg?: number;
  slug?: string;
  haceUrgencias?: boolean;
}

export interface NeighborhoodShareJob {
  id: string;
  titulo: string;
  rubro: string;
  zona?: string;
  presupuestoEstimado?: number | string;
  urgencia?: string;
}

interface NeighborhoodWhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  professional?: NeighborhoodShareProfessional | null;
  job?: NeighborhoodShareJob | null;
  initialBarrio?: string;
}

const POPULAR_BARRIOS = [
  'Villa Mitre',
  'Palihue',
  'Universitario',
  'General Daniel Cerri',
  'Macrocentro',
  'Centro',
  'Patagonia',
  'Tiro Federal',
  'Ingeniero White',
  'Bella Vista'
];

export const NeighborhoodWhatsAppShareModal: React.FC<NeighborhoodWhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  professional,
  job,
  initialBarrio
}) => {
  const [selectedBarrio, setSelectedBarrio] = useState<string>(
    initialBarrio || professional?.zona || job?.zona || 'Bahía Blanca'
  );
  const [copied, setCopied] = useState(false);

  // Sync if props change
  React.useEffect(() => {
    if (initialBarrio) {
      setSelectedBarrio(initialBarrio);
    } else if (professional?.zona && professional.zona !== 'Todas') {
      setSelectedBarrio(professional.zona);
    } else if (job?.zona && job.zona !== 'Todas') {
      setSelectedBarrio(job.zona);
    }
  }, [initialBarrio, professional?.zona, job?.zona]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bahiaoficios.com';

  const shareText = useMemo(() => {
    const barrioName = selectedBarrio && selectedBarrio !== 'Todas' ? selectedBarrio : 'Bahía Blanca';

    if (professional) {
      const url = `${origin}/profesional/${professional.slug || professional.uid}`;
      const rating = professional.ratingAvg ? `⭐ Calificación: ${professional.ratingAvg.toFixed(1)}/5` : '⭐ Verificado en Bahía Oficios';
      const urgencias = professional.haceUrgencias ? '🚨 Atiende Urgencias\n' : '';

      return `👋 ¡Hola vecinos de ${barrioName}!

Les paso el contacto de un profesional muy recomendado para trabajos en el barrio:

🛠️ *${professional.nombre}* (${professional.rubro})
📍 Zona de cobertura: ${professional.zona || barrioName}
${rating}
${urgencias}
📲 Pueden ver sus fotos de trabajos, opiniones de vecinos y pedir presupuesto sin cargo acá:
${url}

(Compartido desde Bahía Oficios para nuestro grupo barrial 🏘️)`;
    }

    if (job) {
      const url = `${origin}/trabajos?id=${job.id}`;
      const precio = job.presupuestoEstimado 
        ? `💰 Presupuesto estimado: ${typeof job.presupuestoEstimado === 'number' ? `$${job.presupuestoEstimado.toLocaleString('es-AR')}` : job.presupuestoEstimado}\n` 
        : '';
      
      return `🔨 *Vecinos de ${barrioName} (Bahía Blanca):*

Se publicó un pedido de trabajo para *${job.rubro}*:
"${job.titulo}"
📍 Barrio: ${job.zona || barrioName}
${precio}
Si conocen a un trabajador disponible o son del oficio, pueden ver el detalle y pasar presupuesto acá:
${url}

(Ayudemos a contratar mano de obra local en Bahía Blanca 🇦🇷)`;
    }

    // Fallback: general portal share
    return `👋 ¡Hola vecinos de ${barrioName}! Les comparto *Bahía Oficios*, la plataforma comunitaria para encontrar plomeros, electricistas, albañiles y gasistas en Bahía Blanca sin comisiones ni intermediarios:
${origin}

(Ideal para tener a mano en el grupo vecinal 🛠️)`;
  }, [professional, job, selectedBarrio, origin]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleWhatsAppSend = () => {
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-white fill-white/20" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase">
                <Users size={11} />
                <span>Grupos Barriales</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight mt-0.5">
                Compartir en WhatsApp del Barrio
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Barrio Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-emerald-600" />
              <span>¿Para qué barrio o grupo vecinal es la recomendación?</span>
            </label>

            {/* Quick Barrio Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {POPULAR_BARRIOS.map((barrio) => (
                <button
                  key={barrio}
                  type="button"
                  onClick={() => setSelectedBarrio(barrio)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-semibold transition-all border cursor-pointer ${
                    selectedBarrio === barrio
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {barrio}
                </button>
              ))}
            </div>

            {/* Complete Barrio Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">O seleccioná otro barrio:</span>
              <select
                value={selectedBarrio}
                onChange={(e) => setSelectedBarrio(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bahía Blanca">Toda Bahía Blanca</option>
                {ZONAS.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* WhatsApp Preview Bubble */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vista previa del mensaje:
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles size={11} /> 100% optimizado para WhatsApp
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#EFEAE2] dark:bg-slate-800/90 border border-emerald-900/10 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
              {shareText}
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 leading-snug flex items-start gap-2">
            <ThumbsUp size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Ayudá a tus vecinos de Bahía Blanca:</strong> Al compartir presupuestos y profesionales en tu grupo vecinal (Palihue, Cerri, Villa Mitre, etc.) fomentás el empleo local y evitás estafas.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={15} className="text-emerald-600" />
                <span className="text-emerald-600">¡Mensaje copiado!</span>
              </>
            ) : (
              <>
                <Copy size={15} />
                <span>Copiar texto</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppSend}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Send size={15} />
            <span>Abrir WhatsApp y Enviar al Grupo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
