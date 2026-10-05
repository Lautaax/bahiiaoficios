import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Share2, 
  ArrowLeft, 
  FolderOpen, 
  Calculator, 
  CheckCircle2, 
  Copy, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';

export const PresupuestarPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    document.title = 'Presupuestar Online • Contrato y Recibo Rápido | Bahía Oficios';
    window.scrollTo(0, 0);
  }, []);

  const initialJobTitle = searchParams.get('titulo') || searchParams.get('jobTitle') || '';
  const initialRubro = searchParams.get('rubro') || '';
  const initialClientName = searchParams.get('cliente') || searchParams.get('clientName') || '';
  const initialManoObra = searchParams.get('manoObra') || searchParams.get('mo') || '';
  const initialMateriales = searchParams.get('materiales') || searchParams.get('mat') || '';
  const initialAmount = searchParams.get('total') || searchParams.get('amount') || '';

  const handleCopyDirectLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-6 sm:py-10 px-3 sm:px-6">
      {/* Barra superior de navegación y utilidades */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Link
            to="/calculadora-costos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Calculadora de Cómputo</span>
          </Link>

          <Link
            to="/mis-presupuestos"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0f245c] dark:text-blue-300 font-bold transition-colors"
          >
            <FolderOpen size={14} />
            <span>Mis Presupuestos</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyDirectLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-bold transition-all shadow-xs cursor-pointer"
            title="Copiar enlace directo a esta página para compartir con clientes o colegas"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar Enlace (/presupuestar)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero informativo de la herramienta */}
      <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0f245c] to-blue-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <FileText size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Acceso Directo
                </span>
                <span className="text-xs text-slate-400 font-mono">bahiaoficios.com/presupuestar</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Presupuestador y Contrato Rápido
              </h1>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
            <span>Separación de Mano de Obra y Materiales</span>
            <span className="block font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              Genera PDF oficial con validez y envío directo a WhatsApp
            </span>
          </div>
        </div>
      </div>

      {/* Renderizado del generador en modo página completa */}
      <div className="max-w-4xl mx-auto">
        <ContratoPresupuestoModal
          isOpen={true}
          isStandalonePage={true}
          onClose={() => window.history.back()}
          initialJobTitle={initialJobTitle}
          initialRubro={initialRubro}
          initialClientName={initialClientName}
          initialManoObra={initialManoObra}
          initialMateriales={initialMateriales}
          initialAmount={initialAmount}
        />
      </div>
    </div>
  );
};
