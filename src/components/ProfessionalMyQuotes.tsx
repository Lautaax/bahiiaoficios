import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JobOfferRecord, JobPost, JobBudgetProposal } from '../types';
import { ProfessionalQuoteAction } from './ProfessionalQuoteAction';
import { 
  DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, 
  Edit3, MessageCircle, ExternalLink, Filter, Search, 
  MapPin, Briefcase, Calendar, Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfessionalMyQuotes: React.FC = () => {
  const { currentUser } = useAuth();
  const [offers, setOffers] = useState<JobOfferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'aceptado' | 'rechazado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingJob, setEditingJob] = useState<JobPost | null>(null);
  const [editingProposal, setEditingProposal] = useState<JobBudgetProposal | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.rol !== 'profesional') {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Escuchar ofertas enviadas por este profesional
    const q = query(
      collection(db, 'ofertasPresupuesto'),
      where('profesionalId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: JobOfferRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as JobOfferRecord));

      // Ordenar por fecha descendente
      records.sort((a, b) => {
        const timeA = a.fechaActualizacion?.toDate?.() || a.fechaEnvio?.toDate?.() || new Date(0);
        const timeB = b.fechaActualizacion?.toDate?.() || b.fechaEnvio?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
      });

      setOffers(records);
      setLoading(false);
    }, (err) => {
      console.error("Error al escuchar ofertas de presupuesto:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Manejar click para abrir edición
  const handleOpenEdit = async (offer: JobOfferRecord) => {
    try {
      // Obtener el trabajo actual desde Firestore
      const jobDoc = await getDoc(doc(db, 'trabajosSolicitados', offer.trabajoId));
      let jobData: JobPost;
      if (jobDoc.exists()) {
        jobData = { id: jobDoc.id, ...jobDoc.data() } as JobPost;
      } else {
        jobData = {
          id: offer.trabajoId,
          titulo: offer.trabajoTitulo,
          descripcion: '',
          rubro: offer.trabajoRubro,
          zona: offer.trabajoZona,
          urgencia: 'esta_semana',
          clienteId: offer.clienteId,
          clienteNombre: offer.clienteNombre,
          clienteTelefono: offer.clienteTelefono,
          fechaCreacion: offer.fechaEnvio,
          estado: 'abierto',
          presupuestos: []
        };
      }

      const proposalData: JobBudgetProposal = {
        id: `prop_${offer.profesionalId}`,
        profesionalId: offer.profesionalId,
        profesionalNombre: offer.profesionalNombre,
        profesionalFoto: offer.profesionalFoto,
        profesionalRubro: offer.profesionalRubro,
        profesionalTelefono: offer.profesionalTelefono,
        profesionalIsVip: offer.profesionalIsVip,
        profesionalRating: offer.profesionalRating,
        montoEstimado: offer.montoEstimado,
        tiempoEstimado: offer.tiempoEstimado,
        mensaje: offer.mensaje,
        incluyeMateriales: offer.incluyeMateriales,
        requiereVisitaPrevia: offer.requiereVisitaPrevia,
        fecha: offer.fechaEnvio,
        estado: offer.estado
      };

      setEditingJob(jobData);
      setEditingProposal(proposalData);
      setShowEditModal(true);
    } catch (err) {
      console.error("Error al preparar edición de oferta:", err);
      alert("No se pudo cargar la información del trabajo para editar el presupuesto.");
    }
  };

  const filteredOffers = offers.filter(o => {
    if (statusFilter !== 'todos' && o.estado !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = o.trabajoTitulo?.toLowerCase().includes(term);
      const matchClient = o.clienteNombre?.toLowerCase().includes(term);
      const matchRubro = o.trabajoRubro?.toLowerCase().includes(term);
      const matchZona = o.trabajoZona?.toLowerCase().includes(term);
      if (!matchTitle && !matchClient && !matchRubro && !matchZona) return false;
    }
    return true;
  });

  const countTotal = offers.length;
  const countPendientes = offers.filter(o => o.estado === 'pendiente' || !o.estado).length;
  const countAceptados = offers.filter(o => o.estado === 'aceptado').length;
  const countRechazados = offers.filter(o => o.estado === 'rechazado').length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Mis Presupuestos Enviados
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Administrá tus cotizaciones enviadas a clientes de Bahía Blanca, verificá su estado y editá tus propuestas.
          </p>
        </div>
        <Link
          to="/trabajos"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md shadow-indigo-600/20 transition-all"
        >
          <Briefcase size={16} />
          Ver Trabajos Solicitados
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Ofertas</span>
            <DollarSign size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">{countTotal}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendientes</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{countPendientes}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Aceptados</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{countAceptados}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-red-200 dark:border-red-800/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Rechazados</span>
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">{countRechazados}</div>
        </div>
      </div>

      {/* Controles de Filtro y Búsqueda */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'todos'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Todos ({countTotal})
          </button>
          <button
            onClick={() => setStatusFilter('pendiente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'pendiente'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Pendientes ({countPendientes})
          </button>
          <button
            onClick={() => setStatusFilter('aceptado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'aceptado'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Aceptados ({countAceptados})
          </button>
          <button
            onClick={() => setStatusFilter('rechazado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === 'rechazado'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Rechazados ({countRechazados})
          </button>
        </div>

        {/* Buscador rápido */}
        <div className="relative sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por trabajo o cliente..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Presupuestos */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-8">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <DollarSign size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {offers.length === 0 ? 'Todavía no enviaste presupuestos' : 'No hay presupuestos con ese filtro'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {offers.length === 0 
              ? 'Revisá los pedidos activos en el Tablón de Trabajos de Bahía Blanca y enviá cotizaciones competitivas para ganar clientes.'
              : 'Probá seleccionando otro estado o limpiando el texto del buscador.'}
          </p>
          <Link
            to="/trabajos"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md shadow-indigo-600/20"
          >
            <Briefcase size={14} /> Explorar Trabajos Abiertos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => {
            const status = offer.estado || 'pendiente';
            const cleanPhone = offer.clienteTelefono?.replace(/\D/g, '') || '';
            const whatsappMsg = encodeURIComponent(
              `Hola ${offer.clienteNombre}, te contacto desde Bahía Oficios respecto a tu trabajo "${offer.trabajoTitulo}" para el cual te envié un presupuesto de $${offer.montoEstimado}.`
            );
            const whatsappUrl = `https://wa.me/54${cleanPhone}?text=${whatsappMsg}`;

            return (
              <div
                key={offer.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header de la oferta */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {offer.trabajoRubro}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} className="text-indigo-500" />
                        {offer.trabajoZona}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {offer.fechaEnvio?.toDate ? offer.fechaEnvio.toDate().toLocaleDateString('es-AR') : 'Reciente'}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {offer.trabajoTitulo}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Cliente: <strong className="text-gray-700 dark:text-gray-200">{offer.clienteNombre}</strong>
                    </p>
                  </div>

                  {/* Estado Badge y Monto */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    {status === 'aceptado' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={13} /> ¡Aceptado!
                      </span>
                    ) : status === 'rechazado' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
                        <XCircle size={13} /> Rechazado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock size={13} /> Pendiente de Respuesta
                      </span>
                    )}

                    <div className="text-right">
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${Number(offer.montoEstimado).toLocaleString('es-AR')}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-medium">
                        ⏱ {offer.tiempoEstimado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mensaje enviado */}
                <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  <span className="font-bold block text-gray-900 dark:text-white mb-1">
                    Tu propuesta enviada:
                  </span>
                  "{offer.mensaje}"
                </div>

                {/* Badges de condiciones */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {offer.incluyeMateriales && (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      ✓ Incluye materiales
                    </span>
                  )}
                  {offer.requiereVisitaPrevia && (
                    <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium text-[11px]">
                      🔍 Requiere visita previa
                    </span>
                  )}
                  {offer.fechaActualizacion && (
                    <span className="text-gray-400 text-[10px] ml-auto">
                      Actualizado: {offer.fechaActualizacion?.toDate ? offer.fechaActualizacion.toDate().toLocaleDateString('es-AR') : ''}
                    </span>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(offer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold transition-colors"
                    >
                      <Edit3 size={13} />
                      Editar Presupuesto
                    </button>

                    <Link
                      to={`/trabajos?search=${encodeURIComponent(offer.trabajoTitulo)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-gray-500 hover:text-indigo-600 text-xs font-medium transition-colors"
                    >
                      <ExternalLink size={13} />
                      Ver en Tablón
                    </Link>
                  </div>

                  {cleanPhone && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs shadow-sm transition-colors"
                    >
                      <MessageCircle size={14} />
                      Contactar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edición de Presupuesto */}
      {showEditModal && editingJob && (
        <ProfessionalQuoteAction
          job={editingJob}
          existingProposal={editingProposal}
          isOpen={showEditModal}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingJob(null);
            setEditingProposal(null);
          }}
          onCancel={() => {
            setShowEditModal(false);
            setEditingJob(null);
            setEditingProposal(null);
          }}
        />
      )}
    </div>
  );
};
