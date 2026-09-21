import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle, 
  Lightbulb, 
  Layers, 
  Search, 
  Users, 
  ArrowRight, 
  Copy, 
  Check, 
  RefreshCw,
  Palette,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { AdminAnalyticsReport } from '../services/analyticsService';

interface AdminAiOptimizerProps {
  analytics: AdminAnalyticsReport;
  onRefreshMetrics?: () => void;
}

interface OptimizationResult {
  scoreSaludWeb: number;
  resumenEjecutivo: string;
  metricasDestacadas: { etiqueta: string; valor: string; estado: 'positivo' | 'neutro' | 'atencion' }[];
  recomendaciones: {
    id: string;
    titulo: string;
    categoria: 'ux_diseno' | 'busquedas_rubros' | 'visibilidad_profesionales' | 'conversion';
    prioridad: 'alta' | 'media' | 'baja';
    diagnostico: string;
    accionSugerida: string;
    impactoEsperado: string;
  }[];
  frasesOptimizadas: {
    seccion: string;
    textoActual: string;
    sugerenciaMejorada: string;
  }[];
  rubrosSugeridosDestacar: string[];
}

export const AdminAiOptimizer: React.FC<AdminAiOptimizerProps> = ({ 
  analytics, 
  onRefreshMetrics 
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastAuditTime, setLastAuditTime] = useState<Date | null>(null);

  const runAudit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: {
            traffic: analytics.traffic,
            pages: analytics.pages,
            professionals: analytics.professionals.slice(0, 10),
            searches: analytics.searches
          }
        })
      });

      if (!response.ok) throw new Error("Error en auditoría");
      const data = await response.json();
      setResult(data);
      setLastAuditTime(new Date());
    } catch (err) {
      console.error("Error running AI audit:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRecommendations = result?.recomendaciones.filter(rec => {
    if (selectedCategory === 'todos') return true;
    return rec.categoria === selectedCategory;
  }) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero AI Audit Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-10 text-white shadow-xl border border-indigo-800/60">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
              <span>Optimizador de Experiencia & Navegación Web con IA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hacé que Bahía Oficios sea más agradable, intuitiva y rentable
            </h2>
            <p className="text-sm text-indigo-200/80 leading-relaxed">
              El motor de Inteligencia Artificial analiza en tiempo real a dónde entra la gente, qué rubros buscan y qué profesionales reciben más consultas para recomendar mejoras concretas de diseño y contenido.
            </p>

            {lastAuditTime && (
              <p className="text-xs text-indigo-300/60">
                Última auditoría generada: {lastAuditTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
              </p>
            )}
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={runAudit}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Analizando métricas con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} className="text-amber-300" />
                  <span>{result ? 'Volver a Auditar con IA' : 'Auditar y Optimizar Web con IA'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ambient subtle decorative lights */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* When no audit executed yet, prompt action */}
      {!result && !loading && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/60">
            <Lightbulb size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            La IA está lista para procesar las métricas de Bahía Blanca
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6 leading-relaxed">
            Hacé clic en el botón superior para evaluar la salud del portal, descubrir qué términos demandan los bahienses y recibir un plan paso a paso para hacer la experiencia más placentera y efectiva.
          </p>
          <button
            onClick={runAudit}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Generar Auditoría Inteligente</span>
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm text-center py-16 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            Examinando tráfico, búsquedas y comportamiento de perfiles...
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gemini 3.8 Flash está generando recomendaciones de UX personalizadas para Bahía Oficios
          </p>
        </div>
      )}

      {/* Audit Result Display */}
      {result && !loading && (
        <div className="space-y-8">
          {/* Executive Overview & Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Calificación de Experiencia & UX
                </span>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                    {result.scoreSaludWeb}
                  </span>
                  <span className="text-slate-400 font-bold text-xl">/ 100</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${result.scoreSaludWeb}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle size={14} />
                  <span>Plataforma con alta interacción y gran potencial de optimización</span>
                </p>
              </div>
            </div>

            {/* Diagnostic Summary */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Lightbulb size={18} />
                <span>Diagnóstico Ejecutivo de la IA</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                {result.resumenEjecutivo}
              </p>

              {/* Highlights Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                {result.metricasDestacadas.map((m, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block truncate">
                      {m.etiqueta}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
                      {m.valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Filter Tabs for Recommendations */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Recomendaciones Priorizadas para la Web
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acciones diseñadas para que la navegación sea más fluida y placentera
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === 'todos' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todas ({result.recomendaciones.length})
              </button>
              <button
                onClick={() => setSelectedCategory('ux_diseno')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === 'ux_diseno' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                UX & Diseño
              </button>
              <button
                onClick={() => setSelectedCategory('busquedas_rubros')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === 'busquedas_rubros' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Búsquedas
              </button>
              <button
                onClick={() => setSelectedCategory('visibilidad_profesionales')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === 'visibilidad_profesionales' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Profesionales
              </button>
              <button
                onClick={() => setSelectedCategory('conversion')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  selectedCategory === 'conversion' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Conversión
              </button>
            </div>
          </div>

          {/* Recommendations Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecommendations.map((rec) => {
              const isHigh = rec.prioridad === 'alta';
              return (
                <div 
                  key={rec.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-700 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        isHigh 
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60' 
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60'
                      }`}>
                        Prioridad {rec.prioridad}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {rec.categoria === 'ux_diseno' && '🎨 Diseño Visual'}
                        {rec.categoria === 'busquedas_rubros' && '🔍 Demanda & Términos'}
                        {rec.categoria === 'visibilidad_profesionales' && '👷 Perfiles'}
                        {rec.categoria === 'conversion' && '⚡ Solicitudes'}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {rec.titulo}
                    </h4>

                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Diagnóstico de métricas:
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {rec.diagnostico}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                        Acción recomendada:
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {rec.accionSugerida}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Impacto: <strong className="text-emerald-600 dark:text-emerald-400">{rec.impactoEsperado}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Microcopy & Tone Optimizations */}
          {result.frasesOptimizadas && result.frasesOptimizadas.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Palette size={20} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Textos y Microcopy Sugeridos (Más Cercanos y Agradables)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cambios en llamadas a la acción para generar empatía y confianza en Bahía Blanca
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.frasesOptimizadas.map((f, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        {f.seccion}
                      </span>
                      <div className="text-xs text-slate-500 line-through mb-2">
                        {f.textoActual}
                      </div>
                      <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                        "{f.sugerenciaMejorada}"
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(f.sugerenciaMejorada, `phrase-${idx}`)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      {copiedId === `phrase-${idx}` ? (
                        <>
                          <Check size={14} className="text-emerald-500" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rubros to Highlight on Home */}
          {result.rubrosSugeridosDestacar && result.rubrosSugeridosDestacar.length > 0 && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-3xl p-6 sm:p-8 border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-indigo-950 dark:text-indigo-200">
                  Rubros Clave Sugeridos para la Portada
                </h4>
                <p className="text-xs text-indigo-800/80 dark:text-indigo-300">
                  Basado en lo que más buscan los vecinos bahienses en este período
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {result.rubrosSugeridosDestacar.map((rubro, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold shadow-xs border border-indigo-200 dark:border-indigo-800"
                  >
                    ★ {rubro}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
