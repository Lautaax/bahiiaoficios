import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Building2, Handshake, Tag, ExternalLink, MapPin, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ColaboradorEmpresa {
  id: string;
  title: string;
  description: string;
  category?: string;
  zone?: string;
  imageUrl?: string;
  link?: string;
  offersTradeDiscount?: boolean;
  tradeDiscountDetails?: string;
}

export const EmpresasColaboradoras: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<ColaboradorEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchColaboradores = async () => {
      try {
        const q = query(
          collection(db, 'ads'),
          where('active', '==', true)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ColaboradorEmpresa));
          setColaboradores(list);
        } else {
          setColaboradores([]);
        }
      } catch (error) {
        console.warn("Firestore ads query error:", error);
        setColaboradores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchColaboradores();
  }, []);

  return (
    <section 
      aria-label="Empresas Colaboradoras" 
      className="mb-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Header Container */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-3 py-1 rounded-full mb-2 border border-indigo-100 dark:border-indigo-900">
              <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Red de Comercios Aliados • Bahía Blanca</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Empresas Colaboradoras
              {colaboradores.length > 0 && (
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full">
                  {colaboradores.length} comercios
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Corralones, ferreterías, distribuidoras y casas de materiales de la ciudad con beneficios y descuentos exclusivos para profesionales y vecinos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/publicitar"
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
            >
              <span>Sumar mi Empresa</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de Empresas Colaboradoras */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 sm:gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
            ))}
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Building2 size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Espacio exclusivo para comercios y corralones de Bahía Blanca
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              ¿Tenés un corralón, ferretería, casa de electricidad o pinturería? Sumá tu empresa a la red comunitaria de Bahía Blanca para ofrecer descuentos y llegar a miles de profesionales y familias.
            </p>
            <div className="pt-2">
              <Link
                to="/publicitar"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Conocer planes de publicidad para comercios</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 sm:gap-5 auto-rows-fr">
            {colaboradores.map((colaborador) => {
              const hasDiscount = colaborador.offersTradeDiscount && colaborador.tradeDiscountDetails;

              return (
                <div
                  key={colaborador.id}
                  className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between group shadow-none hover:shadow-sm h-full"
                >
                  <div>
                    {/* Header: Icon/Image + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        {colaborador.imageUrl ? (
                          <img
                            src={colaborador.imageUrl}
                            alt={colaborador.title}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <Building2 size={22} className="text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                        <Handshake size={10} />
                        Aliada
                      </span>
                    </div>

                    {/* Category */}
                    {colaborador.category && (
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {colaborador.category}
                      </span>
                    )}

                    {/* Title */}
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {colaborador.title}
                    </h4>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-3">
                      {colaborador.description}
                    </p>

                    {/* Trade Discount Badge */}
                    {hasDiscount && (
                      <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <Tag size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          <strong className="font-bold">Descuento gremio:</strong> {colaborador.tradeDiscountDetails}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{colaborador.zone || 'Bahía Blanca'}</span>
                    </div>

                    {colaborador.link ? (
                      <a
                        href={colaborador.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline shrink-0"
                      >
                        <span>Contacto</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <Link
                        to="/publicitar"
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
                      >
                        <span>Info</span>
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Banner Footer Note */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Mencioná que sos usuario de Bahía Oficios al realizar tu compra para acceder a los beneficios acordados.</span>
          </div>
          <Link
            to="/beneficios"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Ver más beneficios comerciales <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </section>
  );
};
