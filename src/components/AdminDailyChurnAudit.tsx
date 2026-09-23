import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw, 
  Phone, 
  MessageCircle, 
  Copy, 
  Check, 
  Bell, 
  UserX, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Crown, 
  Flame, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Briefcase,
  MapPin,
  Send,
  Zap,
  HelpCircle
} from 'lucide-react';
import { ChurnAuditReport, ChurnRiskAlert, ChurnRiskLevel, User } from '../types';
import { CachedImage } from './CachedImage';
import { 
  getDailyChurnAudit, 
  buildWhatsAppReactivationUrl, 
  sendReactivationPushNotification 
} from '../services/aiChurnAuditService';

interface AdminDailyChurnAuditProps {
  users?: User[];
  onRefreshData?: () => void;
  onNavigateToUser?: (userId: string) => void;
}

export const AdminDailyChurnAudit: React.FC<AdminDailyChurnAuditProps> = ({
  users = [],
  onRefreshData,
  onNavigateToUser
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<ChurnAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  
  // Filters
  const [selectedRisk, setSelectedRisk] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive actions feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingNotifId, setSendingNotifId] = useState<string | null>(null);
  const [notifSuccessId, setNotifSuccessId] = useState<string | null>(null);

  // Load audit on mount
  const loadAudit = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getDailyChurnAudit(force, users);
      setReport(data.audit);
      setFromCache(data.fromCache);
    } catch (err: any) {
      console.error('Error loading daily churn audit:', err);
      setError(err.message || 'No se pudo generar la auditoría de Gemini.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAudit(false);
  }, []);

  const handleCopyMessage = (alert: ChurnRiskAlert) => {
    navigator.clipboard.writeText(alert.mensajeSugeridoWhatsApp);
    setCopiedId(alert.profesionalId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendPush = async (alert: ChurnRiskAlert) => {
    setSendingNotifId(alert.profesionalId);
    const success = await sendReactivationPushNotification(alert);
    setSendingNotifId(null);
    if (success) {
      setNotifSuccessId(alert.profesionalId);
      setTimeout(() => setNotifSuccessId(null), 3000);
    }
  };

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (!report?.alertasRiesgoAbandono) return [];
    return report.alertasRiesgoAbandono.filter(alert => {
      const matchesRisk = selectedRisk === 'todos' || alert.nivelRiesgo === selectedRisk;
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        alert.nombre.toLowerCase().includes(term) ||
        alert.rubro.toLowerCase().includes(term) ||
        alert.zona.toLowerCase().includes(term);
      return matchesRisk && matchesSearch;
    });
  }, [report, selectedRisk, searchTerm]);

  // Risk counts
  const riskCounts = useMemo(() => {
    if (!report?.alertasRiesgoAbandono) return { critico: 0, alto: 0, medio: 0, preventivo: 0, total: 0 };
    const critico = report.alertasRiesgoAbandono.filter(a => a.nivelRiesgo === 'critico').length;
    const alto = report.alertasRiesgoAbandono.filter(a => a.nivelRiesgo === 'alto').length;
    const medio = report.alertasRiesgoAbandono.filter(a => a.nivelRiesgo === 'medio').length;
    const preventivo = report.alertasRiesgoAbandono.filter(a => a.nivelRiesgo === 'preventivo').length;
    return { critico, alto, medio, preventivo, total: report.alertasRiesgoAbandono.length };
  }, [report]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-800 p-12 border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Analizando datos de Firestore con Gemini...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Evaluando historial de actividad, visualizaciones de perfil, clics de WhatsApp y solicitudes de clientes en Bahía Blanca para predecir riesgo de abandono.
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-800 p-8 border border-rose-200 dark:border-rose-900/60 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No se pudo generar la auditoría de retención
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
            {error || 'Ocurrió un error inesperado al consultar el modelo de IA.'}
          </p>
        </div>
        <button
          onClick={() => loadAudit(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          <span>Reintentar con Gemini</span>
        </button>
      </div>
    );
  }

  const score = report.saludGeneral.scoreRetencion || 80;
  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 65 ? 'text-amber-500' : 'text-rose-600';
  const scoreBg = score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' : score >= 65 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white border border-indigo-900/60 shadow-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 -bottom-10 w-48 h-48 rounded-full bg-purple-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
              <Sparkles size={14} className="text-indigo-400 animate-spin-slow" />
              <span>Auditoría Diaria con Gemini 3.8 Flash</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-400/30 font-extrabold uppercase">
                Bahía Blanca
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Resumen Diario y Riesgo de Abandono
            </h2>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Análisis predictivo diario impulsado por IA sobre los datos de Firestore. Detecta automáticamente profesionales inactivos o sin visitas para reactivarlos antes de que abandonen la plataforma.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-400" />
                Auditoría: <strong className="text-slate-200 font-semibold">{report.fecha}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" />
                {fromCache ? 'Informe generado automáticamente hoy' : 'Ejecución en tiempo real con Gemini'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => loadAudit(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Re-analizando con Gemini...' : 'Regenerar Auditoría Ahora'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Retention Score */}
        <div className={`p-5 rounded-3xl border shadow-xs transition-all ${scoreBg}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Score de Retención
            </span>
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-2xs">
              <ShieldAlert size={18} className={scoreColor} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${scoreColor}`}>
              {score}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              índice de salud de red
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${score >= 80 ? 'bg-emerald-500' : score >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            {report.saludGeneral.activos} de {report.saludGeneral.totalProfesionales} profesionales con interacción saludable
          </p>
        </div>

        {/* Critical Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-rose-200 dark:border-rose-900/60 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Riesgo Crítico
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {riskCounts.critico}
            </span>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400 font-bold">
              deserción inminente
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Inactivos &gt;35 días o 0 visitas continuas. Requieren reactivación directa hoy.
          </p>
        </div>

        {/* High / Medium Risk */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Riesgo Alto & Medio
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {riskCounts.alto + riskCounts.medio}
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ({riskCounts.alto} altos, {riskCounts.medio} medios)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Pérdida paulatina de tracción o perfiles sin fotos de trabajos en Bahía.
          </p>
        </div>

        {/* Opportunities */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Oportunidades
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {report.oportunidadesReenganche?.length || 0}
            </span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              rubros con demanda abierta
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Trabajos solicitados por vecinos que coinciden con especialistas inactivos.
          </p>
        </div>
      </div>

      {/* Executive Summary Callout by Gemini */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                Diagnóstico Ejecutivo de Gemini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Síntesis del estado de retención y dinamismo laboral en Bahía Blanca
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {report.modeloUtilizado || 'Gemini 3.8 Flash'}
          </span>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {report.resumenEjecutivo}
        </p>

        {report.tendenciaSemanal && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <TrendingUp size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                Tendencia Semanal de la Oferta en Bahía Blanca:
              </strong>
              {report.tendenciaSemanal}
            </div>
          </div>
        )}
      </div>

      {/* Main Section: Alerts of Professionals at Risk */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={22} />
              <span>Profesionales en Riesgo de Abandono ({riskCounts.total})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identificados por falta de interacción, ausencia de visitas o solicitudes desatendidas en Bahía Blanca.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar profesional, rubro o zona..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-4">
          <button
            onClick={() => setSelectedRisk('todos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRisk === 'todos'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Todos ({riskCounts.total})
          </button>
          
          <button
            onClick={() => setSelectedRisk('critico')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedRisk === 'critico'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Crítico ({riskCounts.critico})
          </button>

          <button
            onClick={() => setSelectedRisk('alto')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRisk === 'alto'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 hover:bg-orange-100'
            }`}
          >
            Alto ({riskCounts.alto})
          </button>

          <button
            onClick={() => setSelectedRisk('medio')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRisk === 'medio'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
          >
            Medio ({riskCounts.medio})
          </button>

          <button
            onClick={() => setSelectedRisk('preventivo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRisk === 'preventivo'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'
            }`}
          >
            Preventivo ({riskCounts.preventivo})
          </button>
        </div>

        {/* At-Risk Cards List */}
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No se encontraron profesionales bajo el filtro seleccionado
            </p>
            <p className="text-xs">
              La red de profesionales se encuentra estable o los filtros aplicados no arrojaron coincidencias.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.map((alert) => {
              const waUrl = buildWhatsAppReactivationUrl(alert);
              const isCritico = alert.nivelRiesgo === 'critico';
              const isAlto = alert.nivelRiesgo === 'alto';
              const isMedio = alert.nivelRiesgo === 'medio';

              const riskBadgeClasses = isCritico
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : isAlto
                ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                : isMedio
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';

              const cardBorder = isCritico
                ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                : isAlto
                ? 'border-orange-200 dark:border-orange-900/60 hover:border-orange-300'
                : 'border-slate-200/80 dark:border-slate-700 hover:border-indigo-300';

              return (
                <div
                  key={alert.profesionalId}
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-800 border ${cardBorder} shadow-2xs hover:shadow-xs transition-all space-y-4`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        {alert.fotoUrl ? (
                          <CachedImage
                            src={alert.fotoUrl}
                            alt={alert.nombre}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            containerClassName="w-12 h-12 rounded-2xl shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                            {alert.nombre.charAt(0)}
                          </div>
                        )}
                        {alert.isVip && (
                          <Crown size={14} className="absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                            {alert.nombre}
                          </h4>
                          {alert.isVip && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                              VIP
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {alert.rubro}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {alert.zona}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Badge and Stats */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${riskBadgeClasses}`}>
                        {isCritico && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                        Riesgo {alert.nivelRiesgo.toUpperCase()} ({alert.probabilidadAbandono}% churn)
                      </span>

                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        <Clock size={12} className="text-slate-400" />
                        {alert.diasInactivo} días inactivo
                      </span>
                    </div>
                  </div>

                  {/* Diagnosis and Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Sparkles size={14} className="text-indigo-500" />
                        <span>Diagnóstico de Gemini:</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {alert.diagnosticoIA}
                      </p>

                      {/* Motives Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {alert.motivos.map((motivo, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {motivo}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats Box */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Métricas en la Plataforma
                      </span>
                      
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Vistas de perfil:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{alert.vistas}</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Contactos WhatsApp:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{alert.contactos}</strong>
                        </div>
                        {alert.trabajosPendientesEnRubro !== undefined && alert.trabajosPendientesEnRubro > 0 && (
                          <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                            <span>Demandas en su rubro:</span>
                            <span>{alert.trabajosPendientesEnRubro} pedidos</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        💡 {alert.accionRecomendada}
                      </div>
                    </div>
                  </div>

                  {/* Pre-drafted WhatsApp Copy Box */}
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <MessageCircle size={13} className="text-indigo-600" />
                        Mensaje sugerido por Gemini para reactivarlo:
                      </span>

                      <button
                        onClick={() => handleCopyMessage(alert)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 transition-colors"
                      >
                        {copiedId === alert.profesionalId ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copiar texto</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic font-mono bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      "{alert.mensajeSugeridoWhatsApp}"
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          <Phone size={14} />
                          <span>Enviar WhatsApp de Reactivación</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs">
                          Sin teléfono registrado
                        </span>
                      )}

                      <button
                        onClick={() => handleSendPush(alert)}
                        disabled={sendingNotifId === alert.profesionalId}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                      >
                        {sendingNotifId === alert.profesionalId ? (
                          <RefreshCw size={14} className="animate-spin text-indigo-600" />
                        ) : notifSuccessId === alert.profesionalId ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Bell size={14} className="text-indigo-600" />
                        )}
                        <span>
                          {notifSuccessId === alert.profesionalId ? '¡Notificación enviada!' : 'Enviar Notificación Push'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {alert.telefono && (
                        <a
                          href={`tel:${alert.telefono}`}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                          title="Llamar por teléfono"
                        >
                          <Phone size={14} />
                        </a>
                      )}

                      {onNavigateToUser && (
                        <button
                          onClick={() => onNavigateToUser(alert.profesionalId)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
                        >
                          <span>Ver Ficha</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-engagement Opportunities by Rubro */}
      {report.oportunidadesReenganche && report.oportunidadesReenganche.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="text-amber-500" size={20} />
                <span>Oportunidades de Reenganche con Demanda Real en Bahía Blanca</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rubros donde clientes bahienses solicitaron presupuestos pero los profesionales locales están inactivos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {report.oportunidadesReenganche.map((op, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {op.rubro}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    {op.solicitudesSinCubrir} pedidos abiertos
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {op.profesionalesInactivos} profesionales disponibles
                  </span>{' '}
                  en {op.zona || 'Bahía Blanca'} para reactivar.
                </div>

                <p className="text-xs text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  💡 {op.estrategia}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Priority Actions Checklist */}
      {report.accionesPrioritariasAdmin && report.accionesPrioritariasAdmin.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="text-indigo-600" size={20} />
                <span>Acciones Prioritarias de Retención Recomendadas para Hoy</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Plan de intervención generado por Gemini para maximizar la retención de trabajadores.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {report.accionesPrioritariasAdmin.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      act.prioridad === 'alta'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : act.prioridad === 'media'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      Prioridad {act.prioridad}
                    </span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      {act.titulo}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {act.accion}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 inline-block">
                    Impacto: {act.impacto}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
