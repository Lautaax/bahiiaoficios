import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JobPost } from '../types';
import { PROFESSIONS } from '../constants';
import { 
  Briefcase, PlusCircle, ArrowRight, MapPin, DollarSign, 
  Clock, MessageCircle, Sparkles, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Sample fallback jobs for Bahía Blanca in case Firestore has 0 documents
const FALLBACK_JOBS: JobPost[] = [
  {
    id: 'sample-job-1',
    titulo: 'Instalación de termotanque y cambio de llaves de paso',
    descripcion: 'Necesito reemplazar un termotanque de 80 litros en casa particular y cambiar dos llaves de paso de agua caliente que tienen pequeñas pérdidas.',
    rubro: 'Gasista',
    zona: 'Palihue',
    urgencia: 'esta_semana',
    presupuestoAproximado: '$45.000 - $60.000',
    clienteId: 'demo-1',
    clienteNombre: 'Martín Gómez',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 2), // hace 2 horas
    estado: 'abierto',
    presupuestos: []
  },
  {
    id: 'sample-job-2',
    titulo: 'Colocación de disyuntor diferencial y revisión de térmicas',
    descripcion: 'Salto recurrente de térmicas en cocina y lavadero. Requiero electricista matriculado para revisar tablero principal y equilibrar fases.',
    rubro: 'Electricista',
    zona: 'Universitario',
    urgencia: 'urgente',
    presupuestoAproximado: '$35.000',
    clienteId: 'demo-2',
    clienteNombre: 'Laura Fernández',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 4), // hace 4 horas
    estado: 'abierto',
    presupuestos: [{
      id: 'p-1',
      profesionalId: 'pro-1',
      profesionalNombre: 'Carlos Morales',
      profesionalRubro: 'Electricista',
      montoEstimado: 38000,
      tiempoEstimado: '1 día',
      mensaje: 'Hola Laura, puedo pasar hoy a presupuestar sin cargo.',
      estado: 'pendiente',
      fecha: new Date()
    }]
  },
  {
    id: 'sample-job-3',
    titulo: 'Pintura interior completa de living-comedor y pasillo',
    descripcion: 'Pintura látex lavable en paredes (unos 65m2 aprox.) y cielorraso con tratamiento previo de algunas manchas de humedad ya secas.',
    rubro: 'Pintor',
    zona: 'Centro',
    urgencia: 'flexible',
    presupuestoAproximado: 'A convenir con materiales',
    clienteId: 'demo-3',
    clienteNombre: 'Roberto S.',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 9), // hace 9 horas
    estado: 'abierto',
    presupuestos: []
  },
  {
    id: 'sample-job-4',
    titulo: 'Destape de desagüe pluvial y revisión de canaletas',
    descripcion: 'Con las últimas lluvias desbordó la canaleta del patio. Requiero limpieza y desobstrucción de bajada pluvial hacia la vereda.',
    rubro: 'Plomero',
    zona: 'Villa Mitre',
    urgencia: 'esta_semana',
    presupuestoAproximado: '$28.000 - $35.000',
    clienteId: 'demo-4',
    clienteNombre: 'Mariana Pérez',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 18), // hace 18 horas
    estado: 'abierto',
    presupuestos: []
  },
  {
    id: 'sample-job-5',
    titulo: 'Instalación y vacío de split frío/calor 3000 frigorías',
    descripcion: 'Equipo nuevo en caja para colocar en dormitorio en primer piso. Pared exterior de ladrillo hueco con acceso despejado.',
    rubro: 'Aire Acondicionado',
    zona: 'Bella Vista',
    urgencia: 'esta_semana',
    presupuestoAproximado: 'A convenir',
    clienteId: 'demo-5',
    clienteNombre: 'Federico M.',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 26), // ayer
    estado: 'abierto',
    presupuestos: []
  },
  {
    id: 'sample-job-6',
    titulo: 'Reparación de revoque exterior y zócalo con humedad',
    descripcion: 'Pared medianera con desprendimiento de revoque en zócalo bajo. Trabajo con hidrófugo y fino para posterior pintura.',
    rubro: 'Albañil',
    zona: 'Patagonia',
    urgencia: 'flexible',
    presupuestoAproximado: '$80.000',
    clienteId: 'demo-6',
    clienteNombre: 'Alejandro C.',
    fechaCreacion: new Date(Date.now() - 1000 * 60 * 60 * 30),
    estado: 'abierto',
    presupuestos: []
  }
];

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
}

