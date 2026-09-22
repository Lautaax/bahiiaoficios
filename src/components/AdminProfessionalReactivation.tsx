import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { 
  Bell, 
  Send, 
  AlertTriangle, 
  Clock, 
  Eye, 
  PhoneCall, 
  MapPin, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  UserX, 
  Flame, 
  MessageSquare,
  ChevronRight,
  Filter,
  Camera,
  X
} from 'lucide-react';
import { 
  identifyInactiveProfessionals, 
  InactiveProfessionalItem, 
  sendReactivationNotification, 
  sendBulkReactivationNotifications 
} from '../services/adminOperationsService';
import { 
  sendPhotoIncentiveNotification, 
  sendBulkPhotoIncentives 
} from '../services/photoIncentiveService';

interface AdminProfessionalReactivationProps {
  users: User[];
  onRefreshData?: () => void;
}

export const AdminProfessionalReactivation: React.FC<AdminProfessionalReactivationProps> = ({
  users,
  onRefreshData
}) => {
  const [daysThreshold, setDaysThreshold] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'sin_visitas' | 'sin_fotos' | 'notificados'>('todos');
  
  // Selection and Modal State
  const [selectedPro, setSelectedPro] = useState<InactiveProfessionalItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSendingPhotosBulk, setIsSendingPhotosBulk] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Bulk Sending State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Calculate inactive professionals list based on threshold
  const inactiveList = useMemo(() => {
    return identifyInactiveProfessionals(users, daysThreshold);
  }, [users, daysThreshold]);

  // Filtered list based on search and status filter
  const filteredList = useMemo(() => {
    return inactiveList.filter(item => {
      const u = item.user;
      const rubro = u.profesionalInfo?.rubro || '';
      const zona = u.zona || '';
      const matchesSearch = 
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rubro.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zona.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'pendientes') return item.status === 'pendiente';
      if (statusFilter === 'notificados') return item.status === 'notificado_reciente';
      if (statusFilter === 'sin_visitas') return item.views === 0;
      if (statusFilter === 'sin_fotos') return item.needsPhotosIncentive;

      return true;
    });
  }, [inactiveList, searchTerm, statusFilter]);

  // Metrics
  const stats = useMemo(() => {
    const totalInactive = inactiveList.length;
    const pendingCount = inactiveList.filter(i => i.status === 'pendiente').length;
    const zeroViewsCount = inactiveList.filter(i => i.views === 0).length;
    const needsPhotosCount = inactiveList.filter(i => i.needsPhotosIncentive).length;
    const criticalInactiveCount = inactiveList.filter(i => i.daysInactive >= 60).length;
    const notifiedRecentlyCount = inactiveList.filter(i => i.status === 'notificado_reciente').length;

    return {
      totalInactive,
      pendingCount,
      zeroViewsCount,
      needsPhotosCount,
      criticalInactiveCount,
      notifiedRecentlyCount
    };
  }, [inactiveList]);

  // Open modal for single professional
  const openReactivationModal = (item: InactiveProfessionalItem) => {
    setSelectedPro(item);
    const rubro = item.user.profesionalInfo?.rubro || 'oficio';
    const zona = item.user.zona || 'Bahía Blanca';
    const firstName = item.user.nombre.split(' ')[0];

    if (item.needsPhotosIncentive) {
      setCustomTitle(`📸 ¡Duplicá tus contactos! Añadí al menos 2 fotos de trabajos`);
      setCustomMessage(`Hola ${firstName}, añadir al menos 2 fotos de trabajos duplica la tasa de contacto (+100%) y genera máxima confianza en los vecinos de Bahía Blanca al contratar. ¡Subí tus fotos y empezá a recibir tus primeras visitas!`);
    } else {
      setCustomTitle(`👋 ¡Hola ${firstName}! Te extrañamos en Bahía Oficios`);
      setCustomMessage(`Hay vecinos en ${zona} buscando presupuestos de ${rubro}. Reactivá tu perfil para recibir solicitudes y presupuestar hoy.`);
    }
  };

  // Predefined templates
  const applyTemplate = (templateType: 'oportunidad' | 'disponibilidad' | 'fotos') => {
    if (!selectedPro) return;
    const rubro = selectedPro.user.profesionalInfo?.rubro || 'oficio';
    const zona = selectedPro.user.zona || 'Bahía Blanca';
    const firstName = selectedPro.user.nombre.split(' ')[0];

    if (templateType === 'oportunidad') {
      setCustomTitle(`🔥 ¡Nuevas oportunidades en ${zona}!`);
      setCustomMessage(`Hola ${firstName}, hay solicitudes abiertas para ${rubro} en tu zona. Ingresá ahora para cotizar a clientes interesados.`);
    } else if (templateType === 'disponibilidad') {
      setCustomTitle(`⚡ ¿Estás disponible para trabajar esta semana?`);
      setCustomMessage(`Confirmá tu disponibilidad en tu panel de Bahía Oficios para figurar entre los primeros recomendados de Bahía Blanca.`);
    } else if (templateType === 'fotos') {
      setCustomTitle(`📸 ¡Duplicá tus contactos! Añadí al menos 2 fotos de trabajos`);
      setCustomMessage(`Hola ${firstName}, añadir al menos 2 fotos de trabajos duplica la tasa de contacto (+100%) y genera máxima confianza en los vecinos de Bahía Blanca al contratar. ¡Subí tus fotos y empezá a recibir tus primeras visitas!`);
    }
  };

  // Send single notification
  const handleSendSingle = async () => {
    if (!selectedPro) return;
    setIsSending(true);
    try {
      let res;
      if (selectedPro.needsPhotosIncentive || customTitle.includes('fotos') || customTitle.includes('📸')) {
        res = await sendPhotoIncentiveNotification(selectedPro.user, customTitle, customMessage);
      } else {
        res = await sendReactivationNotification(selectedPro.user, customTitle, customMessage);
      }

      if (res.success) {
        setSuccessNotice(`Notificación enviada con éxito a ${selectedPro.user.nombre}`);
        setSelectedPro(null);
        if (onRefreshData) onRefreshData();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert("Error al enviar notificación: " + err?.message);
    } finally {
      setIsSending(false);
    }
  };

  // Quick single-click photo incentive
  const handleSendPhotoIncentiveSingle = async (item: InactiveProfessionalItem) => {
    try {
      const res = await sendPhotoIncentiveNotification(item.user);
      if (res.success) {
        setSuccessNotice(`Incentivo de fotos enviado a ${item.user.nombre} (+100% contactos)`);
        if (onRefreshData) onRefreshData();
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert("Error al enviar incentivo: " + err?.message);
    }
  };

  // Handle bulk sending for photo incentive
  const handleBulkSendPhotoIncentives = async () => {
    const targets = inactiveList.filter(i => i.needsPhotosIncentive).map(i => i.user);
    if (targets.length === 0) {
      alert("No hay profesionales con 0 visitas y menos de 2 fotos para notificar.");
      return;
    }

    if (!window.confirm(`¿Enviar el incentivo de carga de fotos a ${targets.length} profesionales con 0 vistas? Se les informará que añadir 2 fotos duplica la tasa de contacto.`)) {
      return;
    }

    setIsSendingPhotosBulk(true);
    setBulkProgress({ current: 0, total: targets.length });

    try {
      const { successCount, failCount } = await sendBulkPhotoIncentives(
        targets,
        (current, total) => setBulkProgress({ current, total })
      );

      setSuccessNotice(`Incentivo de fotos enviado a ${successCount} trabajadores con 0 vistas.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (error: any) {
      alert("Error durante el envío masivo de incentivo de fotos: " + error?.message);
    } finally {
      setIsSendingPhotosBulk(false);
      setBulkProgress(null);
    }
  };

  // Handle bulk sending
  const handleBulkSend = async () => {
    const targets = inactiveList.filter(i => i.status === 'pendiente').map(i => i.user);
    if (targets.length === 0) {
      alert("No hay profesionales pendientes de reactivación en este momento.");
      return;
    }

    setShowBulkModal(false);
    setIsSending(true);
    setBulkProgress({ current: 0, total: targets.length });

    try {
      const { totalSent } = await sendBulkReactivationNotifications(
        targets,
        `👋 ¡Vecinos de Bahía Blanca buscan tu oficio!`,
        `Hay nuevas solicitudes de trabajo en Bahía Blanca. Reactivá tu perfil en Bahía Oficios para presupuestar hoy.`,
        (completed, total) => {
          setBulkProgress({ current: completed, total });
        }
      );

      setSuccessNotice(`Campaña completada: se enviaron ${totalSent} notificaciones push de reactivación.`);
      if (onRefreshData) onRefreshData();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert("Error en el envío masivo: " + err?.message);
    } finally {
      setIsSending(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 size={18} className="text-emerald-600" />
            {successNotice}
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-xs space-y-6">
        {/* Header & Description */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Bell size={22} className="animate-bounce" />
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Reactivación de Profesionales Inactivos
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Identificación automática de prestadores de Bahía Blanca sin actividad o visitas en los últimos 30 días. Envía notificaciones push directas para incentivar su participación y cotizaciones.
            </p>
          </div>

          {/* Bulk Action Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkSendPhotoIncentives}
              disabled={isSendingPhotosBulk || stats.needsPhotosCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Notificar a trabajadores con 0 vistas que añadir 2 fotos duplica su tasa de contacto"
            >
              <Camera size={16} />
              Incentivar Fotos ({stats.needsPhotosCount})
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={isSending || stats.pendingCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              Reactivar a Todos ({stats.pendingCount})
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Inactivos Totales</span>
              <UserX size={18} />
            </div>
            <strong className="text-2xl font-black text-amber-900 dark:text-amber-100">
              {stats.totalInactive}
            </strong>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-0.5">
              Sin visitas o actividad en &gt;{daysThreshold} días
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/50">
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Incentivo Fotos</span>
              <Camera size={18} />
            </div>
            <strong className="text-2xl font-black text-purple-900 dark:text-purple-100">
              {stats.needsPhotosCount}
            </strong>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 block mt-0.5">
              0 visitas y &lt;2 fotos (+100% contacto)
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">0 Visitas</span>
              <Eye size={18} />
            </div>
            <strong className="text-2xl font-black text-rose-900 dark:text-rose-100">
              {stats.zeroViewsCount}
            </strong>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 block mt-0.5">
              Nunca recibieron visitas en su perfil
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50">
            <div className="flex items-center justify-between text-orange-700 dark:text-orange-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Pendientes</span>
              <Clock size={18} />
            </div>
            <strong className="text-2xl font-black text-orange-900 dark:text-orange-100">
              {stats.pendingCount}
            </strong>
            <span className="text-[11px] text-orange-600 dark:text-orange-400 block mt-0.5">
              Aún no notificados esta semana
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Notificados</span>
              <CheckCircle2 size={18} />
            </div>
            <strong className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {stats.notifiedRecentlyCount}
            </strong>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Reactivados en los últimos 7 días
            </span>
          </div>
        </div>

        {/* Progress bar during bulk sending */}
        {bulkProgress && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <div className="flex justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <span>Enviando notificaciones push de reactivación...</span>
              <span>{bulkProgress.current} de {bulkProgress.total}</span>
            </div>
            <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Search and Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, oficio o barrio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {/* Threshold & Status Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 text-xs">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${statusFilter === 'todos' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500'}`}
              >
                Todos ({inactiveList.length})
              </button>
              <button
                onClick={() => setStatusFilter('pendientes')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${statusFilter === 'pendientes' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500'}`}
              >
                Pendientes ({stats.pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('sin_visitas')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${statusFilter === 'sin_visitas' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}
              >
                0 Visitas ({stats.zeroViewsCount})
              </button>
              <button
                onClick={() => setStatusFilter('sin_fotos')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${statusFilter === 'sin_fotos' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500'}`}
              >
                📸 Sin fotos ({stats.needsPhotosCount})
              </button>
              <button
                onClick={() => setStatusFilter('notificados')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${statusFilter === 'notificados' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
              >
                Notificados ({stats.notifiedRecentlyCount})
              </button>
            </div>

            {/* Threshold dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500">Criterio:</span>
              <select
                value={daysThreshold}
                onChange={(e) => setDaysThreshold(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value={15}>&gt; 15 días inactivo</option>
                <option value={30}>&gt; 30 días inactivo (Estándar)</option>
                <option value={45}>&gt; 45 días inactivo</option>
                <option value={60}>&gt; 60 días inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inactive Professionals Table / Cards */}
        {filteredList.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              ¡No hay profesionales inactivos con los filtros aplicados!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Todos los profesionales registrados tienen visitas recientes o ya han sido notificados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="pb-3 font-semibold">Profesional</th>
                  <th className="pb-3 font-semibold">Oficio y Zona</th>
                  <th className="pb-3 font-semibold text-center">Visitas</th>
                  <th className="pb-3 font-semibold text-center">Inactividad</th>
                  <th className="pb-3 font-semibold">Motivo Detectado</th>
                  <th className="pb-3 font-semibold text-center">Estado Push</th>
                  <th className="pb-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredList.map((item) => {
                  const pro = item.user;
                  const rubro = pro.profesionalInfo?.rubro || 'General';
                  const zona = pro.zona || 'Bahía Blanca';

                  return (
                    <tr key={pro.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                      {/* Professional Info */}
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.nombre)}&background=f59e0b&color=fff`}
                            alt={pro.nombre}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {pro.nombre}
                            </span>
                            <span className="text-xs text-slate-400 block truncate max-w-[180px]">
                              {pro.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rubro & Zona */}
                      <td className="py-3.5 pr-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                          {rubro}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-indigo-500" />
                          {zona}
                        </span>
                      </td>

                      {/* Views & Work Photos */}
                      <td className="py-3.5 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${item.views === 0 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {item.views} vistas
                          </span>
                          {item.needsPhotosIncentive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                              <Camera size={10} />
                              {item.photosCount}/2 fotos
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.photosCount} fotos
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Days Inactive */}
                      <td className="py-3.5 px-2 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${item.daysInactive >= 60 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                          <Clock size={12} />
                          {item.daysInactive} días
                        </span>
                      </td>

                      {/* Detected Reason */}
                      <td className="py-3.5 pr-3">
                        <div className="space-y-0.5 max-w-[220px]">
                          {item.reasons.slice(0, 2).map((r, i) => (
                            <span key={i} className="text-xs text-slate-600 dark:text-slate-300 block">
                              • {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Push Status */}
                      <td className="py-3.5 px-2 text-center">
                        {item.status === 'notificado_reciente' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={11} />
                            Notificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            <Clock size={11} />
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.needsPhotosIncentive && (
                            <button
                              onClick={() => handleSendPhotoIncentiveSingle(item)}
                              title="Enviar incentivo directo: añadir 2 fotos duplica la tasa de contacto"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-950/80 dark:hover:bg-purple-900 dark:text-purple-300 transition-colors"
                            >
                              <Camera size={13} />
                              Incentivar
                            </button>
                          )}
                          <button
                            onClick={() => openReactivationModal(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 transition-colors"
                          >
                            <Send size={13} />
                            Push
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Notification Push Modal */}
      {selectedPro && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <Bell size={20} />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Enviar Notificación de Reactivación
                  </h4>
                  <p className="text-xs text-slate-500">
                    A: {selectedPro.user.nombre} ({selectedPro.user.profesionalInfo?.rubro || 'Profesional'} - {selectedPro.user.zona || 'Bahía Blanca'})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPro(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Inactivity Summary */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Tiempo sin visitas/actividad:</span>
                <strong className="text-rose-600 dark:text-rose-400">{selectedPro.daysInactive} días</strong>
              </div>
              <div className="flex justify-between">
                <span>Visitas totales acumuladas:</span>
                <strong>{selectedPro.views} visitas</strong>
              </div>
            </div>

            {/* Quick Templates */}
            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                Plantillas rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTemplate('oportunidad')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  💼 Oportunidades en su zona
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('disponibilidad')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  ⚡ Confirmar disponibilidad
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('fotos')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  📸 Subir fotos de trabajos
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título de la notificación push:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mensaje:
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPro(null)}
                className="px-4 py-2 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendSingle}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Send size={15} />
                {isSending ? 'Enviando...' : 'Enviar Notificación Push'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Send Confirmation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-600">
                <AlertTriangle size={24} />
              </span>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Campaña Masiva de Reactivación
                </h4>
                <p className="text-xs text-slate-500">
                  Se enviará una notificación push a {stats.pendingCount} profesionales inactivos.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cada profesional recibirá un aviso en su navegador y una notificación en su panel recordando que hay vecinos en Bahía Blanca buscando presupuestos de su oficio.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkSend}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-all shadow-md shadow-orange-600/20"
              >
                <Send size={15} />
                Confirmar y Enviar ({stats.pendingCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
