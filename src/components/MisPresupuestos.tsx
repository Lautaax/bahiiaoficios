import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Trash2, 
  Search, 
  Calculator, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  ShieldCheck,
  Package,
  Wrench,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  SavedPresupuesto, 
  getPresupuestos, 
  deletePresupuesto, 
  downloadPresupuestoPdf, 
  sharePresupuestoWhatsApp 
} from '../utils/presupuestosStorage';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';

export const MisPresupuestos: React.FC = () => {
  const { currentUser } = useAuth();
  const [presupuestos, setPresupuestos] = useState<SavedPresupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRubro, setSelectedRubro] = useState('Todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal para ver/editar en formato contrato
  const [selectedForModal, setSelectedForModal] = useState<SavedPresupuesto | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPresupuestos(currentUser?.uid);
      setPresupuestos(data);
    } catch (err) {
      console.error('Error cargando presupuestos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Escuchar actualizaciones de presupuestos en tiempo real
    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('presupuestos_updated', handleUpdate);
    return () => {
      window.removeEventListener('presupuestos_updated', handleUpdate);
    };
  }, [currentUser]);

  // Lista de rubros presentes en los presupuestos
  const rubrosList = useMemo(() => {
    const set = new Set(presupuestos.map(p => p.rubro || 'General'));
    return ['Todos', ...Array.from(set)];
  }, [presupuestos]);

  // Filtrado reactivo
  const filteredList = useMemo(() => {
    let list = presupuestos;
    if (selectedRubro !== 'Todos') {
      list = list.filter(p => (p.rubro || 'General') === selectedRubro);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.titulo || '').toLowerCase().includes(q) ||
        (p.clienteNombre || '').toLowerCase().includes(q) ||
        (p.rubro || '').toLowerCase().includes(q) ||
        (p.clienteDireccion || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [presupuestos, selectedRubro, searchQuery]);

  // Métricas acumuladas
  const metrics = useMemo(() => {
    const totalCount = presupuestos.length;
    const totalAmount = presupuestos.reduce((acc, p) => acc + (p.montoTotal || 0), 0);
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    return { totalCount, totalAmount, avgAmount };
  }, [presupuestos]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseás eliminar este presupuesto de tu historial?')) {
      await deletePresupuesto(id, currentUser?.uid);
      setNotification('🗑️ Presupuesto eliminado del historial.');
      setTimeout(() => setNotification(null), 3500);
      loadData();
    }
  };

  const handleDownload = (p: SavedPresupuesto, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPresupuestoPdf(p);
    setNotification('✅ PDF descargado en tu dispositivo.');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleShare = async (p: SavedPresupuesto, e: React.MouseEvent) => {
    e.stopPropagation();
    await sharePresupuestoWhatsApp(p);
    setNotification('✅ PDF generado y listo para enviar por WhatsApp.');
    setTimeout(() => setNotification(null), 4500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Notificación Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-bold">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0f245c] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold mb-2">
            <FileText size={14} className="text-[#0f245c] dark:text-blue-400" />
            <span>Historial Oficial de Cotizaciones y Contratos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Mis Presupuestos
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Consultá, descargá nuevamente o compartí en PDF los presupuestos y contratos generados con separación de mano de obra y materiales.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Actualizar historial"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/calculadora-costos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f245c] hover:bg-[#163683] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-950/20 active:scale-95"
          >
            <Calculator size={16} className="text-blue-300" />
            <span>Nuevo Presupuesto</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0f245c] dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Presupuestos Generados</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalCount}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monto Total Cotizado</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${metrics.totalAmount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Promedio</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              ${metrics.avgAmount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>
      </div>

      {/* Filtros de Búsqueda y Rubros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, título o dirección..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Rubro:</span>
          {rubrosList.map(rubro => (
            <button
              key={rubro}
              type="button"
              onClick={() => setSelectedRubro(rubro)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedRubro === rubro
                  ? 'bg-[#0f245c] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {rubro}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Presupuestos */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold">Cargando tus presupuestos guardados...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#0f245c] dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <Calculator size={30} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {searchQuery ? 'No encontramos coincidencias' : 'Aún no tenés presupuestos guardados'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {searchQuery 
                ? 'Probá modificando el término de búsqueda o seleccionando otro rubro.'
                : 'Utilizá la Calculadora de Costos para armar cómputos de obra o contratos y guardarlos automáticamente acá.'}
            </p>
          </div>
          {!searchQuery && (
            <Link
              to="/calculadora-costos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f245c] hover:bg-[#163683] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Crear mi primer presupuesto</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(item => {
            const isExpanded = expandedId === item.id;
            const hasItems = item.items && item.items.length > 0;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:border-blue-400 transition-all"
              >
                {/* Cabecera del Ítem */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0f245c] text-white">
                        {item.rubro || 'Construcción'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar size={13} />
                        {item.fecha || new Date(item.fechaTimestamp).toLocaleDateString('es-AR')}
                      </span>
                      {item.clienteNombre && (
                        <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <User size={13} className="text-blue-600" />
                          {item.clienteNombre}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {item.titulo}
                    </h3>

                    {/* Chips Económicos Discriminados */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Wrench size={13} className="text-blue-600" />
                        <span>Mano de Obra: <strong>${item.montoManoObra.toLocaleString('es-AR')}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Package size={13} />
                        <span>Materiales: <strong>${item.montoMateriales.toLocaleString('es-AR')}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <span>Seña: <strong>${item.montoSena.toLocaleString('es-AR')}</strong></span>
                      </div>
                    </div>
                    {/* Referencia al documento PDF oficial */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                        <FileText size={11} className="text-amber-500" />
                        <span>Presupuesto_{(item.titulo || 'Obra').replace(/\s+/g, '_').slice(0, 25)}_BahiaOficios.pdf</span>
                      </span>
                      {item.userId && item.userId !== 'invitado' ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Sincronizado en Firestore
                        </span>
                      ) : (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                          Guardado Localmente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total y Acciones */}
                  <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Presupuestado</span>
                      <span className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-300">
                        ${item.montoTotal.toLocaleString('es-AR')} ARS
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hasItems && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{item.items.length} tareas</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}

                      {/* Botón Descargar PDF con etiqueta */}
                      <button
                        type="button"
                        onClick={(e) => handleDownload(item, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-[#0f245c] dark:text-blue-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Descargar PDF nuevamente"
                      >
                        <Download size={13} />
                        <span>Descargar PDF</span>
                      </button>

                      {/* Botón Compartir WhatsApp con etiqueta */}
                      <button
                        type="button"
                        onClick={(e) => handleShare(item, e)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                        title="Compartir por WhatsApp"
                      >
                        <Share2 size={13} />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedForModal(item)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                        title="Ver en formato Contrato / Recibo"
                      >
                        <FileText size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                        title="Eliminar del historial"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acordeón con Tabla Detallada de Tareas */}
                {isExpanded && hasItems && (
                  <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                          <th className="py-2 px-3">Tarea / Concepto</th>
                          <th className="py-2 px-2 text-center">Unidad</th>
                          <th className="py-2 px-2 text-center">Cantidad</th>
                          <th className="py-2 px-3 text-right">Mat. Unit</th>
                          <th className="py-2 px-3 text-right">Mat. Subtot</th>
                          <th className="py-2 px-3 text-right">M.O. Unit</th>
                          <th className="py-2 px-3 text-right">M.O. Subtot</th>
                          <th className="py-2 px-3 text-right font-black">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                        {item.items.map((it, idx) => (
                          <tr key={`${it.id}-${idx}`}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{it.tarea}</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-600 dark:text-slate-300">{it.unidad}</td>
                            <td className="py-2 px-2 text-center font-bold text-slate-900 dark:text-white">{it.cantidad}</td>
                            <td className="py-2 px-3 text-right text-amber-800 dark:text-amber-300">
                              {it.costoMatUnit > 0 ? `$${it.costoMatUnit.toLocaleString('es-AR')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-amber-800 dark:text-amber-300">
                              {it.subtotalMat > 0 ? `$${it.subtotalMat.toLocaleString('es-AR')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-800 dark:text-blue-300">
                              {it.costoMoUnit > 0 ? `$${it.costoMoUnit.toLocaleString('es-AR')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-blue-800 dark:text-blue-300">
                              {it.subtotalMo > 0 ? `$${it.subtotalMo.toLocaleString('es-AR')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-900 dark:text-white">
                              ${it.subtotalTotal.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Contrato para ver/editar presupuesto seleccionado */}
      {selectedForModal && (
        <ContratoPresupuestoModal
          isOpen={true}
          onClose={() => setSelectedForModal(null)}
          initialJobTitle={selectedForModal.titulo}
          initialRubro={selectedForModal.rubro}
          initialClientName={selectedForModal.clienteNombre}
          initialClientPhone={selectedForModal.clienteTelefono}
          initialClientAddress={selectedForModal.clienteDireccion}
          initialManoObra={selectedForModal.montoManoObra}
          initialMateriales={selectedForModal.montoMateriales}
          initialAmount={selectedForModal.montoTotal}
        />
      )}
    </div>
  );
};
