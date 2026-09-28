import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JobPost } from '../types';
import { PROFESSIONS } from '../constants';
import { 
  Briefcase, PlusCircle, ArrowRight, MapPin, DollarSign, 
  Clock, MessageCircle, Sparkles, ChevronRight, CheckCircle2,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JobDetailModal } from './JobDetailModal';

function formatRelativeTime(fecha: any): string {
  if (!fecha) return 'Reciente';
  try {
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 5) return 'Recién publicado';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  } catch {
    return 'Reciente';
  }
}

interface RecentRequestedJobsProps {
  selectedCategory?: string;
  hideViewAll?: boolean;
  onSelectJob?: (job: JobPost) => void;
}

export const RecentRequestedJobs: React.FC<RecentRequestedJobsProps> = ({ 
  selectedCategory, 
  hideViewAll = false,
  onSelectJob 
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubroFilter, setSelectedRubroFilter] = useState<string>('todos');
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobPost | null>(null);

  // Listen to real jobs from Firestore
  useEffect(() => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'trabajosSolicitados'),
        orderBy('fechaCreacion', 'desc'),
        limit(12)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: JobPost[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data()
            } as JobPost));
            setJobs(list);
          } else {
            // Production rule: No mock data! Only real jobs
            setJobs([]);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore trabajosSolicitados snapshot error:", error);
          setJobs([]);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn("Error initializing trabajosSolicitados listener:", err);
      setJobs([]);
      setLoading(false);
    }
  }, []);

  const userProRubro = currentUser?.profesionalInfo?.rubro;

  // Filter options based on real jobs
  const filterOptions = useMemo(() => {
    const list = ['todos'];
    if (userProRubro && !list.includes(userProRubro)) {
      list.push(userProRubro);
    }
    const realRubros = Array.from(new Set(jobs.map(j => j.rubro).filter(Boolean)));
    realRubros.forEach(r => {
      if (!list.includes(r)) list.push(r);
    });
    return list;
  }, [jobs, userProRubro]);

  const displayedJobs = useMemo(() => {
    let result = jobs;

    // Filter by passed selectedCategory prop if provided
    if (selectedCategory && selectedCategory.toLowerCase() !== 'todos') {
      result = result.filter(j => j.rubro?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by tab filter
    if (selectedRubroFilter && selectedRubroFilter.toLowerCase() !== 'todos') {
      result = result.filter(j => j.rubro?.toLowerCase() === selectedRubroFilter.toLowerCase());
    }

    return result;
  }, [jobs, selectedCategory, selectedRubroFilter]);

  const getRubroIcon = (rubroName: string) => {
    const prof = PROFESSIONS.find(p => p.name.toLowerCase() === (rubroName || '').toLowerCase());
    return prof?.icon || Briefcase;
  };

  const renderUrgenciaPill = (urgencia?: string) => {
    switch (urgencia) {
      case 'urgente':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Urgente
          </span>
        );
      case 'esta_semana':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 px-2 py-0.5 rounded-full text-[11px] font-semibold">
            ⚡ Esta semana
          </span>
        );
      case 'flexible':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[11px] font-medium">
            🕒 Flexible
          </span>
        );
    }
  };

  const handleOpenJob = (job: JobPost) => {
    setSelectedJobForDetail(job);
    if (onSelectJob) {
      onSelectJob(job);
    }
  };

  return (
    <section 
      aria-label="Trabajos Solicitados Recientes en Bahía Blanca"
      className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden mb-12"
    >
      {/* Header Container */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-3 py-1 rounded-full mb-2 border border-indigo-100 dark:border-indigo-900">
              <Briefcase size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Tablón de Oportunidades • Bahía Blanca</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Últimos Trabajos Solicitados
              <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full">
                {jobs.length} reales
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Vecinos y comercios de la ciudad que necesitan presupuestos. Si sos profesional podés postularte y enviar tu cotización.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={currentUser ? "/trabajos?crear=true" : "/signup?redirect=%2Ftrabajos%3Fcrear%3Dtrue&motivo=solicitar_trabajo"}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
            >
              <PlusCircle size={15} />
              <span>Publicar Pedido</span>
            </Link>
            {!hideViewAll && (
              <Link
                to="/trabajos"
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95"
              >
                <span>Ver Tablón Completo</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs */}
        {jobs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
              Rubro:
            </span>
            {filterOptions.map((opt) => {
              const isUserRubro = userProRubro && opt.toLowerCase() === userProRubro.toLowerCase() && opt !== 'todos';
              const isSelected = selectedRubroFilter.toLowerCase() === opt.toLowerCase();
              const label = opt === 'todos' ? 'Todos los oficios' : isUserRubro ? `Mi Rubro (${opt})` : opt;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedRubroFilter(opt)}
                  className={`
                    whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0
                    ${isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isUserRubro
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
                        : 'bg-white dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 sm:gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-slate-100 dark:bg-slate-700/40 animate-pulse" />
            ))}
          </div>
        ) : displayedJobs.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Briefcase size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No hay solicitudes publicadas activas en este rubro
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Sé el primero en publicar tu requerimiento de trabajo para que profesionales bahienses te coticen gratis.
            </p>
            <Link
              to="/trabajos?crear=true"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <PlusCircle size={14} />
              Publicar Pedido Ahora
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 sm:gap-5">
            {displayedJobs.map((job) => {
              const RubroIcon = getRubroIcon(job.rubro);
              const proposalCount = job.presupuestos?.length || 0;
              const isUserRubroMatch = userProRubro && userProRubro.toLowerCase() === job.rubro.toLowerCase();

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col justify-between shadow-xs hover:shadow-md cursor-pointer group"
                  onClick={() => handleOpenJob(job)}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                        <RubroIcon size={13} className="text-slate-500 dark:text-slate-400" />
                        <span>{job.rubro}</span>
                      </span>
                      {renderUrgenciaPill(job.urgencia)}
                    </div>

                    {/* Title */}
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {job.titulo}
                    </h4>

                    {/* Description */}
                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
                      {job.descripcion}
                    </p>

                    {/* Key Info row */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700/60 mb-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{job.zona}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <DollarSign size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                          {job.presupuestoAproximado || 'A convenir'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Primary Action CTA */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Clock size={11} />
                      <span>{formatRelativeTime(job.fechaCreacion)}</span>
                      <span className="mx-1">•</span>
                      <span>
                        {proposalCount === 0 ? 'Sin ofertas' : `${proposalCount} prop.`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenJob(job);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-xs"
                    >
                      <span>Ver Detalle</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Callout */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Los presupuestos se coordinan directamente entre cliente y profesional sin comisiones intermedias.</span>
          </div>
          <Link
            to="/trabajos"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 shrink-0"
          >
            Explorar todos los requerimientos <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Modal de Detalle Completo de Trabajo */}
      <JobDetailModal
        job={selectedJobForDetail}
        isOpen={Boolean(selectedJobForDetail)}
        onClose={() => setSelectedJobForDetail(null)}
        onQuote={(j) => {
          navigate(`/trabajos?jobId=${j.id}&cotizar=true`);
        }}
        onViewProposals={(j) => {
          navigate(`/trabajos?jobId=${j.id}`);
        }}
      />
    </section>
  );
};
