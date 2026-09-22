import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Megaphone, 
  Send, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  Search, 
  Eye, 
  MessageSquare, 
  Briefcase, 
  Layers, 
  Lightbulb, 
  ArrowRight,
  Flame,
  Target,
  Filter,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { AiPromotionInsightsReport, CategoryPromotionInsight, User } from '../types';
import { getCategoryPromotionInsights, broadcastCategoryPromotionPush } from '../services/aiPromotionService';

interface AdminAiPromotionInsightsProps {
  users?: User[];
  onNavigateTab?: (tab: string) => void;
}

export const AdminAiPromotionInsights: React.FC<AdminAiPromotionInsightsProps> = ({
  users = [],
  onNavigateTab
}) => {
  const [report, setReport] = useState<AiPromotionInsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [filterType, setFilterType] = useState<string>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pushSentMap, setPushSentMap] = useState<Record<string, boolean>>({});
  const [sendingPush, setSendingPush] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getCategoryPromotionInsights(force, users);
      setReport(res.report);
      setIsFromCache(res.fromCache);
    } catch (err) {
      console.error('Error loading promotion insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setFeedbackMessage('Texto copiado al portapapeles');
    setTimeout(() => {
      setCopiedId(null);
      setFeedbackMessage(null);
    }, 2500);
  };

  const handleSendPush = async (insight: CategoryPromotionInsight) => {
    const key = insight.rubro;
    setSendingPush(key);
    try {
      const success = await broadcastCategoryPromotionPush(
        insight,
        insight.tipoPromocion === 'captar_profesionales' ? 'profesionales' : 'clientes'
      );
      if (success) {
        setPushSentMap(prev => ({ ...prev, [key]: true }));
        setFeedbackMessage(`Notificación enviada a la comunidad de Bahía Blanca para ${insight.rubro}`);
        setTimeout(() => setFeedbackMessage(null), 3500);
      }
    } catch (e) {
      console.error('Error broadcasting push:', e);
    } finally {
      setSendingPush(null);
    }
  };

  const filteredCategories = report?.categoriasParaPromocionar.filter(cat => {
    if (filterType === 'todos') return true;
    if (filterType === 'alta') return cat.prioridad === 'ALTA';
    if (filterType === 'captar_profesionales') return cat.tipoPromocion === 'captar_profesionales';
    if (filterType === 'promover_demanda_clientes') return cat.tipoPromocion === 'promover_demanda_clientes';
    if (filterType === 'reactivar_categoria') return cat.tipoPromocion === 'reactivar_categoria';
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl mb-4 text-indigo-600 dark:text-indigo-400 animate-pulse">
          <Sparkles size={36} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Procesando logs de actividad de los últimos 7 días
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
          Gemini está analizando búsquedas reales de vecinos, visitas a perfiles, contactos de WhatsApp e índices de demanda insatisfecha en Bahía Blanca...
        </p>
        <div className="w-48 h-2 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full animate-pulse w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
          No se pudieron generar los insights en este momento.
        </p>
        <button
          onClick={() => loadData(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Reintentar Análisis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium rounded-xl shadow-xl border border-gray-700 dark:border-gray-200 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
                <Sparkles size={14} className="text-amber-300" />
                Motor Inteligente Gemini & Logs de 7 Días
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-indigo-100">
                {report.periodoAnalizado}
              </span>
              {isFromCache && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-medium">
                  Caché Diario Activo
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Insights de IA: Promoción de Categorías
            </h2>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Analítica predictiva de los últimos 7 días. Detecta qué oficios tienen vecinos buscando sin encontrar profesionales suficientes, y qué rubros necesitan promoción para generar trabajo a los prestadores registrados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-950 font-bold hover:bg-indigo-50 active:scale-95 transition-all shadow-lg text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Analizando...' : 'Re-analizar con IA'}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Mayor Demanda (7 días)</span>
            <Flame size={16} className="text-orange-500" />
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {report.kpisGenerales.categoriaMayorDemanda}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Rubro con más interacciones acumuladas
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-rose-100 dark:border-rose-950/40 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Mayor Déficit de Oferta</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {report.kpisGenerales.categoriaMayorDeficit}
          </div>
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">
            Muchas búsquedas, pocos profesionales
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-950/40 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Urgente Promocionar</span>
            <Target size={16} className="text-indigo-500" />
          </div>
          <div className="text-xl font-black text-gray-900 dark:text-white">
            {report.kpisGenerales.categoriaUrgentePromocionar}
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
            Prioridad #1 de campaña semanal
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Equilibrio de Mercado</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {report.kpisGenerales.indiceEquilibrioMercado}%
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {report.kpisGenerales.oportunidadesDetectadas} oportunidades
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full" 
              style={{ width: `${Math.min(report.kpisGenerales.indiceEquilibrioMercado, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo de los 7 Días */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={18} className="text-amber-500" />
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            Diagnóstico Semanal de Actividad (Últimos 7 días en Bahía Blanca)
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {report.resumenSemanal}
        </p>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <span>Modelo activo: <strong>{report.modeloUtilizado}</strong></span>
          <span>Fecha de análisis: <strong>{report.fechaGeneracion}</strong></span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter size={14} />
            Filtrar:
          </span>
          <button
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'todos'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Todas ({report.categoriasParaPromocionar.length})
          </button>
          <button
            onClick={() => setFilterType('alta')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'alta'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Alta Prioridad
          </button>
          <button
            onClick={() => setFilterType('captar_profesionales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'captar_profesionales'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Captar Profesionales (Escasez)
          </button>
          <button
            onClick={() => setFilterType('promover_demanda_clientes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'promover_demanda_clientes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Promover a Clientes (Generar Trabajo)
          </button>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Mostrando <strong>{filteredCategories.length}</strong> de {report.categoriasParaPromocionar.length} categorías
        </span>
      </div>

      {/* Category Promotion Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredCategories.map((cat, idx) => {
          const isHigh = cat.prioridad === 'ALTA';
          const isRecruit = cat.tipoPromocion === 'captar_profesionales';
          const isDemand = cat.tipoPromocion === 'promover_demanda_clientes';
          const isCopied = copiedId === `post-${cat.rubro}`;
          const isPushSent = pushSentMap[cat.rubro];
          const isSendingPush = sendingPush === cat.rubro;

          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                isHigh
                  ? 'border-rose-200 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                  : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
              }`}
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">
                        {cat.rubro}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide ${
                          cat.prioridad === 'ALTA'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : cat.prioridad === 'OPORTUNIDAD'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {cat.prioridad === 'ALTA' ? 'PRIORIDAD ALTA' : cat.prioridad === 'OPORTUNIDAD' ? 'OPORTUNIDAD' : 'PRIORIDAD MEDIA'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isRecruit 
                          ? 'text-amber-600 dark:text-amber-400' 
                          : isDemand 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {isRecruit ? '📢 Convocatoria / Captación de Prestadores' : isDemand ? '🎯 Promover hacia Vecinos y Hogares' : '⚡ Reactivación Comercial'}
                    </span>
                  </div>

                  {/* Demand score badge */}
                  <div className="text-right">
                    <div className="text-xs text-gray-400 font-semibold uppercase">Índice</div>
                    <div className="text-lg font-black text-gray-900 dark:text-white">
                      {cat.metricas7Dias.scoreDemanda}<span className="text-xs text-gray-400 font-normal">/100</span>
                    </div>
                  </div>
                </div>

                {/* 7-Day Metrics Bar */}
                <div className="grid grid-cols-5 gap-1 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-center gap-0.5">
                      <Users size={11} /> Pros
                    </div>
                    <div className={`text-sm font-extrabold ${cat.metricas7Dias.profesionalesActivos <= 1 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {cat.metricas7Dias.profesionalesActivos}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-center gap-0.5">
                      <Search size={11} /> Búsquedas
                    </div>
                    <div className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                      {cat.metricas7Dias.busquedas}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-center gap-0.5">
                      <Briefcase size={11} /> Pedidos
                    </div>
                    <div className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                      {cat.metricas7Dias.solicitudesTrabajo}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-center gap-0.5">
                      <Eye size={11} /> Vistas
                    </div>
                    <div className="text-sm font-extrabold text-gray-800 dark:text-gray-100">
                      {cat.metricas7Dias.vistasPerfiles}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-center gap-0.5">
                      <MessageSquare size={11} /> WP Clics
                    </div>
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {cat.metricas7Dias.contactosWhatsapp}
                    </div>
                  </div>
                </div>

                {/* AI Justification based on 7-day logs */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  <strong className="text-indigo-900 dark:text-indigo-300 block mb-1">
                    Diagnóstico IA (Logs de los últimos 7 días):
                  </strong>
                  {cat.justificacionBasadaEnLogs}
                </div>

                {/* Strategic Advice */}
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Target size={14} className="text-indigo-600" />
                    Estrategia recomendada:
                  </div>
                  <p className="leading-relaxed pl-5">
                    {cat.sugerenciaEstrategica}
                  </p>
                </div>

                {/* Copy for Social Media */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Share2 size={13} className="text-indigo-500" />
                      Texto para Redes Sociales / WhatsApp:
                    </span>
                    <button
                      onClick={() => handleCopy(cat.copiaRedesSociales, `post-${cat.rubro}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {isCopied ? '¡Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap select-all max-h-28 overflow-y-auto">
                    {cat.copiaRedesSociales}
                  </div>
                </div>

                {/* Push Notification Template */}
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <BellRing size={13} />
                      Notificación Push sugerida:
                    </span>
                    <button
                      onClick={() => handleSendPush(cat)}
                      disabled={isSendingPush || isPushSent}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        isPushSent
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      } disabled:opacity-50`}
                    >
                      {isPushSent ? (
                        <>
                          <Check size={12} /> Enviada
                        </>
                      ) : (
                        <>
                          <Send size={11} className={isSendingPush ? 'animate-spin' : ''} />
                          {isSendingPush ? 'Enviando...' : 'Lanzar Push'}
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {cat.notificacionPushSugerida.titulo}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">
                    {cat.notificacionPushSugerida.cuerpo}
                  </p>
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[240px]">
                  Acción: {cat.accionInmediataRecomendada}
                </span>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('publicidad')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    <Megaphone size={12} />
                    Crear Anuncio
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* General Marketing Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Estrategias Generales de Crecimiento para Bahía Blanca
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.recomendacionesGeneralesMarketing.map((mkt, i) => (
            <div
              key={mkt.id || i}
              className="p-5 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200/70 dark:border-gray-700 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                  {mkt.canalRecomendado}
                </span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {mkt.titulo}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {mkt.descripcion}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200/60 dark:border-gray-600/60 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Impacto esperado: {mkt.impactoEstimado}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
