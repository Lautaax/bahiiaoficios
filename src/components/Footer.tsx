import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, MapPin, Heart, Wrench, Shield, Sparkles, Smartphone, Lightbulb, MessageSquarePlus, FileText } from 'lucide-react';
import { NewsletterSubscription } from './NewsletterSubscription';
import { InstallAppModal } from './InstallAppModal';
import { openFeedbackModal } from './FeedbackWidget';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';

interface FooterProps {
  stats: {
    users: number;
    visits: number;
  };
}

export const Footer: React.FC<FooterProps> = ({ stats }) => {
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [contratoModalOpen, setContratoModalOpen] = useState(false);

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 mt-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Newsletter Section */}
        <div className="mb-12">
          <NewsletterSubscription variant="footer" />
        </div>

        {/* Middle Footer Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
          {/* Brand & City */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-xs">
                <MapPin size={20} />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                  Bahia Oficios
                </h4>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                  Bahía Blanca • Red de Profesionales y Servicios
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              La plataforma que conecta a vecinos de Bahía Blanca con plomeros, electricistas, gasistas matriculados, albañiles, pintores y especialistas de confianza.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Sparkles size={14} />
              <span>Presupuestos transparentes sin comisiones ocultas</span>
            </div>
          </div>


          {/* Quick Links */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navegación
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <Link to="/trabajos" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Trabajos Solicitados
                </Link>
              </li>
              <li>
                <Link to="/solicitar-presupuesto" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Pedir Presupuesto
                </Link>
              </li>
              <li>
                <Link to="/beneficios" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Beneficios y Descuentos
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Consejos & Blog
                </Link>
              </li>
              <li>
                <Link to="/herramientas" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                  <Wrench size={13} />
                  <span>Bolsa de Herramientas</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setContratoModalOpen(true)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 text-left cursor-pointer"
                >
                  <FileText size={13} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Contrato / Recibo Rápido</span>
                </button>
              </li>
              <li>
                <Link to="/calculadora-costos" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Calculadora de Costos</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Help */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Soporte & Legal
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <li>
                <Link to="/help" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Centro de Ayuda
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setInstallModalOpen(true)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-left"
                >
                  <Smartphone size={13} />
                  <span>Instalar App / Descargar APK</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openFeedbackModal()}
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400 text-left cursor-pointer"
                >
                  <Lightbulb size={13} className="text-amber-500" />
                  <span>Sugerencias & Feedback</span>
                </button>
              </li>
            </ul>

            {/* Site Stats Counter */}
            <div className="pt-3">
              <div className="flex items-center gap-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                      {stats.users}
                    </span>
                    <span className="text-[10px] text-slate-400">Usuarios</span>
                  </div>
                </div>
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-1.5">
                  <Eye size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                      {stats.visits.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">Visitas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Community Feedback & Suggestions Banner inside Footer */}
        <div className="mt-8 p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/80 shadow-xs">
              <Lightbulb size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                  Buzón de Sugerencias
                </span>
                <span className="text-xs text-slate-400 font-medium">Bahía Blanca</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                ¿Tenés una sugerencia, idea o encontraste algún error?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Tu opinión nos ayuda a seguir mejorando la plataforma para todos los vecinos y profesionales de la ciudad.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openFeedbackModal()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            <MessageSquarePlus size={15} className="text-amber-400 dark:text-indigo-600" />
            <span>Dejar Sugerencia / Feedback</span>
          </button>
        </div>

        {/* Bottom Bar: Copyright & Designer */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} Bahia Oficios. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Diseñado con <Heart size={12} className="text-rose-500 fill-rose-500" /> por{' '}
            <a
              href="https://www.instagram.com/_lautaaj/?__pwa=1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              @_lautaaj
            </a>{' '}
            en Bahía Blanca
          </p>
        </div>
      </div>

      <InstallAppModal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
      />

      <ContratoPresupuestoModal
        isOpen={contratoModalOpen}
        onClose={() => setContratoModalOpen(false)}
      />
    </footer>
  );
};
