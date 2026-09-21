import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
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
  Legend 
} from 'recharts';
import { Users, FileQuestion, TrendingUp, Calendar, UserCheck, Briefcase, RefreshCw, BarChart3 } from 'lucide-react';

interface QuoteRequestRecord {
  id: string;
  rubro?: string;
  zona?: string;
  fecha?: any;
  createdAt?: any;
  [key: string]: any;
}

interface AdminMetricsChartsProps {
  users: User[];
  onRefreshData?: () => void;
}

export const AdminMetricsCharts: React.FC<AdminMetricsChartsProps> = ({ users, onRefreshData }) => {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestRecord[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [chartTimeframe, setChartTimeframe] = useState<'8_weeks' | '12_weeks' | 'all'>('8_weeks');
  const [chartType, setChartType] = useState<'combined' | 'users' | 'quotes'>('combined');

  useEffect(() => {
    const fetchQuoteRequests = async () => {
      setLoadingQuotes(true);
      try {
        const snap = await getDocs(collection(db, 'quoteRequests'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteRequestRecord));
        setQuoteRequests(list);
      } catch (err) {
        console.warn("Could not fetch quoteRequests, using empty list:", err);
        setQuoteRequests([]);
      } finally {
        setLoadingQuotes(false);
      }
    };

    fetchQuoteRequests();
  }, []);

  // Helper to parse dates accurately
  const parseDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d.toDate === 'function') return d.toDate();
    if (typeof d === 'string' || typeof d === 'number') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  // Group data weekly
  const weeklyData = useMemo(() => {
    const numWeeks = chartTimeframe === '8_weeks' ? 8 : chartTimeframe === '12_weeks' ? 12 : 16;
    const now = new Date();
    
    // Build array of week buckets going backwards from current week
    const buckets: {
      weekKey: string;
      label: string;
      startDate: Date;
      endDate: Date;
      nuevosUsuarios: number;
      nuevosClientes: number;
      nuevosProfesionales: number;
      consultasPresupuesto: number;
    }[] = [];

    // Current week start (Monday)
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // adjust when day is sunday
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = numWeeks - 1; i >= 0; i--) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - (i * 7));
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const label = `${start.getDate()} ${start.toLocaleDateString('es-AR', { month: 'short' })}`;

      buckets.push({
        weekKey: `sem-${i}`,
        label,
        startDate: start,
        endDate: end,
        nuevosUsuarios: 0,
        nuevosClientes: 0,
        nuevosProfesionales: 0,
        consultasPresupuesto: 0
      });
    }

    // Populate user counts
    users.forEach(user => {
      const date = parseDate(user.createdAt);
      if (!date) return;

      const bucket = buckets.find(b => date >= b.startDate && date <= b.endDate);
      if (bucket) {
        bucket.nuevosUsuarios++;
        if (user.rol === 'profesional') {
          bucket.nuevosProfesionales++;
        } else {
          bucket.nuevosClientes++;
        }
      }
    });

    // Populate quote request counts
    quoteRequests.forEach(quote => {
      const date = parseDate(quote.fecha || quote.createdAt);
      if (!date) return;

      const bucket = buckets.find(b => date >= b.startDate && date <= b.endDate);
      if (bucket) {
        bucket.consultasPresupuesto++;
      }
    });

    return buckets;
  }, [users, quoteRequests, chartTimeframe]);

  // Overall summaries
  const statsSummary = useMemo(() => {
    const totalUsers = users.length;
    const totalProfessionals = users.filter(u => u.rol === 'profesional').length;
    const totalClients = users.filter(u => u.rol === 'cliente').length;
    const totalQuotes = quoteRequests.length;

    // This week vs last week
    const thisWeek = weeklyData[weeklyData.length - 1] || { nuevosUsuarios: 0, consultasPresupuesto: 0 };
    const lastWeek = weeklyData[weeklyData.length - 2] || { nuevosUsuarios: 0, consultasPresupuesto: 0 };

    const userGrowth = lastWeek.nuevosUsuarios > 0 
      ? Math.round(((thisWeek.nuevosUsuarios - lastWeek.nuevosUsuarios) / lastWeek.nuevosUsuarios) * 100)
      : thisWeek.nuevosUsuarios > 0 ? 100 : 0;

    const quoteGrowth = lastWeek.consultasPresupuesto > 0
      ? Math.round(((thisWeek.consultasPresupuesto - lastWeek.consultasPresupuesto) / lastWeek.consultasPresupuesto) * 100)
      : thisWeek.consultasPresupuesto > 0 ? 100 : 0;

    return {
      totalUsers,
      totalProfessionals,
      totalClients,
      totalQuotes,
      thisWeekUsers: thisWeek.nuevosUsuarios,
      thisWeekQuotes: thisWeek.consultasPresupuesto,
      userGrowth,
      quoteGrowth
    };
  }, [users, quoteRequests, weeklyData]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Cards KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Usuarios</span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Users size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{statsSummary.totalUsers}</span>
            <span className="text-xs text-slate-500 font-medium">registrados</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <span>{statsSummary.totalProfessionals} profesionales</span>
            <span>{statsSummary.totalClients} clientes</span>
          </div>
        </div>

        {/* New Users This Week */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nuevos Esta Semana</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">+{statsSummary.thisWeekUsers}</span>
            <span className={`text-xs font-bold ${statsSummary.userGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {statsSummary.userGrowth >= 0 ? `+${statsSummary.userGrowth}%` : `${statsSummary.userGrowth}%`} vs sem. ant.
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Usuarios incorporados los últimos 7 días
          </p>
        </div>

        {/* Total Quotes */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Presupuestos</span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <FileQuestion size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{statsSummary.totalQuotes}</span>
            <span className="text-xs text-slate-500 font-medium">consultas enviadas</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Demandas de clientes a profesionales
          </p>
        </div>

        {/* Quotes This Week */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Presupuestos / Semana</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <BarChart3 size={18} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">+{statsSummary.thisWeekQuotes}</span>
            <span className={`text-xs font-bold ${statsSummary.quoteGrowth >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {statsSummary.quoteGrowth >= 0 ? `+${statsSummary.quoteGrowth}%` : `${statsSummary.quoteGrowth}%`} vs sem. ant.
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            Actividad de contratación en curso
          </p>
        </div>
      </div>

      {/* Main Chart Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" />
              Tendencia Semanal de Registro y Presupuestos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evolución comparativa por semana de nuevos registros y solicitudes de clientes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/60 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setChartType('combined')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  chartType === 'combined'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Comparativo
              </button>
              <button
                type="button"
                onClick={() => setChartType('users')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  chartType === 'users'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Usuarios
              </button>
              <button
                type="button"
                onClick={() => setChartType('quotes')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  chartType === 'quotes'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Presupuestos
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/60 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setChartTimeframe('8_weeks')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  chartTimeframe === '8_weeks'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                8 Semanas
              </button>
              <button
                type="button"
                onClick={() => setChartTimeframe('12_weeks')}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  chartTimeframe === '12_weeks'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                12 Semanas
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Area */}
        <div className="w-full h-80 pt-2">
          {chartType === 'combined' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQuotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="label" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  allowDecimals={false} 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {value === 'nuevosUsuarios' ? 'Nuevos Usuarios Registrados' : 'Consultas de Presupuestos'}
                    </span>
                  )}
                />
                <Area 
                  type="monotone" 
                  dataKey="nuevosUsuarios" 
                  name="nuevosUsuarios"
                  stroke="#4f46e5" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="consultasPresupuesto" 
                  name="consultasPresupuesto"
                  stroke="#f59e0b" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorQuotes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartType === 'users' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {value === 'nuevosClientes' ? 'Clientes' : 'Profesionales'}
                    </span>
                  )}
                />
                <Bar dataKey="nuevosClientes" name="nuevosClientes" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                <Bar dataKey="nuevosProfesionales" name="nuevosProfesionales" stackId="a" fill="#4338ca" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  formatter={() => (
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Consultas de Presupuestos
                    </span>
                  )}
                />
                <Bar dataKey="consultasPresupuesto" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
