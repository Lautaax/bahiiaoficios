import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, MapPin, Heart, Wrench, Shield, Sparkles } from 'lucide-react';
import { NewsletterSubscription } from './NewsletterSubscription';

interface FooterProps {
  stats: {
    users: number;
    visits: number;
  };
}

export const Footer: React.FC<FooterProps> = ({ stats }) => {
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
                <Link to="/publicitar" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Publicitar Negocio
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
    </footer>
  );
};