export const RecentRequestedJobs: React.FC<RecentRequestedJobsProps> = ({ selectedCategory, hideViewAll = false }) => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubroFilter, setSelectedRubroFilter] = useState<string>('todos');

  // Listen to the latest 12 jobs in Firestore
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
            // If empty collection, use realistic demo jobs
            setJobs(FALLBACK_JOBS);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore trabajosSolicitados snapshot error, using local fallback:", error);
          setJobs(FALLBACK_JOBS);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn("Error initializing trabajosSolicitados listener:", err);
      setJobs(FALLBACK_JOBS);
      setLoading(false);
    }
  }, []);

  // Update selectedRubroFilter if parent passed a category or if user changes
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'Todos') {
      setSelectedRubroFilter(selectedCategory);
    }
  }, [selectedCategory]);

  const userProRubro = currentUser?.profesionalInfo?.rubro || currentUser?.profesionalInfo?.rubros?.[0];

  // Quick filter options
  const filterOptions = useMemo(() => {
    const options = ['todos'];
    if (userProRubro && !options.includes(userProRubro)) {
      options.push(userProRubro);
    }
    const populars = ['Electricista', 'Plomero', 'Gasista', 'Pintor', 'Albañil', 'Aire Acondicionado'];
    populars.forEach(p => {
      if (!options.includes(p)) options.push(p);
    });
    return options;
  }, [userProRubro]);

  // Filter jobs according to selected tab and state
  const displayedJobs = useMemo(() => {
    let filtered = jobs.filter(j => j.estado !== 'cancelado');
    if (selectedRubroFilter !== 'todos') {
      filtered = filtered.filter(j => j.rubro.toLowerCase() === selectedRubroFilter.toLowerCase());
    }
    return filtered.slice(0, 6);
  }, [jobs, selectedRubroFilter]);

  const getRubroIcon = (rubro: string) => {
    const p = PROFESSIONS.find(item => item.name.toLowerCase() === rubro.toLowerCase());
    return p?.icon || Briefcase;
  };

  const renderUrgenciaPill = (urgencia: string) => {
    switch (urgencia) {
      case 'urgente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Urgente
          </span>
        );
      case 'esta_semana':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-slate-400" />
            Esta semana
          </span>
        );
      case 'flexible':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-slate-400" />
            Flexible
          </span>
        );
    }
  };

  return (
    <section 
      aria-label="Últimos Trabajos Solicitados" 
      className="mb-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden"
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
                {jobs.length} activos
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">
              Vecinos y comercios de la ciudad que necesitan presupuestos. Si sos profesional podés postularte y enviar tu cotización.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/trabajos?crear=true"
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
          <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Briefcase size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No hay solicitudes abiertas en este rubro por el momento.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ¿Tenés un trabajo pendiente? Sé el primero en publicar tu solicitud en Bahía Blanca.
            </p>
            <Link
              to="/trabajos?crear=true"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Publicar ahora <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 sm:gap-5">
            {displayedJobs.map((job) => {
              const RubroIcon = getRubroIcon(job.rubro);
              const proposalCount = job.presupuestos?.length || 0;
              const isUserRubroMatch = userProRubro && userProRubro.toLowerCase() === job.rubro.toLowerCase();
              const targetUrl = `/trabajos?jobId=${job.id}&rubro=${encodeURIComponent(job.rubro)}&search=${encodeURIComponent(job.titulo)}`;
              const actionUrl = isUserRubroMatch
                ? `/trabajos?jobId=${job.id}&cotizar=true&rubro=${encodeURIComponent(job.rubro)}`
                : targetUrl;

              return (
                <div
                  key={job.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col justify-between shadow-none"
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
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      <Link to={targetUrl} title={job.titulo}>
                        {job.titulo}
                      </Link>
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

                    <Link
                      to={actionUrl}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0"
                    >
                      <span>{isUserRubroMatch ? 'Presupuestar' : 'Ver Detalle'}</span>
                      <ChevronRight size={13} />
                    </Link>
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
    </section>
  );
};
