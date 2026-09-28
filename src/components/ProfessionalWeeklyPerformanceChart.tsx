import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Eye,
  MessageSquare,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import { fcmService } from '../services/fcmService';

interface ProfessionalWeeklyPerformanceChartProps {
  professional: User;
  onNavigateToQuotes?: () => void;
}

interface DayMetric {
  key: string;
  dayLabel: string;
  fullDate: string;
  dateObj: Date;
  vistas: number;
  consultas: number;
  tasaConversion: number;
}

export const ProfessionalWeeklyPerformanceChart: React.FC<ProfessionalWeeklyPerformanceChartProps> = ({
  professional,
  onNavigateToQuotes
}) => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7_days' | '14_days' | '30_days'>('7_days');
  const [chartMode, setChartMode] = useState<'combined' | 'bars' | 'conversion'>('combined');
  
  const [rawStats, setRawStats] = useState<any[]>([]);
  const [rawQuotes, setRawQuotes] = useState<any[]>([]);
  const [rawChats, setRawChats] = useState<any[]>([]);

  // Helper date parser
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

  const fetchData = async () => {
    if (!professional?.uid) return;
    setLoading(true);
    try {
      // 1. Fetch subcollection stats (views & clicks recorded daily)
      const statsRef = collection(db, 'usuarios', professional.uid, 'stats');
      const statsSnap = await getDocs(statsRef);
      const statsList = statsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRawStats(statsList);

      // 2. Fetch quote requests assigned to this professional or direct
      const qQuotes = query(
        collection(db, 'quoteRequests'),
        where('profesionalesAsignados', 'array-contains', professional.uid)
      );
      const quotesSnap = await getDocs(qQuotes);
      const quotesList = quotesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRawQuotes(quotesList);

      // 3. Fetch direct chats where this professional was contacted
      const qChats = query(
        collection(db, 'chats'),
        where('workerId', '==', professional.uid)
      );
      const chatsSnap = await getDocs(qChats);
      const chatsList = chatsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRawChats(chatsList);
    } catch (err) {
      console.warn('Error fetching weekly performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [professional?.uid]);

  // Aggregate day-by-day metrics
  const performanceData = useMemo<DayMetric[]>(() => {
    const daysCount = timeframe === '7_days' ? 7 : timeframe === '14_days' ? 14 : 30;
    const now = new Date();
    const result: DayMetric[] = [];

    // Build timeline buckets from oldest to today
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayName = i === 0 
        ? 'Hoy' 
        : i === 1 
          ? 'Ayer' 
          : d.toLocaleDateString('es-AR', { weekday: 'short' });
      
      const dayFormatted = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d.getDate()}/${d.getMonth() + 1}`;

      result.push({
        key: `day-${i}`,
        dayLabel: dayFormatted,
        fullDate: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        dateObj: d,
        vistas: 0,
        consultas: 0,
        tasaConversion: 0
      });
    }

    // Match views from stats subcollection
    const totalRecordedViews = professional.profesionalInfo?.profileViews || 0;
    let sumMatchedViews = 0;

    rawStats.forEach(st => {
      const stDate = parseDate(st.date || st.id);
      if (!stDate) return;

      const bucket = result.find(b => {
        const bStart = new Date(b.dateObj);
        const bEnd = new Date(b.dateObj);
        bEnd.setHours(23, 59, 59, 999);
        return stDate >= bStart && stDate <= bEnd;
      });

      if (bucket) {
        const v = typeof st.views === 'number' ? st.views : (typeof st.vistas === 'number' ? st.vistas : 0);
        bucket.vistas += v;
        sumMatchedViews += v;
      }
    });

    // Only real data from Firestore: if daily stats subcollection has not recorded days yet,
    // attribute existing total views directly to the current day
    if (sumMatchedViews === 0 && totalRecordedViews > 0) {
      const todayBucket = result[result.length - 1];
      if (todayBucket) {
        todayBucket.vistas = totalRecordedViews;
      }
    }

    // Match quote requests to buckets
    rawQuotes.forEach(req => {
      const qDate = parseDate(req.fecha || req.createdAt);
      if (!qDate) return;

      const bucket = result.find(b => {
        const bStart = new Date(b.dateObj);
        const bEnd = new Date(b.dateObj);
        bEnd.setHours(23, 59, 59, 999);
        return qDate >= bStart && qDate <= bEnd;
      });

      if (bucket) {
        bucket.consultas += 1;
      }
    });

    // Match direct chats to buckets
    rawChats.forEach(chat => {
      const cDate = parseDate(chat.createdAt || chat.timestamp || chat.lastMessageDate);
      if (!cDate) return;

      const bucket = result.find(b => {
        const bStart = new Date(b.dateObj);
        const bEnd = new Date(b.dateObj);
        bEnd.setHours(23, 59, 59, 999);
        return cDate >= bStart && cDate <= bEnd;
      });

      if (bucket) {
        bucket.consultas += 1;
      }
    });

    // Calculate daily conversion rate
    result.forEach(b => {
      if (b.vistas > 0) {
        b.tasaConversion = Math.min(100, Math.round((b.consultas / b.vistas) * 100));
      } else if (b.consultas > 0) {
        b.tasaConversion = 100;
        b.vistas = Math.max(b.vistas, b.consultas);
      } else {
        b.tasaConversion = 0;
      }
    });

    return result;
  }, [rawStats, rawQuotes, rawChats, timeframe, professional.profesionalInfo?.profileViews]);

  // Aggregate summary metrics
  const stats = useMemo(() => {
    const totalVistas = performanceData.reduce((acc, curr) => acc + curr.vistas, 0);
    const totalConsultas = performanceData.reduce((acc, curr) => acc + curr.consultas, 0);
    const promedioVistas = (totalVistas / performanceData.length).toFixed(1);
    const promedioConsultas = (totalConsultas / performanceData.length).toFixed(1);

    const overallConversion = totalVistas > 0 
      ? ((totalConsultas / totalVistas) * 100).toFixed(1)
      : (totalConsultas > 0 ? '100.0' : '0.0');

    // Peak day
    const peakDay = [...performanceData].sort((a, b) => (b.consultas * 10 + b.vistas) - (a.consultas * 10 + a.vistas))[0];
    const peakLabel = peakDay && (peakDay.vistas > 0 || peakDay.consultas > 0)
      ? `${peakDay.dayLabel} (${peakDay.consultas} consultas / ${peakDay.vistas} vistas)`
      : 'Aún sin picos';

    return {
      totalVistas,
      totalConsultas,
      promedioVistas,
      promedioConsultas,
      overallConversion,
      peakLabel
    };
  }, [performanceData]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <TrendingUp size={22} />
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Rendimiento Semanal: Vistas vs Consultas
                <span className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Evolución de las visualizaciones de tu perfil y la cantidad de consultas recibidas en Bahía Blanca
              </p>
            </div>
          </div>
        </div>

        {/* View toggles & Timeframe */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe selector */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('7_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeframe === '7_days'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semana (7d)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('14_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeframe === '14_days'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              14 días
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeframe === '30_days'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mes (30d)
            </button>
          </div>

          {/* Chart mode */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('combined')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                chartMode === 'combined'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Combinada
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bars')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                chartMode === 'bars'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Barras
            </button>
            <button
              type="button"
              onClick={() => setChartMode('conversion')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                chartMode === 'conversion'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              % Conversión
            </button>
          </div>

          {/* Refresh / simulate */}
          <button
            type="button"
            onClick={fetchData}
            title="Actualizar datos"
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Visualizaciones */}
        <div className="bg-slate-50 dark:bg-slate-700/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Vistas de Perfil</span>
            <Eye size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalVistas}
            </span>
            <span className="text-xs text-slate-500 font-medium">visitas</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Promedio: {stats.promedioVistas} vistas / día
          </p>
        </div>

        {/* Total Consultas Recibidas */}
        <div className="bg-slate-50 dark:bg-slate-700/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Consultas Recibidas</span>
            <MessageSquare size={18} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.totalConsultas}
            </span>
            <span className="text-xs text-slate-500 font-medium">pedidos</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Presupuestos y chats directos
          </p>
        </div>

        {/* Tasa de Conversión */}
        <div className="bg-slate-50 dark:bg-slate-700/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Tasa de Conversión</span>
            <Percent size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.overallConversion}%
            </span>
            <span className="text-xs text-slate-500 font-medium">vistas a leads</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Contactos generados por visita
          </p>
        </div>

        {/* Día Pico */}
        <div className="bg-slate-50 dark:bg-slate-700/40 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Pico de Rendimiento</span>
            <Zap size={18} className="text-indigo-500" />
          </div>
          <div className="truncate">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate block">
              {stats.peakLabel}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Mayor actividad registrada
          </p>
        </div>
      </div>

      {/* Main Recharts Area */}
      <div className="w-full h-80 sm:h-96 pt-3">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Cargando evolución de vistas y consultas...
          </div>
        ) : chartMode === 'combined' ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={performanceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientVistas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={8}
              />
              {/* Left axis: Profile Views */}
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6366f1', fontSize: 11 }}
              />
              {/* Right axis: Consultas */}
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#10b981', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3)',
                  fontSize: '12px',
                  padding: '12px 16px'
                }}
                formatter={(value: any, name: any) => [
                  value,
                  name === 'vistas' 
                    ? '👁️ Vistas de Perfil' 
                    : name === 'consultas' 
                      ? '📩 Consultas Recibidas' 
                      : 'Tasa de Conversión (%)'
                ]}
                labelFormatter={(label) => `📅 ${label}`}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {value === 'vistas' ? '👁️ Vistas de Perfil (Área)' : '📩 Consultas Recibidas (Línea)'}
                  </span>
                )}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="vistas"
                name="vistas"
                fill="url(#gradientVistas)"
                stroke="#6366f1"
                strokeWidth={3}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="consultas"
                name="consultas"
                stroke="#10b981"
                strokeWidth={3.5}
                dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : chartMode === 'bars' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '12px 16px'
                }}
                formatter={(value: any, name: any) => [
                  value,
                  name === 'vistas' ? '👁️ Vistas de Perfil' : '📩 Consultas Recibidas'
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {value === 'vistas' ? 'Vistas de Perfil' : 'Consultas Recibidas'}
                  </span>
                )}
              />
              <Bar dataKey="vistas" name="vistas" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="consultas" name="consultas" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientConversion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                unit="%"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#f59e0b', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '12px 16px'
                }}
                formatter={(value: any) => [`${value}%`, 'Efectividad / Conversión']}
              />
              <Area
                type="monotone"
                dataKey="tasaConversion"
                name="% Conversión"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="url(#gradientConversion)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Action footer & tips */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
              Consejo para multiplicar tus consultas esta semana:
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300 mt-0.5 leading-relaxed">
              Responder en los primeros <strong>15 minutos</strong> aumenta un <strong>70%</strong> la probabilidad de cerrar el trabajo. Activá tus notificaciones push para no perderte ningún pedido.
            </p>
          </div>
        </div>

        {onNavigateToQuotes && (
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onNavigateToQuotes}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              Ver Pedidos Pendientes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
