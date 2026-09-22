import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  MessageSquare, 
  ArrowRight,
  Clock,
  Send,
  Star,
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { CachedImage } from './CachedImage';
import { PROFESSIONS } from '../constants';
import { analyticsService } from '../services/analyticsService';

interface WeeklyRecommendedCarouselProps {
  professionals: User[];
}

export const WeeklyRecommendedCarousel: React.FC<WeeklyRecommendedCarouselProps> = ({ 
  professionals 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [isPaused, setIsPaused] = useState(false);

  // Responsive items count calculation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else if (window.innerWidth < 1280) {
        setItemsPerPage(3);
      } else {
        setItemsPerPage(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Algorithm: Filter and prioritize verified professionals with few views/consultations
  const recommendedPros = useMemo(() => {
    // 1. Get all professionals
    const pros = professionals.filter(u => u.rol === 'profesional' && u.profesionalInfo);
    if (pros.length === 0) return [];

    // 2. Identify verified professionals (identity verified or matricula verified)
    const verified = pros.filter(p => 
      Boolean(p.profesionalInfo?.isVerified || p.profesionalInfo?.matriculaVerified || p.profesionalInfo?.matriculado)
    );

    // Pool of candidates: prefer verified, fallback to all pros if verified count is small
    const pool = verified.length >= 3 ? verified : pros;

    // 3. Score prioritizing fewest views and lowest inquiries to give fair rotation
    // Lower score = higher priority
    const scored = [...pool].map(p => {
      const views = Number(p.profesionalInfo?.profileViews) || 0;
      const contacts = Number(p.profesionalInfo?.whatsappClicks) || 0;
      
      // Calculate a pseudo-random weekly seed using user UID and current week of year
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
      
      let hash = 0;
      const seedStr = `${p.uid}_w${weekNumber}`;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      const rotationBonus = Math.abs(hash % 100);

      // Score: high priority for <= 10 views and 0 contacts
      const viewPenalty = views * 8;
      const contactPenalty = contacts * 25;
      const verifiedBonus = (p.profesionalInfo?.isVerified ? -150 : 0) + (p.profesionalInfo?.matriculaVerified ? -100 : 0);
      
      return {
        pro: p,
        score: viewPenalty + contactPenalty + verifiedBonus + rotationBonus
      };
    });

    // Sort by lowest score first
    scored.sort((a, b) => a.score - b.score);

    return scored.map(s => s.pro);
  }, [professionals]);

  // Auto-advance carousel gently if not paused
  useEffect(() => {
    if (recommendedPros.length <= itemsPerPage || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        const maxIndex = recommendedPros.length - itemsPerPage;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [recommendedPros.length, itemsPerPage, isPaused]);

  if (recommendedPros.length === 0) {
    return null;
  }

  const maxIndex = Math.max(0, recommendedPros.length - itemsPerPage);

  const handleNext = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  };

  return (
    <section 
      aria-label="Recomendados de la Semana en Bahía Blanca"
      className="bg-gradient-to-b from-amber-50/40 via-white to-slate-50/50 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-slate-900/80 py-14 border-b border-slate-200/80 dark:border-slate-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with high empathy & local trust */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full mb-2.5 border border-amber-300/60 dark:border-amber-700/60 shadow-xs">
              <Sparkles size={14} className="text-amber-600 dark:text-amber-400 animate-spin-slow" />
              <span>Oportunidades de la Semana</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Recomendados de la Semana en Bahía Blanca
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Perfiles verificados con disponibilidad inmediata para tus arreglos y reformas. ¡Dales la oportunidad de enviarte su presupuesto!
            </p>
          </div>

          {recommendedPros.length > itemsPerPage && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handlePrev}
                aria-label="Anterior profesional recomendado"
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                aria-label="Siguiente profesional recomendado"
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel viewport */}
        <div className="relative overflow-hidden">
          <motion.div
            className="flex"
            animate={{ x: `-${currentIndex * (100 / itemsPerPage)}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {recommendedPros.map((pro) => {
              const info = pro.profesionalInfo || ({} as any);
              const rubro = info.rubro || 'Oficio General';
              const foundProf = PROFESSIONS.find(item => item.name.toLowerCase() === rubro.toLowerCase());
              const ProfessionIcon = foundProf?.icon || Wrench;
              const isVerified = Boolean(info.isVerified);
              const isMatriculado = Boolean(info.matriculaVerified || info.matriculado);
              const zona = pro.zona || 'Bahía Blanca';
              const minPrice = info.precioMinimo ? Number(info.precioMinimo) : null;
              const views = Number(info.profileViews) || 0;

              return (
                <div 
                  key={pro.uid} 
                  className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 flex-shrink-0 px-2.5 py-1"
                >
                  <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden group">
                    {/* Top banner / Image */}
                    <div className="relative h-40 bg-gradient-to-tr from-slate-100 to-indigo-50/50 dark:from-slate-800 dark:to-slate-800/60 overflow-hidden flex items-center justify-center p-3">
                      {info.portadaUrl ? (
                        <CachedImage
                          src={info.portadaUrl}
                          alt={pro.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : null}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            <ShieldCheck size={11} /> Identidad Verificada
                          </span>
                        ) : isMatriculado ? (
                          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            <CheckCircle2 size={11} /> Matriculado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                            <Sparkles size={11} /> Nuevo en Bahía
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                          <Clock size={10} className="text-emerald-500" /> Disp. esta semana
                        </span>
                      </div>

                      {/* Avatar overlaid on center-bottom */}
                      <div className="absolute -bottom-6 left-5">
                        <CachedImage
                          src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.nombre)}&background=6366f1&color=fff`}
                          alt={pro.nombre}
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md bg-white"
                          containerClassName="rounded-2xl"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="pt-8 p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                            {pro.nombre}
                          </h3>
                        </div>

                        {/* Profession & Zone */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                            <ProfessionIcon size={12} />
                            {rubro}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <MapPin size={11} />
                            {zona}
                          </span>
                        </div>

                        {/* Description snippet */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                          {info.descripcion || 'Profesional de confianza para presupuestos y consultas en Bahía Blanca.'}
                        </p>

                        {/* Price reference */}
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-700/60">
                          {minPrice ? (
                            <span>Presupuesto desde: <strong className="text-slate-900 dark:text-white font-bold">${minPrice.toLocaleString('es-AR')}</strong></span>
                          ) : (
                            <span>Presupuesto sin cargo / A convenir</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons with requested empathetic microcopy */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/70">
                        {/* Primary Button requested: Conocer trabajos y opiniones */}
                        <Link
                          to={`/profesional/${pro.slug || pro.uid}`}
                          onClick={() => analyticsService.trackProfessionalProfileView(pro.uid, pro.nombre, rubro)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs active:scale-98"
                        >
                          <span>Conocer trabajos y opiniones</span>
                          <ArrowRight size={13} />
                        </Link>

                        {/* Secondary Button requested: Pedir Presupuesto Gratis en 1 Minuto */}
                        <Link
                          to={`/solicitar-presupuesto?profesionalId=${pro.uid}&profesionalNombre=${encodeURIComponent(pro.nombre)}&rubro=${encodeURIComponent(rubro)}`}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60 transition-colors"
                        >
                          <Send size={12} />
                          <span>Pedir Presupuesto Gratis en 1 Minuto</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Bottom Banner Note for local Bahía Blanca equity */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ¿Sos profesional en Bahía Blanca y querés aparecer acá?{' '}
            <Link to="/signup?rol=profesional" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Registrate gratis y verificá tu perfil
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};
