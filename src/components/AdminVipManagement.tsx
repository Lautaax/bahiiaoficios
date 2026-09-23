import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Crown, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw, 
  MessageCircle, 
  FileText, 
  ChevronRight, 
  Calendar, 
  CreditCard, 
  UserCheck, 
  ArrowUpDown,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import { getVipStatus, getVipDiffInfo, checkAndExpireUserVip, isVipActive } from '../utils/vipUtils';
import { ProfessionalPaymentHistoryModal } from './ProfessionalPaymentHistoryModal';
import { CachedImage } from './CachedImage';

interface AdminVipManagementProps {
  users: User[];
  onRefreshUsers: () => Promise<void> | void;
}

export const AdminVipManagement: React.FC<AdminVipManagementProps> = ({
  users,
  onRefreshUsers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired'>('all');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Filter only professionals
  const professionals = useMemo(() => {
    return users.filter(u => u.rol === 'profesional');
  }, [users]);

  // Compute VIP categories
  const metrics = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let inconsistentExpired = 0; // users who have isVip: true in DB but date expired (like Sebastián)

    professionals.forEach(u => {
      const status = getVipStatus(u.profesionalInfo);
      if (status === 'active') active++;
      else if (status === 'expiring_soon') expiringSoon++;
      else if (status === 'expired') {
        expired++;
        if (u.profesionalInfo?.isVip) {
          inconsistentExpired++;
        }
      }
    });

    const totalVipHistory = active + expiringSoon + expired;
    return {
      active,
      expiringSoon,
      expired,
      inconsistentExpired,
      totalVipHistory,
      totalPros: professionals.length
    };
  }, [professionals]);

  // Unique trades for filter
  const trades = useMemo(() => {
    const set = new Set<string>();
    professionals.forEach(p => {
      if (p.profesionalInfo?.rubro) set.add(p.profesionalInfo.rubro);
    });
    return Array.from(set).sort();
  }, [professionals]);

  // Filtered list
  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => {
      const pInfo = p.profesionalInfo;
      const status = getVipStatus(pInfo);

      // Status filter
      if (statusFilter === 'active' && status !== 'active') return false;
      if (statusFilter === 'expiring_soon' && status !== 'expiring_soon') return false;
      if (statusFilter === 'expired' && status !== 'expired') return false;
      if (statusFilter === 'all') {
        // In "all", show anyone who has ever had VIP or has VIP flag
        if (status === 'none') return false;
      }

      // Trade filter
      if (selectedTrade !== 'all' && pInfo?.rubro !== selectedTrade) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (p.nombre || '').toLowerCase().includes(q);
        const matchesEmail = (p.email || '').toLowerCase().includes(q);
        const matchesPhone = (p.telefono || pInfo?.telefono || '').includes(q);
        const matchesBiz = (pInfo?.nombreNegocio || '').toLowerCase().includes(q);
        const matchesRubro = (pInfo?.rubro || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesBiz && !matchesRubro) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort priority: Expiring soon first, then Active, then Expired (most recently expired first)
      const statusOrder = { expiring_soon: 0, active: 1, expired: 2, none: 3 };
      const statusA = getVipStatus(a.profesionalInfo);
      const statusB = getVipStatus(b.profesionalInfo);

      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }

      // Inside same status, compare dates
      const expA = getVipDiffInfo(a.profesionalInfo).expirationDate?.getTime() || 0;
      const expB = getVipDiffInfo(b.profesionalInfo).expirationDate?.getTime() || 0;
      return expB - expA;
    });
  }, [professionals, statusFilter, selectedTrade, searchTerm]);

  // Batch sync/clean expired VIPs
  const handleSyncAllExpired = async () => {
    setSyncing(true);
    setSyncResult(null);
    let expiredCount = 0;

    try {
      for (const pro of professionals) {
        if (pro.profesionalInfo?.isVip) {
          const expired = await checkAndExpireUserVip(pro.uid, pro.profesionalInfo);
          if (expired) expiredCount++;
        }
      }

      await onRefreshUsers();
      setSyncResult(`Auditoría completada: Se actualizaron ${expiredCount} usuario(s) que tenían membresía vencida a estado regular.`);
    } catch (err: any) {
      console.error("Error during VIP sync:", err);
      setSyncResult("Ocurrió un error al sincronizar las suscripciones.");
    } finally {
      setSyncing(false);
    }
  };

  // Quitar VIP de forma manual
  const handleRemoveVip = async (pro: User) => {
    if (!window.confirm(`¿Estás seguro de que deseas quitar el VIP a ${pro.nombre} de forma manual?`)) return;
    try {
      const userRef = doc(db, 'usuarios', pro.uid);
      await updateDoc(userRef, {
        'profesionalInfo.isVip': false,
        'profesionalInfo.vipExpiredAt': new Date(),
        'profesionalInfo.vipExpiration': null
      });
      alert(`Se ha quitado la membresía VIP a ${pro.nombre} correctamente.`);
      await onRefreshUsers();
    } catch (err) {
      console.error("Error al quitar VIP:", err);
      alert("Error al quitar el estado VIP.");
    }
  };

  return (
    <div className="space-y-6">

      {/* Banner / Header */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Crown size={24} />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Gestión Comercial de Suscripciones VIP</h2>
          </div>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Control de vigencia en tiempo real, auditoría de vencimientos, historial de cobros y herramientas para renovación de clientes.
          </p>
        </div>

        <button
          onClick={handleSyncAllExpired}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 rounded-xl text-sm font-bold text-white transition-all shadow-sm backdrop-blur-sm self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin text-amber-300" : "text-amber-300"} />
          {syncing ? "Auditando Base de Datos..." : "Auditar y Sincronizar Vencidos"}
        </button>
      </div>

      {/* Sync Result Alert */}
      {syncResult && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncResult}</span>
          </div>
          <button 
            onClick={() => setSyncResult(null)} 
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs font-semibold uppercase"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Inconsistent Warning Alert if any user has isVip=true but date is in the past */}
      {metrics.inconsistentExpired > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">
                {metrics.inconsistentExpired} profesional(es) con fecha VIP vencida figuran aún como activos en Firestore
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                (Por ejemplo, usuarios que pagaron 1 solo mes hace tiempo). Haz clic en "Auditar y Sincronizar" para corregirlos automáticamente a No-VIP.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncAllExpired}
            disabled={syncing}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm"
          >
            Corregir Ahora
          </button>
        </div>
      )}

      {/* Resumen Visual (Metrics Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Activos */}
        <div 
          onClick={() => setStatusFilter('active')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'active'
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              VIPs Activos
            </span>
            <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 rounded-xl">
              <CheckCircle size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{metrics.active}</span>
            <span className="text-xs text-gray-500">
              de {metrics.totalPros} profesionales
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            Al día y con beneficios activos
          </p>
        </div>

        {/* Próximos a Vencer */}
        <div 
          onClick={() => setStatusFilter('expiring_soon')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'expiring_soon'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Por Vencer (≤ 7 días)
            </span>
            <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 rounded-xl">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{metrics.expiringSoon}</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              Prioridad comercial
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Oportunidad de renovación preventiva
          </p>
        </div>

        {/* Vencidos */}
        <div 
          onClick={() => setStatusFilter('expired')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'expired'
              ? 'bg-red-500/10 border-red-500 shadow-md ring-2 ring-red-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Membresías Vencidas
            </span>
            <span className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-xl">
              <XCircle size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{metrics.expired}</span>
            <span className="text-xs text-red-500 font-semibold">
              Ex-VIPs
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Campaña de re-captación comercial
          </p>
        </div>

        {/* Total Historial VIP */}
        <div 
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'all'
              ? 'bg-indigo-500/10 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Historial Total VIP
            </span>
            <span className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-xl">
              <Crown size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{metrics.totalVipHistory}</span>
            <span className="text-xs text-gray-500">
              profesionales registrados
            </span>
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
            Ver listado completo
          </p>
        </div>

      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono, negocio o rubro..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Filter by trade */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedTrade}
            onChange={e => setSelectedTrade(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-gray-200"
          >
            <option value="all">Todos los Rubros</option>
            {trades.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Quick pills */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Todos ({metrics.totalVipHistory})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-900'
              }`}
            >
              Activos ({metrics.active})
            </button>
            <button
              onClick={() => setStatusFilter('expiring_soon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'expiring_soon'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
              }`}
            >
              Por Vencer ({metrics.expiringSoon})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'expired'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-700 dark:text-red-400 hover:text-red-900'
              }`}
            >
              Vencidos ({metrics.expired})
            </button>
          </div>
        </div>

      </div>

      {/* Table of Professionals with VIP information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-indigo-600" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Listado de Profesionales con Historial VIP
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            Mostrando {filteredProfessionals.length} resultados
          </span>
        </div>

        {filteredProfessionals.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Info size={32} className="mx-auto text-gray-400" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              No se encontraron profesionales para los filtros seleccionados
            </p>
            <p className="text-xs text-gray-400">
              Prueba cambiando el estado o buscando con otros términos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4">Profesional</th>
                  <th className="p-4">Rubro / Zona</th>
                  <th className="p-4">Estado VIP</th>
                  <th className="p-4">Vencimiento</th>
                  <th className="p-4">Diagnóstico de Vigencia</th>
                  <th className="p-4 text-right">Acciones Comerciales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredProfessionals.map(pro => {
                  const pInfo = pro.profesionalInfo;
                  const status = getVipStatus(pInfo);
                  const diffInfo = getVipDiffInfo(pInfo);
                  const expDate = diffInfo.expirationDate;

                  // WhatsApp quick link
                  const cleanPhone = (pro.telefono || pInfo?.telefono || '').replace(/\D/g, '');
                  const formattedPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
                  let waMsg = `Hola ${pro.nombre}, te contactamos de TodoServicios. `;
                  if (status === 'expired') {
                    waMsg += `Vemos que tu suscripción VIP finalizó el ${expDate?.toLocaleDateString() || 'meses atrás'}. Tenemos planes con descuento para renovar tu posición destacada en la app. ¿Te gustaría conocerlos?`;
                  } else if (status === 'expiring_soon') {
                    waMsg += `Te recordamos que tu membresía VIP finaliza el ${expDate?.toLocaleDateString()}. Puedes renovarla hoy para no perder tu posición preferencial.`;
                  } else {
                    waMsg += `Nos comunicamos para acompañarte en tu gestión comercial en la plataforma.`;
                  }
                  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waMsg)}`;

                  return (
                    <tr key={pro.uid} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      {/* Profesional Info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <CachedImage
                            src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.nombre)}`}
                            alt={pro.nombre}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            containerClassName="w-10 h-10 rounded-full shrink-0"
                            loading="lazy"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                              {pro.nombre}
                              {pInfo?.nombreNegocio && (
                                <span className="text-[11px] font-normal text-gray-500">
                                  ({pInfo.nombreNegocio})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{pro.email}</span>
                              {cleanPhone && (
                                <>
                                  <span>•</span>
                                  <span>{pro.telefono || pInfo?.telefono}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rubro */}
                      <td className="p-4">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {pInfo?.rubro || 'Profesional'}
                        </span>
                        {pro.zona && (
                          <span className="block text-xs text-gray-400">
                            {pro.zona}
                          </span>
                        )}
                      </td>

                      {/* Estado VIP */}
                      <td className="p-4">
                        {status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle size={13} /> Activo
                          </span>
                        )}
                        {status === 'expiring_soon' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <AlertTriangle size={13} /> Por Vencer
                          </span>
                        )}
                        {status === 'expired' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                              <XCircle size={13} /> Vencido
                            </span>
                            {pInfo?.isVip && (
                              <span className="block text-[10px] text-red-600 font-semibold">
                                Inconsistencia detectada
                              </span>
                            )}
                          </div>
                        )}
                        {status === 'none' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Sin VIP
                          </span>
                        )}
                      </td>

                      {/* Fecha Vencimiento */}
                      <td className="p-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {expDate ? (
                          <>
                            <div className="font-semibold">
                              {expDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {expDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No registrada</span>
                        )}
                      </td>

                      {/* Diagnóstico Vigencia (Comparativa con Hoy) */}
                      <td className="p-4">
                        <div className={`text-xs font-bold ${
                          diffInfo.isPast 
                            ? 'text-red-600 dark:text-red-400' 
                            : status === 'expiring_soon'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {diffInfo.label}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {diffInfo.isPast ? 'Requiere renovación' : 'Posición prioritaria activa'}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cleanPhone && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Enviar WhatsApp de renovación"
                              className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                          {(status === 'active' || status === 'expiring_soon' || pInfo?.isVip) && (
                            <button
                              onClick={() => handleRemoveVip(pro)}
                              title="Quitar VIP de forma manual"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 rounded-xl text-xs font-bold transition-colors"
                            >
                              <XCircle size={14} />
                              Quitar VIP
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUserForHistory(pro)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-bold transition-colors"
                          >
                            <CreditCard size={14} />
                            Historial y Pagos
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

      {/* Modal Historial de Pagos y Detalle de Vigencia */}
      {selectedUserForHistory && (
        <ProfessionalPaymentHistoryModal
          user={selectedUserForHistory}
          onClose={() => setSelectedUserForHistory(null)}
          onUserUpdated={async (updated) => {
            setSelectedUserForHistory(updated);
            await onRefreshUsers();
          }}
        />
      )}

    </div>
  );
};
