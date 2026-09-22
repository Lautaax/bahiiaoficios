import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, 
  serverTimestamp, onSnapshot, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JobPost, JobBudgetProposal } from '../types';
import { PROFESSIONS, ZONAS } from '../constants';
import { isVipActive } from '../utils/vipUtils';
import { ProfessionalQuoteAction } from './ProfessionalQuoteAction';
import { 
  notificarProfesionalEstadoOferta, 
  notificarProfesionalesNuevoTrabajo 
} from '../utils/quoteNotificationService';
import { 
  Briefcase, PlusCircle, Search, Filter, Clock, MapPin, DollarSign, 
  Send, CheckCircle2, AlertCircle, MessageCircle, X, ChevronDown, 
  Calendar, Crown, User as UserIcon, Check, Layers, RefreshCw, XCircle, Sparkles,
  ArrowRight, ShieldAlert
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { RecentRequestedJobs } from './RecentRequestedJobs';
import { CachedImage } from './CachedImage';

const POPULAR_RUBROS = [
  'Electricista', 'Plomero', 'Gasista', 'Pintor', 'Albañil', 
  'Carpintero', 'Techista', 'Aire Acondicionado', 'Cerrajería'
];

const POPULAR_ZONAS = [
  'Centro', 'Universitario', 'Villa Mitre', 'Palihue', 
  'Bella Vista', 'Ingeniero White', 'Barrio Norte', 'Patagonia'
];

export const TrabajosSolicitados: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedRubro, setSelectedRubro] = useState(searchParams.get('rubro') || 'todos');
  const [selectedZona, setSelectedZona] = useState(searchParams.get('zona') || 'todas');
  const [selectedUrgencia, setSelectedUrgencia] = useState<'todas' | 'urgente' | 'esta_semana' | 'flexible'>(
    (searchParams.get('urgencia') as any) || 'todas'
  );
  const [filterView, setFilterView] = useState<'todos' | 'mis_pedidos' | 'mi_rubro' | 'mi_zona'>('todos');
  const [onlyWithoutQuotes, setOnlyWithoutQuotes] = useState(false);

  // Modal: Publicar Trabajo / Solicitar Presupuesto Múltiple
  const [showCreateModal, setShowCreateModal] = useState(
    searchParams.get('crear') === 'true' || searchParams.get('solicitar') === 'true'
  );
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [newJob, setNewJob] = useState({
    titulo: '',
    rubro: searchParams.get('rubro') && searchParams.get('rubro') !== 'todos' 
      ? searchParams.get('rubro')! 
      : (PROFESSIONS[0]?.name || 'Electricista'),
    zona: searchParams.get('zona') && searchParams.get('zona') !== 'todas'
      ? searchParams.get('zona')!
      : (ZONAS[0] || 'Centro'),
    descripcion: '',
    urgencia: 'esta_semana' as 'urgente' | 'esta_semana' | 'flexible',
    presupuestoAproximado: '',
    clienteNombre: currentUser?.nombre || '',
    clienteTelefono: currentUser?.profesionalInfo?.telefono || ''
  });

  // Modal: Cotizar Trabajo (ProfessionalQuoteAction)
  const [quotingJob, setQuotingJob] = useState<JobPost | null>(null);

  // Modal: Ver Presupuestos Recibidos (para el cliente que publicó)
  const [viewingProposalsJob, setViewingProposalsJob] = useState<JobPost | null>(null);
  const [updatingProposalStatus, setUpdatingProposalStatus] = useState<string | null>(null);

  // Auth notice modals
  const [showAuthNotice, setShowAuthNotice] = useState(false);
  const [showClientAuthNotice, setShowClientAuthNotice] = useState(false);

  // Helper para abrir modal de solicitud requiriendo registro previo
  const handleOpenCreateModal = () => {
    if (!currentUser) {
      setShowClientAuthNotice(true);
    } else {
      setShowCreateModal(true);
    }
  };

  // Detect URL query flags on load
  useEffect(() => {
    if (searchParams.get('crear') === 'true' || searchParams.get('solicitar') === 'true') {
      if (!currentUser) {
        setShowClientAuthNotice(true);
      } else {
        setShowCreateModal(true);
      }
    }
  }, [searchParams, currentUser]);

  // Handle target job passed via URL query
  useEffect(() => {
    const targetJobId = searchParams.get('jobId');
    if (targetJobId && jobs.length > 0) {
      const targetJob = jobs.find(j => j.id === targetJobId);
      if (targetJob) {
        if (searchParams.get('cotizar') === 'true' && currentUser?.rol === 'profesional') {
          setQuotingJob(targetJob);
        } else if (currentUser?.uid === targetJob.clienteId) {
          setViewingProposalsJob(targetJob);
        }
        setTimeout(() => {
          const el = document.getElementById(`job-card-${targetJobId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [searchParams, jobs, currentUser]);

  // Escuchar trabajos en tiempo real
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'trabajosSolicitados'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: JobPost[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      } as JobPost));
      setJobs(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener trabajos solicitados:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sincronizar datos de usuario logueado en formulario
  useEffect(() => {
    if (currentUser) {
      setNewJob(prev => ({
        ...prev,
        clienteNombre: prev.clienteNombre || currentUser.nombre || '',
        clienteTelefono: prev.clienteTelefono || currentUser.profesionalInfo?.telefono || ''
      }));
    }
  }, [currentUser]);

  // Manejar creación de nuevo requerimiento / solicitud múltiple
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setShowClientAuthNotice(true);
      return;
    }

    if (!newJob.titulo.trim() || !newJob.descripcion.trim()) {
      alert("Por favor completá el título y la descripción del trabajo requerido.");
      return;
    }

    setCreating(true);
    try {
      const jobData = {
        titulo: newJob.titulo.trim(),
        descripcion: newJob.descripcion.trim(),
        rubro: newJob.rubro,
        zona: newJob.zona,
        urgencia: newJob.urgencia,
        presupuestoAproximado: newJob.presupuestoAproximado.trim() || 'A convenir con el profesional',
        clienteId: currentUser.uid,
        clienteNombre: currentUser.nombre || newJob.clienteNombre.trim(),
        clienteEmail: currentUser.email || '',
        clienteTelefono: (newJob.clienteTelefono || currentUser.profesionalInfo?.telefono || '').trim(),
        clienteFoto: currentUser.fotoUrl || '',
        fechaCreacion: serverTimestamp(),
        estado: 'abierto',
        presupuestos: []
      };

      const docRef = await addDoc(collection(db, 'trabajosSolicitados'), jobData);

      // Notificar a profesionales activos del rubro en Bahía Blanca
      await notificarProfesionalesNuevoTrabajo({
        trabajoId: docRef.id,
        rubro: newJob.rubro,
        zona: newJob.zona,
        titulo: newJob.titulo.trim()
      });

      setCreateSuccess(true);
      setTimeout(() => {
        setCreateSuccess(false);
        setShowCreateModal(false);
        setNewJob({
          titulo: '',
          rubro: PROFESSIONS[0]?.name || 'Electricista',
          zona: ZONAS[0] || 'Centro',
          descripcion: '',
          urgencia: 'esta_semana',
          presupuestoAproximado: '',
          clienteNombre: currentUser?.nombre || '',
          clienteTelefono: currentUser?.profesionalInfo?.telefono || ''
        });
      }, 1500);
    } catch (error) {
      console.error("Error al publicar trabajo:", error);
      alert("Hubo un error al publicar el trabajo. Por favor, intentá nuevamente.");
    } finally {
      setCreating(false);
    }
  };

  // Actualizar estado de una propuesta (Aceptar / Rechazar)
  const handleUpdateProposalStatus = async (proposal: JobBudgetProposal, newStatus: 'aceptado' | 'rechazado') => {
    if (!viewingProposalsJob?.id) return;
    setUpdatingProposalStatus(proposal.id);

    try {
      // 1. Actualizar en colección 'ofertasPresupuesto'
      const offerDocId = `${viewingProposalsJob.id}_${proposal.profesionalId}`;
      await updateDoc(doc(db, 'ofertasPresupuesto', offerDocId), {
        estado: newStatus,
        fechaActualizacion: serverTimestamp()
      }).catch(() => {
        // En caso de ofertas previas sin documento dedicado
      });

      // 2. Actualizar en documento 'trabajosSolicitados'
      const updatedProposals = (viewingProposalsJob.presupuestos || []).map(p => {
        if (p.profesionalId === proposal.profesionalId) {
          return { ...p, estado: newStatus };
        }
        return p;
      });

      const jobRef = doc(db, 'trabajosSolicitados', viewingProposalsJob.id);
      await updateDoc(jobRef, {
        presupuestos: updatedProposals,
        ...(newStatus === 'aceptado' ? { estado: 'en_progreso' } : {})
      });

      setViewingProposalsJob({
        ...viewingProposalsJob,
        presupuestos: updatedProposals,
        ...(newStatus === 'aceptado' ? { estado: 'en_progreso' } : {})
      });

      // 3. Notificar al profesional de la decisión
      await notificarProfesionalEstadoOferta({
        profesionalId: proposal.profesionalId,
        trabajoTitulo: viewingProposalsJob.titulo,
        nuevoEstado: newStatus,
        clienteNombre: currentUser?.nombre || viewingProposalsJob.clienteNombre || 'El cliente'
      });

      alert(newStatus === 'aceptado' 
        ? '¡Presupuesto aceptado! Notificamos al profesional para comenzar.' 
        : 'Presupuesto marcado como no seleccionado.');
    } catch (err) {
      console.error("Error al actualizar estado de propuesta:", err);
      alert("No se pudo actualizar el estado de la propuesta.");
    } finally {
      setUpdatingProposalStatus(null);
    }
  };

  // Marcar trabajo como completado o cerrado
  const handleCloseJob = async (jobId: string) => {
    if (!confirm("¿Deseás marcar este trabajo como finalizado/cerrado? Ya no recibirá nuevas cotizaciones.")) return;
    try {
      await updateDoc(doc(db, 'trabajosSolicitados', jobId), {
        estado: 'completado'
      });
      if (viewingProposalsJob && viewingProposalsJob.id === jobId) {
        setViewingProposalsJob({ ...viewingProposalsJob, estado: 'completado' });
      }
    } catch (err) {
      console.error("Error al cerrar trabajo:", err);
    }
  };

  // Filtrado de trabajos
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = job.titulo?.toLowerCase().includes(term);
        const matchDesc = job.descripcion?.toLowerCase().includes(term);
        const matchRubro = job.rubro?.toLowerCase().includes(term);
        const matchZona = job.zona?.toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchRubro && !matchZona) return false;
      }

      // Rubro
      if (selectedRubro !== 'todos' && job.rubro !== selectedRubro) return false;

      // Zona
      if (selectedZona !== 'todas' && job.zona !== selectedZona) return false;

      // Urgencia
      if (selectedUrgencia !== 'todas' && job.urgencia !== selectedUrgencia) return false;

      // Sin presupuestos
      if (onlyWithoutQuotes && (job.presupuestos?.length || 0) > 0) return false;

      // Vista de pestañas
      if (filterView === 'mis_pedidos') {
        return job.clienteId === currentUser?.uid;
      }

      if (filterView === 'mi_rubro' && currentUser?.rol === 'profesional') {
        const myRubro = currentUser.profesionalInfo?.rubro;
        const myRubros = currentUser.profesionalInfo?.rubros || [];
        return job.rubro === myRubro || myRubros.includes(job.rubro);
      }

      if (filterView === 'mi_zona' && currentUser?.zona) {
        return job.zona === currentUser.zona;
      }

      return true;
    });
  }, [jobs, searchTerm, selectedRubro, selectedZona, selectedUrgencia, filterView, onlyWithoutQuotes, currentUser]);

  const hasActiveFilters = selectedRubro !== 'todos' || selectedZona !== 'todas' || selectedUrgencia !== 'todas' || searchTerm.trim() !== '' || onlyWithoutQuotes || filterView !== 'todos';

  const resetFilters = () => {
    setSelectedRubro('todos');
    setSelectedZona('todas');
    setSelectedUrgencia('todas');
    setSearchTerm('');
    setOnlyWithoutQuotes(false);
    setFilterView('todos');
  };

  const getUrgenciaBadge = (urgencia: string) => {
    switch (urgencia) {
      case 'urgente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Urgente
          </span>
        );
      case 'esta_semana':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-slate-400" /> Esta semana
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
            <Calendar size={11} className="text-slate-400" /> Flexible
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner Unificado */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-sm">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-slate-800 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 mb-4 border border-slate-700">
            <Briefcase size={14} className="text-amber-400" />
            <span>Tablón Oficial de Trabajos Solicitados • Bahía Blanca</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 leading-tight">
            Trabajos Solicitados en Bahía Blanca
          </h1>
          <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
            Publicá tu necesidad y recibí presupuestos de profesionales calificados de la ciudad. Si sos profesional, postuláte y enviá tu cotización técnica directamente.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl shadow-sm transition-all active:scale-95 text-sm"
            >
              <PlusCircle size={18} />
              Publicar Trabajo Solicitado
            </button>

            {currentUser?.rol === 'profesional' && (
              <button
                onClick={() => setFilterView('mi_rubro')}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-5 py-3 rounded-xl border border-slate-700 transition-all text-sm active:scale-95"
              >
                <CheckCircle2 size={18} className="text-emerald-400" />
                Filtrar por mi rubro ({currentUser.profesionalInfo?.rubro || 'Profesional'})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sección Destacada: Últimos Trabajos Solicitados */}
      <RecentRequestedJobs hideViewAll={true} />

      {/* Tabs Principales de Visualización */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterView('todos')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              filterView === 'todos' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Todos los Pedidos ({jobs.length})
          </button>

          {currentUser?.rol === 'profesional' && (
            <>
              <button
                onClick={() => setFilterView('mi_rubro')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  filterView === 'mi_rubro' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Crown size={14} className="text-amber-400" />
                Mi Rubro ({jobs.filter(j => j.rubro === currentUser.profesionalInfo?.rubro).length})
              </button>

              {currentUser.zona && (
                <button
                  onClick={() => setFilterView('mi_zona')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterView === 'mi_zona' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <MapPin size={14} className="text-indigo-400" />
                  En mi Zona ({jobs.filter(j => j.zona === currentUser.zona).length})
                </button>
              )}
            </>
          )}

          {currentUser && (
            <button
              onClick={() => setFilterView('mis_pedidos')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterView === 'mis_pedidos' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <UserIcon size={14} />
              Mis Publicaciones ({jobs.filter(j => j.clienteId === currentUser.uid).length})
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md"
        >
          <PlusCircle size={16} /> Solicitar Presupuesto
        </button>
      </div>

      {/* PANEL DE FILTROS AVANZADOS POR OFICIO Y ZONA GEOGRÁFICA EN BAHÍA BLANCA */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Filter size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span>Filtros por Categoría y Zona en Bahía Blanca</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Limpiar Filtros
            </button>
          )}
        </div>

        {/* Buscador + Selects Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar trabajo por título o texto..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Selector Rubro */}
          <div>
            <select
              value={selectedRubro}
              onChange={(e) => setSelectedRubro(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="todos">Todos los oficios / rubros</option>
              {PROFESSIONS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Selector Zona */}
          <div>
            <select
              value={selectedZona}
              onChange={(e) => setSelectedZona(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="todas">Todas las zonas de Bahía Blanca</option>
              {ZONAS.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Selector Urgencia */}
          <div>
            <select
              value={selectedUrgencia}
              onChange={(e) => setSelectedUrgencia(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="todas">Cualquier urgencia</option>
              <option value="urgente">🔴 Urgente (Hoy / Mañana)</option>
              <option value="esta_semana">🟡 Esta semana</option>
              <option value="flexible">🟢 Flexible / Sin apuro</option>
            </select>
          </div>
        </div>

        {/* Chips de Categorías Populares */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Categorías más buscadas en Bahía Blanca:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedRubro('todos')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedRubro === 'todos'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {POPULAR_RUBROS.map(rubro => (
              <button
                key={rubro}
                onClick={() => setSelectedRubro(rubro === selectedRubro ? 'todos' : rubro)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedRubro === rubro
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {rubro}
              </button>
            ))}
          </div>
        </div>

        {/* Chips de Zonas Populares */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Zonas y Barrios de Bahía Blanca:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedZona('todas')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedZona === 'todas'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {POPULAR_ZONAS.map(zona => (
              <button
                key={zona}
                onClick={() => setSelectedZona(zona === selectedZona ? 'todas' : zona)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                  selectedZona === zona
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <MapPin size={11} className={selectedZona === zona ? 'text-white' : 'text-indigo-500'} />
                {zona}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de Filtros Activos y Contador */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">
              Mostrando <strong className="text-gray-900 dark:text-white font-bold">{filteredJobs.length}</strong> de {jobs.length} trabajos solicitados
            </span>

            {selectedRubro !== 'todos' && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium">
                Oficio: {selectedRubro}
                <button onClick={() => setSelectedRubro('todos')} className="hover:text-red-500"><X size={12} /></button>
              </span>
            )}

            {selectedZona !== 'todas' && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium">
                Zona: {selectedZona}
                <button onClick={() => setSelectedZona('todas')} className="hover:text-red-500"><X size={12} /></button>
              </span>
            )}

            {selectedUrgencia !== 'todas' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium">
                Urgencia: {selectedUrgencia}
                <button onClick={() => setSelectedUrgencia('todas')} className="hover:text-red-500"><X size={12} /></button>
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 dark:text-gray-400 select-none">
            <input
              type="checkbox"
              checked={onlyWithoutQuotes}
              onChange={(e) => setOnlyWithoutQuotes(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Solo sin presupuestos aún (oportunidad inmediata)</span>
          </label>
        </div>
      </div>

      {/* Grid de Trabajos Solicitados */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 auto-rows-fr">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No encontramos trabajos con los filtros actuales
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 text-sm">
            Probá quitando algunos filtros o seleccionando otra zona u oficio de Bahía Blanca.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetFilters}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              Restablecer Filtros
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs"
            >
              Publicar Pedido
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 auto-rows-fr">
          {filteredJobs.map((job) => {
            const isOwner = currentUser?.uid === job.clienteId;
            const proposalsCount = job.presupuestos?.length || 0;
            const myProposal = currentUser && job.presupuestos?.find(p => p.profesionalId === currentUser.uid);
            const alreadyQuoted = Boolean(myProposal);
            const isClosed = job.estado === 'completado' || job.estado === 'cancelado';

            const isTargeted = searchParams.get('jobId') === job.id;

            return (
              <div 
                key={job.id} 
                id={`job-card-${job.id}`}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border transition-colors flex flex-col justify-between h-full shadow-none ${
                  isTargeted ? 'border-indigo-500 ring-1 ring-indigo-500/30' : ''
                } ${
                  isClosed 
                    ? 'opacity-70 border-slate-200/60 dark:border-slate-700/60' 
                    : isOwner 
                      ? 'border-indigo-200 dark:border-indigo-800' 
                      : 'border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                      {job.rubro}
                    </span>
                    {getUrgenciaBadge(job.urgencia)}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                    {job.titulo}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mb-4 line-clamp-2 leading-relaxed">
                    {job.descripcion}
                  </p>

                  {/* Details pill row */}
                  <div className="space-y-1.5 mb-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span>Zona: <strong className="text-slate-700 dark:text-slate-200 font-medium">{job.zona}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign size={13} className="text-slate-400 shrink-0" />
                      <span>Presupuesto: <strong className="text-slate-700 dark:text-slate-200 font-medium">{job.presupuestoAproximado || 'A convenir'}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <UserIcon size={13} className="text-slate-400 shrink-0" />
                      <span>Publicado por: <strong className="text-slate-700 dark:text-slate-200 font-medium">{job.clienteNombre}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions & Status */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <MessageCircle size={13} />
                      {proposalsCount === 0 ? 'Sin presupuestos aún' : `${proposalsCount} ${proposalsCount === 1 ? 'presupuesto' : 'presupuestos'}`}
                    </span>

                    {isClosed ? (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium uppercase">
                        Cerrado
                      </span>
                    ) : job.estado === 'en_progreso' ? (
                      <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-medium uppercase">
                        En Progreso
                      </span>
                    ) : null}
                  </div>

                  {/* Caso 1: Es el dueño del trabajo (Cliente) */}
                  {isOwner ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingProposalsJob(job)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle size={14} />
                        Ver Presupuestos ({proposalsCount})
                      </button>
                      {!isClosed && (
                        <button
                          onClick={() => handleCloseJob(job.id!)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                          title="Cerrar solicitud"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  ) : currentUser?.rol === 'profesional' ? (
                    /* Caso 2: Es un profesional */
                    alreadyQuoted ? (
                      <div className="space-y-2">
                        <div className="bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 p-2 rounded-xl text-xs font-medium flex items-center justify-between border border-slate-200/80 dark:border-slate-600">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            Cotizado: ${Number(myProposal?.montoEstimado).toLocaleString('es-AR')}
                          </span>
                          <button
                            onClick={() => setQuotingJob(job)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    ) : isClosed ? (
                      <div className="text-center py-2 text-xs font-medium text-slate-400">
                        Esta solicitud ya fue finalizada
                      </div>
                    ) : (
                      <button
                        onClick={() => setQuotingJob(job)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Send size={14} />
                        Pasar Presupuesto
                      </button>
                    )
                  ) : (
                    /* Caso 3: Visitante o usuario común */
                    <button
                      onClick={() => setShowAuthNotice(true)}
                      className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Briefcase size={14} />
                      ¿Sos profesional? Pasar Presupuesto
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPONENTE: ProfessionalQuoteAction (Modal para enviar / editar presupuesto) */}
      {quotingJob && (
        <ProfessionalQuoteAction
          job={quotingJob}
          existingProposal={
            currentUser 
              ? quotingJob.presupuestos?.find(p => p.profesionalId === currentUser.uid) || null 
              : null
          }
          isOpen={Boolean(quotingJob)}
          onSuccess={() => {
            setQuotingJob(null);
          }}
          onCancel={() => {
            setQuotingJob(null);
          }}
        />
      )}

      {/* MODAL: Publicar Trabajo Requerido / Solicitar Presupuesto Múltiple */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            {!currentUser ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={32} />
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full mb-3 border border-indigo-100 dark:border-indigo-900">
                  <Sparkles size={14} /> Solicitá presupuestos sin cargo
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Registrate para solicitar un trabajo
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                  Para publicar un trabajo o pedir presupuestos a los profesionales verificados de Bahía Blanca, necesitás tener una cuenta. Crear tu cuenta es <strong>100% gratuito</strong> para clientes y vecinos.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 mb-6 text-left border border-slate-200/70 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>100% gratuito, sin comisiones ni intermediarios</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Recibí presupuestos técnicos de profesionales calificados</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Chateá directo o coordiná visitas por WhatsApp</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link
                    to="/signup?redirect=%2Ftrabajos%3Fcrear%3Dtrue&motivo=solicitar_trabajo"
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <span>Crear Cuenta Gratis (en 30 seg)</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/login?redirect=%2Ftrabajos%3Fcrear%3Dtrue&motivo=solicitar_trabajo"
                    className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Ya tengo cuenta, Iniciar Sesión
                  </Link>
                </div>
              </div>
            ) : createSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Solicitud publicada con éxito!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Los profesionales de Bahía Blanca en tu rubro y zona fueron notificados y comenzarán a enviarte sus cotizaciones.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full mb-2">
                    <Sparkles size={14} /> Publicar Trabajo Solicitado
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Publicá tu Trabajo en Bahía Blanca
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Describí lo que necesitás una sola vez. Los profesionales del rubro revisarán tu pedido y te enviarán sus propuestas técnicas y precios.
                  </p>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Título del Trabajo o Arreglo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newJob.titulo}
                    onChange={(e) => setNewJob({ ...newJob, titulo: e.target.value })}
                    placeholder="Ej: Cambio de termotanque y revisión de pérdidas en cocina"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Rubro y Zona */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Oficio / Rubro Necesario *
                    </label>
                    <select
                      value={newJob.rubro}
                      onChange={(e) => setNewJob({ ...newJob, rubro: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {PROFESSIONS.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Zona en Bahía Blanca *
                    </label>
                    <select
                      value={newJob.zona}
                      onChange={(e) => setNewJob({ ...newJob, zona: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {ZONAS.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Urgencia y Presupuesto aproximado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      ¿Cuándo lo necesitás? *
                    </label>
                    <select
                      value={newJob.urgencia}
                      onChange={(e) => setNewJob({ ...newJob, urgencia: e.target.value as any })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="urgente">🔴 Urgente (Hoy o Mañana)</option>
                      <option value="esta_semana">🟡 Esta semana</option>
                      <option value="flexible">🟢 Flexible / Sin apuro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Presupuesto Aprox. (opcional)
                    </label>
                    <input
                      type="text"
                      value={newJob.presupuestoAproximado}
                      onChange={(e) => setNewJob({ ...newJob, presupuestoAproximado: e.target.value })}
                      placeholder="Ej: $40.000 o A convenir"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Descripción del Trabajo Requerido *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newJob.descripcion}
                    onChange={(e) => setNewJob({ ...newJob, descripcion: e.target.value })}
                    placeholder="Detallá el arreglo: ¿Qué falla presenta? ¿Contás con los repuestos/materiales o debe incluirlos el profesional? Indicá dimensiones aproximadas si corresponde..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  ></textarea>
                </div>

                {/* Datos de Contacto de la cuenta autenticada */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      Publicando como: <strong>{currentUser?.nombre || currentUser?.email}</strong>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      Cuenta verificada
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Teléfono / WhatsApp para recibir llamados o propuestas:
                    </label>
                    <input
                      type="tel"
                      required
                      value={newJob.clienteTelefono}
                      onChange={(e) => setNewJob({ ...newJob, clienteTelefono: e.target.value })}
                      placeholder="WhatsApp (ej: 2914123456)"
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Send size={16} /> Publicar Trabajo
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Ver Presupuestos Recibidos (Para el cliente creador) */}
      {viewingProposalsJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setViewingProposalsJob(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-4 pr-8">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full mb-1">
                Presupuestos Recibidos
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {viewingProposalsJob.titulo}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Zona: {viewingProposalsJob.zona} • Rubro: {viewingProposalsJob.rubro}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              {(!viewingProposalsJob.presupuestos || viewingProposalsJob.presupuestos.length === 0) ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                    <Clock size={24} className="text-gray-400" />
                  </div>
                  <p className="font-bold text-sm">Todavía no recibiste presupuestos para este pedido.</p>
                  <p className="text-xs mt-1">Los profesionales de Bahía Blanca están revisando las solicitudes nuevas.</p>
                </div>
              ) : (
                viewingProposalsJob.presupuestos.map((proposal) => {
                  const cleanPhone = proposal.profesionalTelefono?.replace(/\D/g, '') || '';
                  const whatsappMsg = encodeURIComponent(
                    `Hola ${proposal.profesionalNombre}, vi tu presupuesto de $${proposal.montoEstimado} en Bahía Oficios para mi trabajo "${viewingProposalsJob.titulo}". Me gustaría coordinar con vos.`
                  );
                  const whatsappUrl = `https://wa.me/54${cleanPhone}?text=${whatsappMsg}`;
                  const isAccepted = proposal.estado === 'aceptado';
                  const isRejected = proposal.estado === 'rechazado';

                  return (
                    <div 
                      key={proposal.id} 
                      className={`p-5 rounded-2xl border transition-all ${
                        isAccepted 
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/20'
                          : isRejected 
                            ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 opacity-60'
                            : proposal.profesionalIsVip 
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <CachedImage
                            src={proposal.profesionalFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(proposal.profesionalNombre)}`}
                            alt={proposal.profesionalNombre}
                            className={`w-12 h-12 rounded-full object-cover border-2 ${proposal.profesionalIsVip ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-gray-200'}`}
                            containerClassName="rounded-full shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                                {proposal.profesionalNombre}
                              </h4>
                              {proposal.profesionalIsVip && (
                                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <Crown size={10} className="fill-slate-950 text-slate-950" /> VIP
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {proposal.profesionalRubro}
                            </span>
                          </div>
                        </div>

                        {/* Monto cotizado y Estado */}
                        <div className="text-right w-full sm:w-auto bg-white dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Cotización</span>
                            {isAccepted && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                Aceptado
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                                Rechazado
                              </span>
                            )}
                          </div>
                          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${Number(proposal.montoEstimado).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Mensaje de la propuesta */}
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 leading-relaxed">
                        "{proposal.mensaje}"
                      </p>

                      {/* Badges de condiciones */}
                      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                        <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg font-medium">
                          ⏱ Tiempo: {proposal.tiempoEstimado}
                        </span>
                        {proposal.incluyeMateriales && (
                          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-medium">
                            ✓ Incluye materiales
                          </span>
                        )}
                        {proposal.requiereVisitaPrevia && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg font-medium">
                            🔍 Requiere visita previa
                          </span>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                        {/* Aceptar / Rechazar Oferta */}
                        <div className="flex items-center gap-2">
                          {!isAccepted && (
                            <button
                              onClick={() => handleUpdateProposalStatus(proposal, 'aceptado')}
                              disabled={updatingProposalStatus === proposal.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <CheckCircle2 size={13} />
                              Aceptar Oferta
                            </button>
                          )}

                          {!isRejected && !isAccepted && (
                            <button
                              onClick={() => handleUpdateProposalStatus(proposal, 'rechazado')}
                              disabled={updatingProposalStatus === proposal.id}
                              className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
                            >
                              Rechazar
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {cleanPhone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs shadow-sm transition-colors"
                            >
                              <MessageCircle size={14} />
                              WhatsApp
                            </a>
                          )}

                          <Link
                            to={`/profesional/${proposal.profesionalSlug || proposal.profesionalId}`}
                            className="py-1.5 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            Conocer trabajos y opiniones
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4 flex justify-between items-center">
              {viewingProposalsJob.estado !== 'completado' && (
                <button
                  onClick={() => handleCloseJob(viewingProposalsJob.id!)}
                  className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                >
                  <Check size={14} /> Marcar trabajo como resuelto y cerrar
                </button>
              )}
              <button
                onClick={() => setViewingProposalsJob(null)}
                className="py-2 px-5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Aviso para usuarios no profesionales */}
      {showAuthNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 text-center relative animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              ¿Sos profesional en Bahía Blanca?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Para enviar propuestas de presupuesto y cotizar trabajos necesitás tener una cuenta de profesional registrada en Bahía Oficios.
            </p>

            <div className="space-y-3">
              <Link
                to="/signup"
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/20"
              >
                Crear Perfil Profesional Gratis
              </Link>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Ya tengo cuenta, Iniciar Sesión
              </Link>
              <button
                onClick={() => setShowAuthNotice(false)}
                className="text-xs text-gray-400 hover:underline pt-2 block mx-auto"
              >
                Volver al listado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pedir registrarse o iniciar sesión para solicitar un trabajo */}
      {showClientAuthNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 text-center relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowClientAuthNotice(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase size={32} />
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full mb-3 border border-indigo-100 dark:border-indigo-900">
              <Sparkles size={14} /> Solicitá presupuestos gratis
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              Registrate para solicitar un trabajo
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
              Para publicar tu pedido y recibir cotizaciones de profesionales verificados de Bahía Blanca, necesitás registrarte o iniciar sesión. ¡Es <strong>100% gratuito</strong>!
            </p>

            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-4 mb-6 text-left border border-slate-200/70 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>100% gratis para clientes y vecinos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Recibí hasta 3 cotizaciones técnicas y precios</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Chateá directo o coordiná visitas por WhatsApp</span>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to="/signup?redirect=%2Ftrabajos%3Fcrear%3Dtrue&motivo=solicitar_trabajo"
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <span>Crear Cuenta Gratis (en 30 seg)</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login?redirect=%2Ftrabajos%3Fcrear%3Dtrue&motivo=solicitar_trabajo"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Ya tengo cuenta, Iniciar Sesión
              </Link>
              <button
                onClick={() => setShowClientAuthNotice(false)}
                className="text-xs text-gray-400 hover:underline pt-1 block mx-auto"
              >
                Volver al listado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
