import React, { useState } from 'react';
import { 
  HelpCircle, ArrowLeft, Mail, MessageCircle, FileQuestion, 
  Bot, Sparkles, ArrowRight, ShieldCheck, Scale, FileText, 
  Receipt, AlertTriangle, CheckCircle2, ThumbsUp, Users, ExternalLink 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { FAQ } from './FAQ';
import { triggerOnboardingTour } from './GuidedOnboarding';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';

export const Help: React.FC = () => {
  const [showContratoModal, setShowContratoModal] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <Link to="/" className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors">
        <ArrowLeft size={16} className="mr-1.5" />
        Volver al inicio
      </Link>
      
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 dark:bg-amber-950/60 p-3 rounded-2xl text-amber-600 dark:text-amber-400">
            <HelpCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Centro de Ayuda & Mediación
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Guías de contratación segura, mediación vecinal y canales de asistencia en Bahía Blanca
            </p>
          </div>
        </div>

        {/* Banner Tutorial Guiado */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tutorial Guiado de Bienvenida
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Aprendé en 1 minuto interactivo cómo buscar profesionales, solicitar presupuestos y chatear directo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerOnboardingTour}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
          >
            <span>Iniciar Tutorial</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Mail size={18} className="text-indigo-600 dark:text-indigo-400" />
                Soporte y Mediación por Email
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs mb-4 leading-relaxed">
                Escribinos si tenés dudas sobre la plataforma o si necesitás elevar un reclamo con documentación adjunta.
              </p>
            </div>
            <a 
              href="mailto:soporte@bahiaoficios.com" 
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors w-fit"
            >
              soporte@bahiaoficios.com
            </a>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                Atención Vecinal Bahía Oficios
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs mb-4 leading-relaxed">
                Canal ágil para consultas sobre cómo usar la web, mediaciones o validación de perfiles profesionales en Bahía Blanca.
              </p>
            </div>
            <a 
              href="mailto:soporte@bahiaoficios.com?subject=Consulta%20Bahia%20Oficios" 
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors w-fit"
            >
              <Mail size={14} />
              <span>Contactar Soporte Vecinal</span>
            </a>
          </div>
        </div>
      </div>

      {/* SECCIÓN DESTACADA: Garantía de Confianza & Política de Satisfacción Vecinal */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border-2 border-indigo-500/20 dark:border-indigo-500/30 p-6 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full mb-1">
                <Scale size={12} />
                <span>Protocolo Oficial Comunitario</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Garantía y Política de Satisfacción Vecinal
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href="/presupuestar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FileText size={15} />
              <span>Abrir /presupuestar</span>
              <ExternalLink size={13} className="text-emerald-200" />
            </a>

            <button
              type="button"
              onClick={() => setShowContratoModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Ver Modelo Rápido</span>
            </button>
          </div>
        </div>

        {/* 4 Pautas Clave de Mediación Comunitaria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pauta 1: Acordar plazos por escrito */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cómo acordar presupuestos y plazos por escrito
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Los acuerdos verbales suelen generar malentendidos sobre qué incluía el trabajo y cuándo finalizaba. 
              En Bahía Oficios podés utilizar la <strong>Plantilla Oficial de Presupuesto / Contrato Rápido</strong> con dictado por voz para dejar asentado:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Detalle puntual de tareas a realizar y materiales incluidos.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Fecha estimada de inicio y fecha límite de entrega.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Constancia de seña abonada con firma de ambas partes.</span>
              </li>
            </ul>
          </div>

          {/* Pauta 2: Cómo pedir factura */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cómo solicitar Factura Legal (AFIP / ARCA)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Si necesitás presentar comprobantes ante tu seguro de hogar, consorcio de edificio o empresa:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Monotributistas</strong>: emiten <em>Factura "C"</em> electrónica válida con código CAE.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Responsables Inscriptos</strong>: emiten <em>Factura "A" o "B"</em> con discriminación de IVA.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Buscá el sello <strong>"Hace Factura"</strong> en los perfiles antes de contratar.</span>
              </li>
            </ul>
          </div>

          {/* Pauta 3: Manejo de señas */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
                3
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Pauta de Señas Seguras y Acopio de Materiales
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Para proteger tu dinero y evitar abandono de obras:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-2">
              <li className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Nunca abones el 100% por adelantado</strong>. La seña recomendada es del 30% al 40%.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>En compras grandes de corralón, aboná directo en el comercio o transferí contra remito oficial.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Guardá comprobante de transferencia bancaria con el CUIT/CUIL del titular.</span>
              </li>
            </ul>
          </div>

          {/* Pauta 4: Canal de Mediación Comunitaria */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                4
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Mesa de Mediación Vecinal Bahía Oficios
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Si surge un conflicto sobre la calidad de la mano de obra, faltante de materiales o demora injustificada:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pl-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>El equipo de administración de Bahía Oficios interviene de forma neutral revisando presupuestos y chats.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Se busca un acuerdo de reanudación, corrección de vicios o devolución de seña.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-rose-500 shrink-0 mt-0.5" />
                <span><strong>Sanción comunitaria</strong>: perfiles con denuncias justificadas son suspendidos de inmediato.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Callout */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users size={22} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-xs text-indigo-950 dark:text-indigo-200">
              ¿Tuviste un inconveniente o querés solicitar mediación vecinal? Escribinos a <strong>mediacion@bahiaoficios.com</strong> con fotos y presupuesto adjunto.
            </p>
          </div>
          <a
            href="mailto:mediacion@bahiaoficios.com?subject=Solicitud%20de%20Mediacion%20Comunitaria%20-%20Bahia%20Oficios"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            <span>Pedir Mediación</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* Expanded FAQ Component */}
      <FAQ />

      {/* Modal de Contrato y Recibo */}
      <ContratoPresupuestoModal
        isOpen={showContratoModal}
        onClose={() => setShowContratoModal(false)}
      />
    </div>
  );
};
