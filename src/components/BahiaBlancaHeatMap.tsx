import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame, MapPin, Filter, RotateCcw, Layers, Compass, TrendingUp, Users, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { BAHIA_BLANCA_CENTER } from '../data/bahiaBlancaZones';
import { getBahiaBlancaHeatMapData, HeatMapStats, ZoneHeatData } from '../services/adminOperationsService';
import { PROFESSIONS } from '../constants';

interface BahiaBlancaHeatMapProps {
  onSelectZone?: (zoneName: string) => void;
}

export const BahiaBlancaHeatMap: React.FC<BahiaBlancaHeatMapProps> = ({ onSelectZone }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [stats, setStats] = useState<HeatMapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRubro, setSelectedRubro] = useState<string>('todos');
  const [timeframe, setTimeframe] = useState<number>(0); // 0 = all time, 30 = last 30d, 7 = last 7d
  const [mapTheme, setMapTheme] = useState<'voyager' | 'dark' | 'osm'>('voyager');
  const [activeZone, setActiveZone] = useState<ZoneHeatData | null>(null);
  const [viewMode, setViewMode] = useState<'calor' | 'densidad' | 'cobertura'>('calor');

  // Load data from Firestore
  const loadHeatData = async () => {
    setLoading(true);
    try {
      const data = await getBahiaBlancaHeatMapData(selectedRubro, timeframe);
      setStats(data);
      if (data.zones.length > 0 && !activeZone) {
        // default select top zone
        const top = data.zones.find(z => z.requestCount > 0) || data.zones[0];
        setActiveZone(top);
      }
    } catch (err) {
      console.error("Error loading heat map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeatData();
  }, [selectedRubro, timeframe]);

  // Tile layer URL helper
  const getTileLayer = (theme: 'voyager' | 'dark' | 'osm') => {
    if (theme === 'dark') {
      return {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
      };
    }
    if (theme === 'osm') {
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
      };
    }
    // Voyager is crisp and perfect for light theme
    return {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
    };
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [BAHIA_BLANCA_CENTER.lat, BAHIA_BLANCA_CENTER.lng],
        zoom: BAHIA_BLANCA_CENTER.zoom,
        zoomControl: true,
        scrollWheelZoom: true
      });

      const tileConfig = getTileLayer(mapTheme);
      const tileLayer = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: 18,
        minZoom: 11
      }).addTo(map);

      // Save tileLayer reference to update when theme changes
      (map as any)._customTileLayer = tileLayer;

      const layerGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Invalidate size after container finishes layout
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layersGroupRef.current = null;
      }
    };
  }, []);

  // Update map tile theme
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if ((map as any)._customTileLayer) {
      map.removeLayer((map as any)._customTileLayer);
    }

    const tileConfig = getTileLayer(mapTheme);
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 18,
      minZoom: 11
    }).addTo(map);

    (map as any)._customTileLayer = newTileLayer;
  }, [mapTheme]);

  // Render heat overlays and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group || !stats) return;

    group.clearLayers();

    const maxCount = Math.max(...stats.zones.map(z => z.requestCount), 1);

    stats.zones.forEach(zone => {
      const isSelected = activeZone?.name === zone.name;
      const count = zone.requestCount;
      const intensity = zone.intensity;

      // Base radius calculation
      let radius = 600;
      let fillColor = zone.color;
      let fillOpacity = 0.25;

      if (viewMode === 'cobertura') {
        // In coverage mode, highlight zones with high demand but 0 or few professionals
        if (count > 0 && zone.professionalsCount === 0) {
          fillColor = '#dc2626'; // Red: unattended demand!
          fillOpacity = 0.55;
          radius = 1100;
        } else if (count > 0 && zone.coverageRatio >= 3) {
          fillColor = '#f97316';
          fillOpacity = 0.45;
          radius = 900;
        } else if (zone.professionalsCount > 0) {
          fillColor = '#10b981';
          fillOpacity = 0.35;
          radius = 700;
        }
      } else {
        // Standard Heat & Density view
        if (intensity >= 75) {
          radius = 1400;
          fillOpacity = 0.65;
        } else if (intensity >= 50) {
          radius = 1100;
          fillOpacity = 0.55;
        } else if (intensity >= 25) {
          radius = 850;
          fillOpacity = 0.45;
        } else if (count > 0) {
          radius = 650;
          fillOpacity = 0.35;
        } else {
          radius = 450;
          fillOpacity = 0.15;
          fillColor = '#94a3b8';
        }
      }

      // Outer glow circle for high-density hotspots
      if (intensity >= 50 && viewMode !== 'cobertura') {
        const outerCircle = L.circle([zone.lat, zone.lng], {
          radius: radius * 1.5,
          color: fillColor,
          weight: 0,
          fillColor: fillColor,
          fillOpacity: 0.18,
          interactive: false
        });
        group.addLayer(outerCircle);
      }

      // Main Heat Circle
      const mainCircle = L.circle([zone.lat, zone.lng], {
        radius: isSelected ? radius * 1.15 : radius,
        color: isSelected ? '#4f46e5' : fillColor,
        weight: isSelected ? 3 : 1.5,
        fillColor: fillColor,
        fillOpacity: isSelected ? Math.min(fillOpacity + 0.2, 0.85) : fillOpacity
      });

      // Custom marker label at the center
      const iconHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${count > 0 ? (intensity >= 70 ? '#b91c1c' : intensity >= 40 ? '#c2410c' : '#047857') : '#475569'};
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          line-height: 1;
          padding: 3px 7px;
          border-radius: 9999px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          border: 2px solid #ffffff;
          white-space: nowrap;
          cursor: pointer;
          transform: translate(-50%, -50%);
        ">
          ${count > 0 ? `🔥 ${count}` : '0'}
        </div>
      `;

      const divIcon = L.divIcon({
        html: iconHtml,
        className: 'bahia-heat-label',
        iconSize: [30, 20]
      });

      const labelMarker = L.marker([zone.lat, zone.lng], { icon: divIcon });

      const handleClick = () => {
        setActiveZone(zone);
        if (onSelectZone) onSelectZone(zone.name);
        map.panTo([zone.lat, zone.lng], { animate: true, duration: 0.6 });
      };

      mainCircle.on('click', handleClick);
      labelMarker.on('click', handleClick);

      // Popup content
      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #0f172a;">📍 ${zone.name}</strong>
            <span style="
              font-size: 10px;
              font-weight: 700;
              padding: 2px 6px;
              border-radius: 6px;
              background: ${zone.color}20;
              color: ${zone.color};
              text-transform: uppercase;
            ">
              ${zone.level === 'critica' ? 'Demanda Extrema' : zone.level === 'alta' ? 'Alta Demanda' : zone.level === 'media' ? 'Demanda Media' : 'Baja / Sin Datos'}
            </span>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: #64748b;">Solicitudes de servicio:</span>
              <strong style="color: #0f172a; font-size: 13px;">${zone.requestCount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
              <span style="color: #64748b;">Profesionales registrados:</span>
              <strong style="color: #0f172a;">${zone.professionalsCount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Intensidad de calor:</span>
              <strong style="color: ${zone.color};">${zone.intensity}%</strong>
            </div>
          </div>

          ${zone.topRubros.length > 0 ? `
            <div style="font-size: 11px; margin-top: 6px;">
              <span style="font-weight: 600; color: #475569;">Rubros más pedidos:</span>
              <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 3px;">
                ${zone.topRubros.map(r => `
                  <div style="display: flex; justify-content: space-between; color: #334155;">
                    <span>• ${r.rubro}</span>
                    <strong>${r.count} (${r.percentage}%)</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : '<p style="font-size: 11px; color: #94a3b8; margin: 0;">Sin solicitudes registradas aún en esta zona.</p>'}
        </div>
      `;

      mainCircle.bindPopup(popupHtml);
      labelMarker.bindPopup(popupHtml);

      group.addLayer(mainCircle);
      group.addLayer(labelMarker);
    });
  }, [stats, activeZone, viewMode]);

  // Center map on Bahía Blanca
  const resetMapCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([BAHIA_BLANCA_CENTER.lat, BAHIA_BLANCA_CENTER.lng], BAHIA_BLANCA_CENTER.zoom, {
        duration: 0.8
      });
    }
  };

  const focusZone = (zone: ZoneHeatData) => {
    setActiveZone(zone);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([zone.lat, zone.lng], 14, { duration: 0.8 });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <Flame size={22} className="animate-pulse" />
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Mapa de Calor Geográfico de Bahía Blanca
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Visualización en tiempo real de zonas con mayor densidad de solicitudes y pedidos de presupuestos
            </p>
          </div>

          {/* KPI Summary Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-xs">
              <span className="text-slate-500 block">Total Solicitudes</span>
              <strong className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {stats?.totalRequests || 0}
              </strong>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-xs">
              <span className="text-slate-500 block">Foco #1 de Demanda</span>
              <strong className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {stats?.topZoneName || 'Centro'} ({stats?.topZoneCount || 0})
              </strong>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-xs">
              <span className="text-slate-500 block">Oficio Más Solicitado</span>
              <strong className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {stats?.mostRequestedRubro || 'General'}
              </strong>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            {/* Rubro Selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-1.5 border border-slate-200/80 dark:border-slate-700 text-xs">
              <Filter size={14} className="text-slate-400" />
              <label htmlFor="heat-map-rubro-select" className="text-slate-500 font-medium">Rubro:</label>
              <select
                id="heat-map-rubro-select"
                aria-label="Filtrar por rubro en mapa de calor"
                value={selectedRubro}
                onChange={(e) => setSelectedRubro(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="todos">Todos los oficios</option>
                {PROFESSIONS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 text-xs">
              <button
                onClick={() => setTimeframe(0)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${timeframe === 0 ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
              >
                Histórico
              </button>
              <button
                onClick={() => setTimeframe(30)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${timeframe === 30 ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
              >
                Últimos 30 días
              </button>
              <button
                onClick={() => setTimeframe(7)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${timeframe === 7 ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
              >
                Últimos 7 días
              </button>
            </div>

            {/* View Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 text-xs">
              <button
                onClick={() => setViewMode('calor')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${viewMode === 'calor' ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs' : 'text-slate-500'}`}
              >
                🔥 Mapa Térmico
              </button>
              <button
                onClick={() => setViewMode('cobertura')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${viewMode === 'cobertura' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
              >
                🎯 Oportunidad / Cobertura
              </button>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-2 py-1 border border-slate-200/80 dark:border-slate-700 text-xs">
              <Layers size={13} className="text-slate-400 mr-1.5" />
              <button
                onClick={() => setMapTheme('voyager')}
                className={`px-2 py-0.5 rounded-md ${mapTheme === 'voyager' ? 'font-bold text-indigo-600' : 'text-slate-500'}`}
              >
                Claro
              </button>
              <button
                onClick={() => setMapTheme('dark')}
                className={`px-2 py-0.5 rounded-md ${mapTheme === 'dark' ? 'font-bold text-indigo-600' : 'text-slate-500'}`}
              >
                Oscuro
              </button>
              <button
                onClick={() => setMapTheme('osm')}
                className={`px-2 py-0.5 rounded-md ${mapTheme === 'osm' ? 'font-bold text-indigo-600' : 'text-slate-500'}`}
              >
                Calles
              </button>
            </div>

            <button
              onClick={resetMapCenter}
              title="Recentrar en Bahía Blanca"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Body with Side Inspection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 relative">
        {/* Map Container */}
        <div className="lg:col-span-3 relative h-[520px] w-full bg-slate-100 dark:bg-slate-900">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700 max-w-xs text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
              Escala de Intensidad Térmica
            </span>
            <div className="h-2 rounded-full w-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-rose-600 mb-2" />
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
              <span>Baja (0-20%)</span>
              <span>Media</span>
              <span>Alta</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">Crítica (75%+)</span>
            </div>
            {viewMode === 'cobertura' && (
              <p className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                🔴 Rojo en Cobertura = Demanda sin profesionales registrados en la zona.
              </p>
            )}
          </div>

          {loading && (
            <div className="absolute inset-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-200 dark:border-slate-700">
                <Flame className="text-orange-500 animate-spin" size={20} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Calculando focos de demanda en Bahía Blanca...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Zone Inspector & Top Ranking */}
        <div className="p-5 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between max-h-[520px] overflow-y-auto custom-scrollbar">
          <div>
            {/* Active Zone Detail Card */}
            {activeZone ? (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Zona Inspeccionada
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${activeZone.color}20`,
                      color: activeZone.color
                    }}
                  >
                    {activeZone.level.toUpperCase()}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-600" />
                  {activeZone.name}
                </h4>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                    <span className="text-slate-500 block text-[11px]">Solicitudes</span>
                    <strong className="text-base text-slate-900 dark:text-white font-bold">
                      {activeZone.requestCount}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                    <span className="text-slate-500 block text-[11px]">Profesionales</span>
                    <strong className="text-base text-slate-900 dark:text-white font-bold">
                      {activeZone.professionalsCount}
                    </strong>
                  </div>
                </div>

                {/* Rubros Breakdown */}
                {activeZone.topRubros.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-2">
                      Oficios más demandados aquí:
                    </span>
                    <div className="space-y-1.5">
                      {activeZone.topRubros.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                            {r.rubro}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {r.count} <span className="text-slate-400 text-[10px]">({r.percentage}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Coverage insight */}
                <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-[11px]">
                  {activeZone.professionalsCount === 0 ? (
                    <span className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                      <AlertCircle size={14} />
                      ¡Oportunidad! Zona sin profesionales asignados.
                    </span>
                  ) : (
                    <span>
                      Promedio de <strong>{activeZone.coverageRatio}</strong> solicitudes por profesional activo en el barrio.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 text-center text-xs text-slate-400 mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                Selecciona una zona en el mapa para ver sus detalles.
              </div>
            )}

            {/* Quick Ranking List */}
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Ranking de Zonas de Bahía
            </span>
            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
              {stats?.zones.slice(0, 8).map((z, idx) => (
                <button
                  key={z.name}
                  onClick={() => focusZone(z)}
                  className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between text-xs ${activeZone?.name === z.name ? 'bg-indigo-600 text-white font-bold' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${activeZone?.name === z.name ? 'bg-white text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'}`}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{z.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] opacity-80">{z.requestCount} sol.</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: z.color }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/80 text-[10px] text-slate-400">
            Los datos se sincronizan con las solicitudes abiertas y presupuestos en Bahía Blanca.
          </div>
        </div>
      </div>
    </div>
  );
};
