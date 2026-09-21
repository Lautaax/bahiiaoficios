import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  MessageSquare, 
  Calendar,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface ProfessionalRequestsChartProps {
  professional: User;
  onNavigateToQuotes?: () => void;
}

interface DayData {
  key: string;
  dayLabel: string;
  fullDate: string;
  dateObj: Date;
  solicitudes: number;
  respondidas: number;
  pendientes: number;
}

export const ProfessionalRequestsChart: React.FC<ProfessionalRequestsChartProps> = ({ 
  professional, 
  onNavigateToQuotes 
}) => {
  const [loading, setLoading] = useState(true);
  const [rawRequests, setRawRequests] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'7_days' | '14_days'>('7_days');
  const [chartStyle, setChartStyle] = useState<'bars' | 'area'>('bars');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!professional?.uid) return;
      setLoading(true);
      try {
        // Query quote requests assigned to this professional
        const q = query(
          collection(db, 'quoteRequests'),
          where('profesionalesAsignados', 'array-contains', professional.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        setRawRequests(list);
      } catch (err) {
        console.error("Error fetching professional requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [professional?.uid]);

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

  // Group by days
  const chartData = useMemo<DayData[]>(() => {
    const daysCount = timeframe === '7_days' ? 7 : 14;
    const now = new Date();
    const result: DayData[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

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
        solicitudes: 0,
        respondidas: 0,
        pendientes: 0
      });
    }

    // Match raw requests to day buckets
    rawRequests.forEach(req => {
      const date = parseDate(req.fecha || req.createdAt);
      if (!date) return;

      const bucket = result.find(b => {
        const bStart = new Date(b.dateObj);
        const bEnd = new Date(b.dateObj);
        bEnd.setHours(23, 59, 59, 999);
        return date >= bStart && date <= bEnd;
      });

      if (bucket) {
        bucket.solicitudes += 1;
        
        // Check if professional responded
        const respuestas = req.respuestas || [];
        const hasResponded = respuestas.some((r: any) => r.profesionalId === professional.uid);
        
        if (hasResponded) {
          bucket.respondidas += 1;
        } else {
          bucket.pendientes += 1;
        }
      }
    });

    return result;
  }, [rawRequests, timeframe, professional.uid]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = chartData.reduce((acc, curr) => acc + curr.solicitudes, 0);
    const respondidas = chartData.reduce((acc, curr) => acc + curr.respondidas, 0);
    const pendientes = chartData.reduce((acc, curr) => acc + curr.pendientes, 0);
    const promedioDiario = (total / chartData.length).toFixed(1);
    
    // Find peak day
    const peak = [...chartData].sort((a, b) => b.solicitudes - a.solicitudes)[0];
    const peakDay = peak && peak.solicitudes > 0 ? `${peak.dayLabel} (${peak.solicitudes})` : 'Sin picos';

    const tasaRespuesta = total > 0 ? Math.round((respondidas / total) * 100) : 100;

    return {
      total,
      respondidas,
      pendientes,
      promedioDiario,
      peakDay,
      tasaRespuesta
    };
  }, [chartData]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText size={20} />
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Consultas y Solicitudes Recibidas
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualización semanal de presupuestos y demandas directas asignadas a tu perfil
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe selector */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('7_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                timeframe === '7_days'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Última semana
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('14_days')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                timeframe === '14_days'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              14 días
            </button>
          </div>

          {/* Chart visual type selector */}
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-900 p-1 border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setChartStyle('bars')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                chartStyle === 'bars'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Barras
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                chartStyle === 'area'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Curva
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total recibido */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Semana</span>
            <Calendar size={16} className="text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</span>
            <span className="text-xs text-gray-500 font-medium">solicitudes</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.promedioDiario} pedidos promedio / día
          </p>
        </div>

        {/* Pendientes de Respuesta */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Por Responder</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${stats.pendientes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
              {stats.pendientes}
            </span>
            <span className="text-xs text-gray-500 font-medium">esperando</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.pendientes > 0 ? 'Responder rápido mejora tu ranking' : '¡Estás al día!'}
          </p>
        </div>

        {/* Respondidas */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Respondidas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.respondidas}</span>
            <span className="text-xs text-gray-500 font-medium">cotizadas</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.tasaRespuesta}% de tasa de respuesta
          </p>
        </div>

        {/* Día Pico */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Día Pico</span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <div className="truncate">
            <span className="text-lg font-black text-gray-900 dark:text-white truncate block">
              {stats.peakDay}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Mayor demanda registrada
          </p>
        </div>
      </div>

      {/* Main Recharts Chart Area */}
      <div className="w-full h-72 sm:h-80 pt-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Cargando estadísticas de solicitudes...
          </div>
        ) : chartStyle === 'bars' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" opacity={0.8} />
              <XAxis 
                dataKey="dayLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                dy={6}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: '#1f2937', 
                  color: '#ffffff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  padding: '10px 14px'
                }}
                formatter={(val: any, name: any) => [
                  val, 
                  name === 'respondidas' ? 'Respondidas / Cotizadas' : 'Pendientes de respuesta'
                ]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => (
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {value === 'respondidas' ? 'Cotizadas / Respondidas' : 'Pendientes de Cotizar'}
                  </span>
                )}
              />
              <Bar 
                dataKey="respondidas" 
                name="respondidas" 
                stackId="a" 
                fill="#4f46e5" 
                radius={[0, 0, 4, 4]} 
              />
              <Bar 
                dataKey="pendientes" 
                name="pendientes" 
                stackId="a" 
                fill="#f59e0b" 
                radius={[6, 6, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" opacity={0.8} />
              <XAxis 
                dataKey="dayLabel" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                dy={6}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: '#1f2937', 
                  color: '#ffffff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="solicitudes" 
                name="Total Solicitudes"
                stroke="#4f46e5" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSolicitudes)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pro tips / Empty State */}
      {stats.total === 0 && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex items-start gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
              ¿Querés recibir más consultas esta semana?
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300 mt-0.5 leading-relaxed">
              Mantené activada tu <strong>Disponibilidad Inmediata</strong>, añadí fotos de trabajos a tu portafolio y compartí tu código QR para posicionarte arriba en los resultados de Bahía Blanca.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
