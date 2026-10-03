import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Info, 
  DollarSign, 
  Share2, 
  MapPin, 
  MessageCircle, 
  ShieldCheck, 
  Wrench, 
  HelpCircle,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CostItem {
  id: string;
  rubro: string;
  titulo: string;
  descripcion: string;
  minPrice: number;
  maxPrice: number;
  unidad: string;
  tiempoEstimado: string;
  incluye: string;
  noIncluye: string;
  consejoBahia: string;
}

const COST_ITEMS: CostItem[] = [
  // Pintura
  {
    id: 'pintura-habitacion-4x4',
    rubro: 'Pintor',
    titulo: 'Pintar habitación 4x4m (Paredes y Cielorraso)',
    descripcion: 'Lijado superficial, enduido básico en microfisuras y 2 manos de látex interior de primera calidad.',
    minPrice: 65000,
    maxPrice: 95000,
    unidad: 'por habitación',
    tiempoEstimado: '1 a 2 días',
    incluye: 'Mano de obra especializada, protección de zócalos y pisos, limpieza final básica.',
    noIncluye: 'Látex, enduido, fijador ni cintas de enmascarar.',
    consejoBahia: 'En Bahía Blanca por la humedad marina y el polvo del viento, conviene aplicar fijador al agua antes de pintar para que el látex rinda mejor.'
  },
  {
    id: 'pintura-m2-interior',
    rubro: 'Pintor',
    titulo: 'Pintura látex interior por m²',
    descripcion: 'Preparación de pared, enduido puntual y 2 manos de látex lavable.',
    minPrice: 3200,
    maxPrice: 4800,
    unidad: 'por m²',
    tiempoEstimado: 'Según metraje',
    incluye: 'Mano de obra de aplicación a rodillo y pincel.',
    noIncluye: 'Pintura ni andamios en doble altura.',
    consejoBahia: 'Si la pared tiene manchas de salitre o humedad de cimientos, consultá por tratamiento previo antidescascaramiento.'
  },
  // Plomería y Gas
  {
    id: 'instalar-termotanque',
    rubro: 'Plomero',
    titulo: 'Instalar o reemplazar termotanque / calefón',
    descripcion: 'Desconexión de artefacto viejo, anclaje a pared o apoyo, conexión de agua fría/caliente y gas con prueba.',
    minPrice: 48000,
    maxPrice: 78000,
    unidad: 'por artefacto',
    tiempoEstimado: '3 a 5 horas',
    incluye: 'Mano de obra de plomería, termofusión o roscado reglamentario y prueba de encendido.',
    noIncluye: 'Termotanque, flexibles mallados, caños de ventilación ni válvula de alivio.',
    consejoBahia: 'El agua de Bahía Blanca es dura y suele acumular sarro en la serpentina o ánodo de magnesio; pedile al plomero revisar el ánodo una vez al año.'
  },
  {
    id: 'colocacion-sanitarios',
    rubro: 'Plomero',
    titulo: 'Colocación de juego de sanitarios (Inodoro + Bidet)',
    descripcion: 'Montaje de inodoro con fuelle cloacal hermético, fijación con tarugos y conexión de bidet con grifería.',
    minPrice: 38000,
    maxPrice: 60000,
    unidad: 'por juego completo',
    tiempoEstimado: '3 a 4 horas',
    incluye: 'Fijación, sellado perimetral con silicona antihongos y regulación de boya/mochila.',
    noIncluye: 'Sanitarios, grifería, flexibles ni fuelle.',
    consejoBahia: 'Asegurate de que utilicen silicona neutra de buena calidad para evitar filtraciones hacia el piso inferior en edificios de Bahía.'
  },
  {
    id: 'destape-cloacal',
    rubro: 'Plomero',
    titulo: 'Destape de cañerías o desagüe de cocina/baño',
    descripcion: 'Desobstrucción mecánica con cinta de acero o máquina desobstructora en cámaras, piletas de patio o sifones.',
    minPrice: 32000,
    maxPrice: 55000,
    unidad: 'por servicio',
    tiempoEstimado: '1 a 2 horas',
    incluye: 'Mano de obra y equipamiento de desobstrucción.',
    noIncluye: 'Reparación de caño roto si estuviese colapsado bajo tierra.',
    consejoBahia: 'En zonas céntricas y macrocentro con cañerías antiguas de plomo o fundición, es clave avisar al profesional antes de aplicar presión extrema.'
  },
  // Gas y Camuzzi
  {
    id: 'prueba-hermeticidad-gas',
    rubro: 'Gasista',
    titulo: 'Prueba de hermeticidad de gas (Gasista Matriculado)',
    descripcion: 'Revisión con manómetro de columna de agua para descartar pérdidas antes de inspección de Camuzzi.',
    minPrice: 55000,
    maxPrice: 90000,
    unidad: 'por instalación',
    tiempoEstimado: '2 a 3 horas',
    incluye: 'Manómetro calibrado, presurización de cañería y detección de microfugas con solución jabonosa.',
    noIncluye: 'Trámites de reapertura ni reposición de caños embutidos.',
    consejoBahia: 'Exigí siempre la credencial vigente de matrícula Camuzzi Gas del Sur. En Bahía Oficios los perfiles verificados tienen sello oficial.'
  },
  // Electricidad
  {
    id: 'instalacion-boca-luz',
    rubro: 'Electricista',
    titulo: 'Instalación de boca de luz o tomacorriente nuevo',
    descripcion: 'Pasaje de conductores normalizados (IRAM), conexión a circuito existente, colocación de bastidor y tapa.',
    minPrice: 15000,
    maxPrice: 24000,
    unidad: 'por boca',
    tiempoEstimado: '1 a 2 horas',
    incluye: 'Mano de obra de cableado, empalmes aislados y armado de módulo.',
    noIncluye: 'Cables, caño corrugado, llaves de punto ni bastidores.',
    consejoBahia: 'Verificá que la sección del cable sea de al menos 2.5 mm² para tomas de uso general en cumplimiento con normativa municipal.'
  },
  {
    id: 'recambio-tablero-electrico',
    rubro: 'Electricista',
    titulo: 'Armado o recambio de tablero eléctrico (Disyuntor + Térmicas)',
    descripcion: 'Reemplazo de tapones o térmicas viejas por disyuntor diferencial de 30mA y llaves termomagnéticas por circuito.',
    minPrice: 52000,
    maxPrice: 85000,
    unidad: 'por tablero',
    tiempoEstimado: 'Medio día',
    incluye: 'Fijación de riel DIN, peines de conexión segura, rotulado de circuitos y prueba del botón de test del disyuntor.',
    noIncluye: 'Caja estanca, disyuntor ni térmicas.',
    consejoBahia: 'Por las fluctuaciones de tensión frecuentes en días de viento en Bahía Blanca, se recomienda agregar un protector de alta y baja tensión.'
  },
  // Aire Acondicionado
  {
    id: 'instalacion-split-3000',
    rubro: 'Aire Acondicionado',
    titulo: 'Instalación de aire acondicionado Split (hasta 3000 fg)',
    descripcion: 'Montaje de unidad interior y exterior, perforación de pared, aislación, presurización y vacío con bomba.',
    minPrice: 85000,
    maxPrice: 130000,
    unidad: 'por equipo',
    tiempoEstimado: '3 a 4 horas',
    incluye: 'Mano de obra, abocardado de caños, vacío con bomba reglamentaria y prueba de drenaje.',
    noIncluye: 'Ménsulas, kit de caños de cobre, cables tipo taller ni instalación eléctrica dedicada.',
    consejoBahia: 'El vacío con bomba es obligatorio para no perder la garantía del fabricante y evitar que la humedad costera de Bahía queme el compresor.'
  },
  // Albañilería y Durlock
  {
    id: 'colocacion-ceramico-m2',
    rubro: 'Albañil',
    titulo: 'Colocación de cerámicos o porcelanato por m²',
    descripcion: 'Preparación de carpeta, aplicación de pegamento impermeable con llana dentada, nivelación y pastinado.',
    minPrice: 12500,
    maxPrice: 19000,
    unidad: 'por m²',
    tiempoEstimado: 'Según metraje',
    incluye: 'Colocación y pastinado de juntas.',
    noIncluye: 'Cerámicos, pegamento impermeable (Klaukol o similar) ni pastina.',
    consejoBahia: 'Calculá siempre comprar entre un 10% y 15% extra de cajas de cerámico en corralones de Bahía Blanca para recortes y zócalos.'
  },
  {
    id: 'tabique-durlock-m2',
    rubro: 'Albañil',
    titulo: 'Tabique divisorio de Durlock con aislación por m²',
    descripcion: 'Estructura metálica de soleras y montantes de 70mm, lana de vidrio acústica, doble placa de yeso y masillado.',
    minPrice: 16000,
    maxPrice: 26000,
    unidad: 'por m²',
    tiempoEstimado: '1 a 2 días',
    incluye: 'Armado de estructura, colocación de aislación, emplacado y tomado de juntas con cinta tramada.',
    noIncluye: 'Perfiles, placas de yeso, lana de vidrio ni pintura.',
    consejoBahia: 'Ideal para dividir ambientes en departamentos o locales comerciales del centro de Bahía sin sobrecargar la estructura.'
  },
  // Cerrajería
  {
    id: 'apertura-puerta-urgencia',
    rubro: 'Cerrajero',
    titulo: 'Apertura de puerta trabada / olvido de llave',
    descripcion: 'Apertura técnica sin daño de marco ni rotura innecesaria de cerradura en horario comercial diurno.',
    minPrice: 28000,
    maxPrice: 48000,
    unidad: 'por servicio',
    tiempoEstimado: '30 a 50 minutos',
    incluye: 'Desplazamiento en radio urbano de Bahía Blanca y maniobra de ganzúa/apertura.',
    noIncluye: 'Cerradura nueva si el tambor interno estaba destruido.',
    consejoBahia: 'En servicios nocturnos o feriados puede aplicarse un adicional de guardia nocturna.'
  },
  // Techos y Zinguería
  {
    id: 'reparacion-goteras-techo',
    rubro: 'Techista',
    titulo: 'Reparación de goteras y filtraciones en techo',
    descripcion: 'Revisión en altura, ajuste de tornillos autoperforantes, sellado de uniones con membrana asfáltica o poliuretano.',
    minPrice: 40000,
    maxPrice: 75000,
    unidad: 'por sector',
    tiempoEstimado: 'Medio día',
    incluye: 'Mano de obra con arnés de seguridad en altura y sellado de puntos críticos.',
    noIncluye: 'Chapas nuevas, membrana en rollo ni babetas de zinguería.',
    consejoBahia: 'Los temporales de viento sur en Bahía Blanca aflojan clavadores y zinguerías; se aconseja una revisión anual antes del invierno.'
  }
];

