import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Eye, 
  Search, 
  Briefcase, 
  Sparkles, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  MapPin, 
  Phone, 
  Star, 
  ExternalLink, 
  CheckCircle, 
  RefreshCw,
  Clock,
  Layers,
  BarChart3,
  Flame,
  Crown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { User } from '../types';
import { analyticsService, AdminAnalyticsReport } from '../services/analyticsService';
import { AdminAiOptimizer } from './AdminAiOptimizer';
import { AdminMetricsCharts } from './AdminMetricsCharts';
import { Link } from 'react-router-dom';

interface AdminComprehensiveAnalyticsProps {
  users: User[];
  onRefreshData?: () => void;
}

export const AdminComprehensiveAnalytics: React.FC<AdminComprehensiveAnalyticsProps> = ({ 
  users, 
  onRefreshData 
}) => {
  const [subTab, setSubTab] = useState<'resumen' | 'paginas' | 'profesionales' | 'busquedas' | 'ia_optimizer' | 'tendencia'>('resumen');
  const [analytics, setAnalytics] = useState<AdminAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [profSearchFilter, setProfSearchFilter] = useState('');
  const [selectedRubroFilter, setSelectedRubroFilter] = useState('todos');

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAdminComprehensiveAnalytics(users);
      setAnalytics(data);
    } catch (e) {
      console.error("Error loading comprehensive analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [users]);

  // Filter professionals
  const filteredProfessionals = (analytics?.professionals || []).filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(profSearchFilter.toLowerCase()) ||
                          p.rubro.toLowerCase().includes(profSearchFilter.toLowerCase()) ||
                          p.zona.toLowerCase().includes(profSearchFilter.toLowerCase());
    const matchesRubro = selectedRubroFilter === 'todos' || p.rubro === selectedRubroFilter;
    return matchesSearch && matchesRubro;
  });

  // Extract unique rubros for filter dropdown
  const uniqueRubros = Array.from(new Set((analytics?.professionals || []).map(p => p.rubro))).filter(Boolean);

  if (loading || !analytics) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-slate-200 dark:border-slate-700 shadow-sm text-center py-24 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          Recopilando métricas de tráfico, búsquedas y profesionales...
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sincronizando eventos y registros en tiempo real
        </p>
      </div>
    );
  }

  const { traffic, pages, professionals, searches } = analytics;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs sm:text-sm font-bold">
          <button
            onClick={() => setSubTab('resumen')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'resumen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 size={16} />
            <span>Resumen General</span>
          </button>

          <button
            onClick={() => setSubTab('paginas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'paginas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <Eye size={16} />
            <span>Gente & Páginas</span>
          </button>

          <button
            onClick={() => setSubTab('profesionales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'profesionales'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <Users size={16} />
            <span>Profesionales Más Visitados</span>
          </button>

          <button
            onClick={() => setSubTab('busquedas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'busquedas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <Search size={16} />
            <span>Qué Busca la Gente</span>
          </button>

          <button
            onClick={() => setSubTab('ia_optimizer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'ia_optimizer'
                ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
            }`}
          >
            <Sparkles size={16} className="text-amber-300" />
            <span>Optimizar con IA</span>
          </button>

          <button
            onClick={() => setSubTab('tendencia')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              subTab === 'tendencia'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp size={16} />
            <span>Tendencia Semanal</span>
          </button>
        </div>

        <button
          onClick={() => {
            loadMetrics();
            if (onRefreshData) onRefreshData();
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors ml-auto sm:ml-0"
        >
          <RefreshCw size={14} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* SUB-TAB: RESUMEN GENERAL */}
      {subTab === 'resumen' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Visits */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Visitas Totales</span>
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <Eye size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {traffic.totalVisits.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                Páginas vistas registradas en el portal
              </p>
            </div>

            {/* Today Visits */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Visitas de Hoy</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  +{traffic.todayVisits}
                </span>
                <span className="text-xs font-bold text-emerald-600">en curso</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                Actividad en las últimas 24 horas
              </p>
            </div>

            {/* Professionals Consulted */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Profesionales Activos</span>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Briefcase size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {professionals.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">con ficha activa</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                {professionals.filter(p => p.contacts > 0).length} recibieron contactos directos
              </p>
            </div>

            {/* Searches tracked */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Términos Buscados</span>
                <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <Search size={18} />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {searches.topTerms.reduce((a, b) => a + b.count, 0)}
                </span>
                <span className="text-xs text-slate-400 font-medium">consultas</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                Oficio líder: <strong>{searches.topRubros[0]?.rubro || 'Electricidad'}</strong>
              </p>
            </div>
          </div>

          {/* Daily Traffic Chart with Recharts */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
                  Evolución Diaria de Personas que Entran a la Web
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conteo de visitas totales y visitantes únicos estimados de los últimos 7 días
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400">Visitas Totales</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-400">Visitantes Únicos</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic.dailyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '16px', 
                      border: 'none', 
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visits" 
                    name="Visitas Totales" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVisits)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="unique" 
                    name="Visitantes Únicos" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorUnique)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Snapshot 2-Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Visited Pages Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />
                  ¿A Dónde Entra la Gente? (Top Páginas)
                </h4>
                <button
                  onClick={() => setSubTab('paginas')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ver todas
                </button>
              </div>

              <div className="space-y-3">
                {pages.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                        {p.label}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {p.visits} vistas <span className="text-slate-400 font-normal">({p.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(p.percentage, 4)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Searches Preview */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Search size={18} className="text-purple-600 dark:text-purple-400" />
                  ¿Qué Busca Todo el Mundo en Bahía?
                </h4>
                <button
                  onClick={() => setSubTab('busquedas')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ver búsquedas
                </button>
              </div>

              <div className="space-y-2.5">
                {searches.topTerms.slice(0, 5).map((term, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        "{term.term}"
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {term.count} búsquedas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: GENTE QUE ENTRA Y A DÓNDE ENTRA */}
      {subTab === 'paginas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Desglose de Tráfico: ¿A Dónde Entra la Gente?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conteo detallado de accesos por pantalla, sección y módulo del sitio web
                </p>
              </div>

              <div className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/60">
                Total acumulado: {traffic.totalVisits.toLocaleString()} visitas
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Página / Sección</th>
                    <th className="pb-3 font-semibold">Ruta (Path)</th>
                    <th className="pb-3 font-semibold text-right">Cantidad de Visitas</th>
                    <th className="pb-3 font-semibold text-right">% del Tráfico</th>
                    <th className="pb-3 font-semibold pl-6">Distribución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pages.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                        <span>{p.label}</span>
                      </td>
                      <td className="py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {p.path}
                      </td>
                      <td className="py-3.5 font-extrabold text-slate-900 dark:text-white text-right">
                        {p.visits.toLocaleString()}
                      </td>
                      <td className="py-3.5 font-bold text-indigo-600 dark:text-indigo-400 text-right">
                        {p.percentage}%
                      </td>
                      <td className="py-3.5 pl-6 w-48">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full" 
                            style={{ width: `${Math.max(p.percentage, 3)}%` }} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: A QUÉ EMPLEADOS / PROFESIONALES ENTRAN */}
      {subTab === 'profesionales' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  ¿A Qué Profesionales Entra la Gente?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ranking de perfiles de trabajadores más vistos, clics de WhatsApp recibidos y tasa de conversión
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar profesional o zona..."
                  value={profSearchFilter}
                  onChange={(e) => setProfSearchFilter(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <select
                  value={selectedRubroFilter}
                  onChange={(e) => setSelectedRubroFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-300"
                >
                  <option value="todos">Todos los Oficios</option>
                  {uniqueRubros.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Professionals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/80 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Profesional</th>
                    <th className="pb-3 font-semibold">Rubro / Oficio</th>
                    <th className="pb-3 font-semibold">Zona</th>
                    <th className="pb-3 font-semibold text-center">Vistas de Perfil</th>
                    <th className="pb-3 font-semibold text-center">Contactos (WhatsApp)</th>
                    <th className="pb-3 font-semibold text-center">Conversión (%)</th>
                    <th className="pb-3 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredProfessionals.map((prof, index) => (
                    <tr key={prof.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 flex items-center gap-3">
                        <div className="relative">
                          {prof.fotoUrl ? (
                            <img 
                              src={prof.fotoUrl} 
                              alt={prof.nombre} 
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {prof.nombre.charAt(0)}
                            </div>
                          )}
                          {prof.isVip && (
                            <Crown size={12} className="absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{prof.nombre}</span>
                            {prof.isVip && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span>{prof.ratingAvg > 0 ? prof.ratingAvg.toFixed(1) : 'Nuevo'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          {prof.rubro}
                        </span>
                      </td>

                      <td className="py-3.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{prof.zona}</span>
                        </div>
                      </td>

                      <td className="py-3.5 text-center font-extrabold text-slate-900 dark:text-white">
                        {prof.views}
                      </td>

                      <td className="py-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {prof.contacts}
                      </td>

                      <td className="py-3.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {prof.conversionRate}%
                      </td>

                      <td className="py-3.5 text-right">
                        <Link
                          to={`/profesional/${prof.uid}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
                        >
                          <span>Ver Ficha</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {filteredProfessionals.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        No se encontraron profesionales con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: QUÉ BUSCA LA GENTE */}
      {subTab === 'busquedas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Search Terms List */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Términos Más Buscados en Bahía Blanca
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Palabras clave tipeadas o dictadas por voz en el buscador del portal
                  </p>
                </div>
                <div className="text-xs px-3 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold rounded-full">
                  {searches.topTerms.length} términos registrados
                </div>
              </div>

              <div className="space-y-3">
                {searches.topTerms.map((term, index) => {
                  const maxCount = searches.topTerms[0]?.count || 1;
                  const widthPct = Math.round((term.count / maxCount) * 100);
                  return (
                    <div key={index} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            "{term.term}"
                          </span>
                          {term.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {term.category}
                            </span>
                          )}
                        </div>

                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {term.count} búsquedas
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(widthPct, 4)}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rubros and Zones Breakdown */}
            <div className="space-y-6">
              {/* Demand by Rubro */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Flame size={18} className="text-amber-500" />
                  Demanda por Rubro de Oficio
                </h4>

                <div className="space-y-2.5">
                  {searches.topRubros.map((rub, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {rub.rubro}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {rub.count} ({rub.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${Math.max(rub.percentage, 5)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demand by Zone */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600" />
                  Zonas de Bahía Más Buscadas
                </h4>

                <div className="space-y-2">
                  {searches.topZonas.map((z, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {z.zona}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {z.count} consultas
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: IA PARA OPTIMIZAR TODO */}
      {subTab === 'ia_optimizer' && (
        <AdminAiOptimizer 
          analytics={analytics} 
          onRefreshMetrics={loadMetrics} 
        />
      )}

      {/* SUB-TAB: TENDENCIA SEMANAL DE USUARIOS Y PRESUPUESTOS */}
      {subTab === 'tendencia' && (
        <AdminMetricsCharts 
          users={users} 
          onRefreshData={onRefreshData} 
        />
      )}
    </div>
  );
};