export const CalculadoraCostosManoObra: React.FC = () => {
  const [selectedRubro, setSelectedRubro] = useState<string>('Todos');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [copiedShare, setCopiedShare] = useState(false);

  const rubrosList = useMemo(() => {
    const set = new Set(COST_ITEMS.map(i => i.rubro));
    return ['Todos', ...Array.from(set)];
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedRubro === 'Todos') return COST_ITEMS;
    return COST_ITEMS.filter(i => i.rubro === selectedRubro);
  }, [selectedRubro]);

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 1;
      }
      return copy;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const totals = useMemo(() => {
    let min = 0;
    let max = 0;
    let count = 0;

    Object.entries(selectedItems).forEach(([id, qty]) => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (item) {
        min += item.minPrice * qty;
        max += item.maxPrice * qty;
        count += qty;
      }
    });

    return { min, max, count };
  }, [selectedItems]);

  const handleShareWhatsApp = () => {
    if (totals.count === 0) return;

    const listLines = Object.entries(selectedItems).map(([id, qty]) => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (!item) return '';
      return `• ${item.titulo} (x${qty}): $${(item.minPrice * qty).toLocaleString('es-AR')} - $${(item.maxPrice * qty).toLocaleString('es-AR')}`;
    }).filter(Boolean).join('\n');

    const message = `📊 *Estimación de Mano de Obra en Bahía Blanca (Bahía Oficios)*\n\n${listLines}\n\n💰 *Total orientativo:* $${totals.min.toLocaleString('es-AR')} a $${totals.max.toLocaleString('es-AR')} ARS\n\nPodés pedir presupuestos exactos sin cargo acá:\n${window.location.origin}/trabajos?crear=true`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold mb-3 shadow-2xs">
          <Calculator size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Herramienta Orientativa Vecinal • Bahía Blanca</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Calculadora de Costos de Mano de Obra
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Elegí los trabajos que necesitás hacer en tu casa (pintar habitación, instalar termotanque, colocar aire o arreglar tablero) y obtené un <strong>rango de precio promedio orientativo</strong> en Bahía Blanca antes de pedir presupuesto.
        </p>
      </div>

      {/* Selector de Rubros */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {rubrosList.map(rubro => (
          <button
            key={rubro}
            type="button"
            onClick={() => setSelectedRubro(rubro)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              selectedRubro === rubro
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            {rubro}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Lista de Trabajos y Costos */}
        <div className="lg:col-span-2 space-y-4">
          {filteredItems.map(item => {
            const isSelected = Boolean(selectedItems[item.id]);
            const quantity = selectedItems[item.id] || 1;

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.rubro}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ⏱️ {item.tiempoEstimado}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {item.titulo}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.descripcion}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                      ${item.minPrice.toLocaleString('es-AR')} - ${item.maxPrice.toLocaleString('es-AR')}
                    </div>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      {item.unidad}
                    </span>
                  </div>
                </div>

                {/* Detalles de lo que incluye y consejo local */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Incluye:</strong> {item.incluye}
                  </div>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">No incluye:</strong> {item.noIncluye}
                  </div>
                </div>

                {/* Consejo específico para Bahía Blanca */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Info size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Tip Bahía:</strong> {item.consejoBahia}</span>
                </div>

                {/* Control de Selección y Cantidad */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>{isSelected ? 'Seleccionado en tu cálculo' : 'Sumar a mi cálculo'}</span>
                  </button>

                  {isSelected && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Cantidad:</span>
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-900 dark:text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen Lateral Fijo / Sticky */}
        <div className="lg:col-span-1 sticky top-24 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Tu Presupuesto Estimado</h3>
              </div>
              {totals.count > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems({})}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                  title="Limpiar cálculo"
                >
                  <RotateCcw size={11} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {totals.count === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-400">
                <Sparkles size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs">
                  Hacé clic en los trabajos de la izquierda para sumar tareas a tu cálculo orientativo.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">
                    {totals.count} {totals.count === 1 ? 'tarea seleccionada' : 'tareas seleccionadas'}:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {Object.entries(selectedItems).map(([id, qty]) => {
                      const item = COST_ITEMS.find(i => i.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-700/40">
                          <span className="truncate pr-2 text-slate-700 dark:text-slate-300">
                            {qty > 1 ? `(${qty}x) ` : ''}{item.titulo}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white shrink-0">
                            ${(item.minPrice * qty).toLocaleString('es-AR')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                    Rango Promedio Bahía Blanca:
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                    ${totals.min.toLocaleString('es-AR')} - ${totals.max.toLocaleString('es-AR')}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    *Mano de obra estimada sin materiales. Varía según accesibilidad y urgencia.
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <Link
                    to="/trabajos?crear=true"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center"
                  >
                    <span>Pedir Presupuesto a Profesionales</span>
                    <ArrowRight size={15} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    <span>Compartir este cálculo por WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Precios promedio relevados en Bahía Blanca</span>
              </p>
              <p className="flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-500 shrink-0" />
                <span>Sin comisiones ni recargos en Bahía Oficios</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
