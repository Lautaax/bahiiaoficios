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
  RotateCcw,
  FileText,
  Package,
  Layers,
  Trash2,
  Edit3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ContratoPresupuestoModal } from './ContratoPresupuestoModal';
import { PROFESSIONS } from '../constants';

interface CostItem {
  id: string;
  rubro: string;
  titulo: string;
  descripcion: string;
  minPrice: number;       // Mano de obra mínima
  maxPrice: number;       // Mano de obra máxima
  minMateriales: number;  // Materiales estimados mínimos
  maxMateriales: number;  // Materiales estimados máximos
  unidad: string;
  tiempoEstimado: string;
  incluye: string;
  noIncluye: string;
  consejoBahia: string;
}

interface CustomItemRow {
  id: string;
  descripcion: string;
  manoObra: number;
  materiales: number;
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
    minMateriales: 38000,
    maxMateriales: 62000,
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
    minMateriales: 2200,
    maxMateriales: 3800,
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
    minMateriales: 28000,
    maxMateriales: 48000,
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
    minMateriales: 24000,
    maxMateriales: 42000,
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
    minMateriales: 0,
    maxMateriales: 6000,
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
    minMateriales: 0,
    maxMateriales: 8000,
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
    minMateriales: 9000,
    maxMateriales: 17000,
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
    minMateriales: 68000,
    maxMateriales: 115000,
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
    minMateriales: 58000,
    maxMateriales: 98000,
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
    minMateriales: 15000,
    maxMateriales: 27000,
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
    minMateriales: 19000,
    maxMateriales: 32000,
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
    minMateriales: 0,
    maxMateriales: 10000,
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
    minMateriales: 32000,
    maxMateriales: 65000,
    unidad: 'por sector',
    tiempoEstimado: 'Medio día',
    incluye: 'Mano de obra con arnés de seguridad en altura y sellado de puntos críticos.',
    noIncluye: 'Chapas nuevas, membrana en rollo ni babetas de zinguería.',
    consejoBahia: 'Los temporales de viento sur en Bahía Blanca aflojan clavadores y zinguerías; se aconseja una revisión anual antes del invierno.'
  }
];

export const CalculadoraCostosManoObra: React.FC = () => {
  // Modo de uso: Catálogo de Trabajos de Bahía o Presupuestador Rápido / Personalizado
  const [activeTab, setActiveTab] = useState<'catalogo' | 'personalizado'>('catalogo');
  const [selectedRubro, setSelectedRubro] = useState<string>('Todos');
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [includeMaterials, setIncludeMaterials] = useState<boolean>(true);

  // Entradas directas / Reactivas para presupuestar (Permiten al usuario ingresar sus propios valores)
  const [manualManoObra, setManualManoObra] = useState<string>('');
  const [manualMateriales, setManualMateriales] = useState<string>('');
  const [manualSena, setManualSena] = useState<string>('');
  const [customJobTitle, setCustomJobTitle] = useState<string>('');
  const [customRubro, setCustomRubro] = useState<string>('Plomero');
  const [customDescription, setCustomDescription] = useState<string>('');

  // Renglones adicionales en el presupuestador personalizado
  const [extraRows, setExtraRows] = useState<CustomItemRow[]>([]);
  const [newRowDesc, setNewRowDesc] = useState('');
  const [newRowMo, setNewRowMo] = useState('');
  const [newRowMat, setNewRowMat] = useState('');

  const [showContractModal, setShowContractModal] = useState(false);

  // Lista de rubros disponibles para filtrar
  const rubrosList = useMemo(() => {
    const set = new Set(COST_ITEMS.map(i => i.rubro));
    return ['Todos', ...Array.from(set)];
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedRubro === 'Todos') return COST_ITEMS;
    return COST_ITEMS.filter(i => i.rubro === selectedRubro);
  }, [selectedRubro]);

  // Selección y deselección de ítems del catálogo
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
      const next = Math.max(1, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const setItemExactQuantity = (id: string, qty: number) => {
    const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
    setSelectedItems(prev => ({
      ...prev,
      [id]: validQty
    }));
  };

  // Agregar renglón personalizado adicional
  const handleAddExtraRow = () => {
    if (!newRowDesc.trim()) return;
    const mo = parseFloat(newRowMo) || 0;
    const mat = parseFloat(newRowMat) || 0;
    setExtraRows(prev => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        descripcion: newRowDesc.trim(),
        manoObra: mo,
        materiales: mat
      }
    ]);
    setNewRowDesc('');
    setNewRowMo('');
    setNewRowMat('');
  };

  const handleRemoveExtraRow = (id: string) => {
    setExtraRows(prev => prev.filter(r => r.id !== id));
  };

  // Cálculo robusto, reactivo e individualizado de Mano de Obra y Materiales
  const calculation = useMemo(() => {
    let baseMoMin = 0;
    let baseMoMax = 0;
    let baseMatMin = 0;
    let baseMatMax = 0;
    let itemsCount = 0;

    // Sumatoria de ítems del catálogo seleccionados
    Object.entries(selectedItems).forEach(([id, qty]) => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (item) {
        baseMoMin += item.minPrice * qty;
        baseMoMax += item.maxPrice * qty;
        baseMatMin += item.minMateriales * qty;
        baseMatMax += item.maxMateriales * qty;
        itemsCount += qty;
      }
    });

    // Sumatoria de renglones adicionales personalizados
    extraRows.forEach(row => {
      baseMoMin += row.manoObra;
      baseMoMax += row.manoObra;
      baseMatMin += row.materiales;
      baseMatMax += row.materiales;
      itemsCount += 1;
    });

    const baseMoPromedio = Math.round((baseMoMin + baseMoMax) / 2);
    const baseMatPromedio = Math.round((baseMatMin + baseMatMax) / 2);

    // Si el usuario ingresó manualmente montos en los campos de entrada, tienen prioridad reactiva
    const finalManoObra = manualManoObra !== ''
      ? (parseFloat(manualManoObra) || 0)
      : baseMoPromedio;

    const finalMateriales = manualMateriales !== ''
      ? (parseFloat(manualMateriales) || 0)
      : (includeMaterials ? baseMatPromedio : 0);

    const totalCalculado = finalManoObra + finalMateriales;

    // Seña / Anticipo calculada o ingresada
    const finalSena = manualSena !== ''
      ? (parseFloat(manualSena) || 0)
      : Math.round(totalCalculado * 0.3); // Sugerido 30%

    const finalSaldo = Math.max(0, totalCalculado - finalSena);

    return {
      baseMoMin,
      baseMoMax,
      baseMoPromedio,
      baseMatMin,
      baseMatMax,
      baseMatPromedio,
      finalManoObra,
      finalMateriales,
      totalCalculado,
      finalSena,
      finalSaldo,
      itemsCount
    };
  }, [selectedItems, extraRows, manualManoObra, manualMateriales, manualSena, includeMaterials]);

  // Rubro dominante para prellenar solicitudes o presupuestos
  const dominantRubro = useMemo(() => {
    if (activeTab === 'personalizado') {
      return customRubro;
    }
    const counts: Record<string, number> = {};
    Object.keys(selectedItems).forEach(id => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (item) counts[item.rubro] = (counts[item.rubro] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : (selectedRubro !== 'Todos' ? selectedRubro : 'Plomero');
  }, [selectedItems, selectedRubro, activeTab, customRubro]);

  // Resumen textual de las tareas acordadas
  const tasksSummary = useMemo(() => {
    const catalogParts = Object.entries(selectedItems).map(([id, qty]) => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (!item) return '';
      return `${item.titulo}${qty > 1 ? ` (x${qty})` : ''}`;
    }).filter(Boolean);

    const extraParts = extraRows.map(r => r.descripcion);
    const all = [...catalogParts, ...extraParts];

    if (all.length > 0) return all.join(', ');
    if (customJobTitle.trim()) return customJobTitle.trim();
    return 'Servicio de Mano de Obra y Materiales';
  }, [selectedItems, extraRows, customJobTitle]);

  // Enlace directo a formulario de presupuestos de la comunidad
  const quoteRequestUrl = useMemo(() => {
    const desc = tasksSummary 
      ? `Presupuesto calculado en Bahía Oficios:\n• Tareas: ${tasksSummary}\n• Mano de Obra: $${calculation.finalManoObra.toLocaleString('es-AR')}\n• Materiales estimados: $${calculation.finalMateriales.toLocaleString('es-AR')}\n• TOTAL: $${calculation.totalCalculado.toLocaleString('es-AR')}`
      : 'Presupuesto de mano de obra y materiales en Bahía Blanca';
    return `/solicitar-presupuesto?rubro=${encodeURIComponent(dominantRubro)}&descripcion=${encodeURIComponent(desc)}`;
  }, [dominantRubro, tasksSummary, calculation]);

  // Compartir presupuesto discriminado por WhatsApp
  const handleShareWhatsApp = () => {
    if (calculation.totalCalculado === 0 && calculation.itemsCount === 0) return;

    const listLines: string[] = [];

    Object.entries(selectedItems).forEach(([id, qty]) => {
      const item = COST_ITEMS.find(i => i.id === id);
      if (item) {
        listLines.push(`• ${item.titulo} (x${qty}) - M.O: $${(item.minPrice * qty).toLocaleString('es-AR')}`);
      }
    });

    extraRows.forEach(r => {
      listLines.push(`• ${r.descripcion} - M.O: $${r.manoObra.toLocaleString('es-AR')} | Mat: $${r.materiales.toLocaleString('es-AR')}`);
    });

    const message = `📊 *PRESUPUESTO DISCRIMINADO • BAHÍA OFICIOS*
📍 *Bahía Blanca*
📋 *Rubro:* ${dominantRubro}
📝 *Tareas:* ${tasksSummary}

${listLines.length > 0 ? listLines.join('\n') + '\n\n' : ''}🛠️ *Costo Mano de Obra:* $${calculation.finalManoObra.toLocaleString('es-AR')}
🧱 *Costo Materiales:* $${calculation.finalMateriales.toLocaleString('es-AR')}
💰 *TOTAL PRESUPUESTADO:* $${calculation.totalCalculado.toLocaleString('es-AR')}

💵 *Seña acordada (30%):* $${calculation.finalSena.toLocaleString('es-AR')}
💳 *Saldo contra entrega:* $${calculation.finalSaldo.toLocaleString('es-AR')}

📄 *Podés pedir presupuestos sin cargo o generar tu contrato PDF en:*
${window.location.origin}/calculadora-costos`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Accesos rápidos de Seña
  const applyQuickSena = (pct: number) => {
    if (calculation.totalCalculado > 0) {
      setManualSena(String(Math.round((calculation.totalCalculado * pct) / 100)));
    }
  };

  const handleReset = () => {
    setSelectedItems({});
    setExtraRows([]);
    setManualManoObra('');
    setManualMateriales('');
    setManualSena('');
    setCustomJobTitle('');
    setCustomDescription('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold mb-3 shadow-2xs">
          <Calculator size={14} className="text-indigo-600 dark:text-indigo-400" />
          <span>Calculadora y Presupuestador Oficial • Bahía Blanca</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Calculadora de Costos y Presupuestador de Trabajos
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Calculá los costos orientativos de tu obra en Bahía Blanca con precios actualizados de referencia o armá tu <strong>presupuesto separando mano de obra y materiales</strong> para exportar en PDF o compartir por WhatsApp.
        </p>

        {/* Pestañas: Catálogo vs Presupuestador Directo */}
        <div className="mt-6 inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'catalogo'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={16} />
            <span>Catálogo con Precios Guía</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personalizado')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'personalizado'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 size={16} />
            <span>Presupuestador Libre (Ingresar Valores)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* COLUMNA PRINCIPAL (TAB 1 o TAB 2) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'catalogo' ? (
            <>
              {/* Selector de Rubros */}
              <div className="flex flex-wrap items-center gap-2 pb-2">
                {rubrosList.map(rubro => (
                  <button
                    key={rubro}
                    type="button"
                    onClick={() => setSelectedRubro(rubro)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedRubro === rubro
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    {rubro}
                  </button>
                ))}
              </div>

              {/* Lista de Trabajos y Costos con Separación de M.O. y Materiales */}
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const isSelected = Boolean(selectedItems[item.id]);
                  const quantity = selectedItems[item.id] || 1;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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

                        {/* Discriminación de Precios de Mano de Obra y Materiales */}
                        <div className="sm:text-right shrink-0 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Mano de Obra ({item.unidad}):
                          </div>
                          <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
                            ${item.minPrice.toLocaleString('es-AR')} - ${item.maxPrice.toLocaleString('es-AR')}
                          </div>
                          {item.minMateriales > 0 && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold pt-0.5 border-t border-slate-200 dark:border-slate-700">
                              🧱 Mat. est.: ${item.minMateriales.toLocaleString('es-AR')} - ${item.maxMateriales.toLocaleString('es-AR')}
                            </div>
                          )}
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

                      {/* Control de Selección y Cantidad (Sin límite artificial de 20) */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                            <span className="text-xs text-slate-500 font-medium">Cantidad ({item.unidad}):</span>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                                aria-label="Disminuir cantidad"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="999"
                                value={quantity}
                                onChange={(e) => setItemExactQuantity(item.id, parseInt(e.target.value, 10))}
                                className="w-12 text-center text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
                                aria-label="Aumentar cantidad"
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
            </>
          ) : (
            /* TAB 2: PRESUPUESTADOR RÁPIDO Y LIBRE CON SEPARACIÓN DE MANO DE OBRA Y MATERIALES */
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-indigo-600" />
                  Presupuestador Personalizado
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ingresá directamente el valor de mano de obra y de materiales acordado para tu trabajo. Los totales se calculan en vivo al instante.
                </p>
              </div>

              {/* Datos Generales del Trabajo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="custom-job-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descripción o Título del Trabajo:
                  </label>
                  <input
                    id="custom-job-title"
                    type="text"
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    placeholder="Ej: Cambio de cañería termofusión y griferías de baño"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="custom-rubro-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rubro / Especialidad:
                  </label>
                  <select
                    id="custom-rubro-select"
                    value={customRubro}
                    onChange={(e) => setCustomRubro(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  >
                    {PROFESSIONS.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Renglones adicionales / Detalle de conceptos */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Sumar conceptos o materiales específicos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={newRowDesc}
                      onChange={(e) => setNewRowDesc(e.target.value)}
                      placeholder="Concepto (ej: Caños de 3/4 x 4m)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newRowMo}
                      onChange={(e) => setNewRowMo(e.target.value)}
                      placeholder="M.O. ($)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newRowMat}
                      onChange={(e) => setNewRowMat(e.target.value)}
                      placeholder="Material ($)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraRow}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {extraRows.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {extraRows.map(row => (
                      <div key={row.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {row.descripcion}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          {row.manoObra > 0 && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              M.O: ${row.manoObra.toLocaleString('es-AR')}
                            </span>
                          )}
                          {row.materiales > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              Mat: ${row.materiales.toLocaleString('es-AR')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraRow(row.id)}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA LATERAL: RESUMEN Y CÁLCULO REACTIVO DISCRIMINADO */}
        <div className="lg:col-span-1 sticky top-24 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Tu Presupuesto</h3>
              </div>
              {(calculation.itemsCount > 0 || manualManoObra || manualMateriales) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Limpiar cálculo"
                >
                  <RotateCcw size={11} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {/* Selector para incluir materiales */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-amber-500" />
                <label htmlFor="toggle-materiales" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Incluir Costo de Materiales
                </label>
              </div>
              <input
                id="toggle-materiales"
                type="checkbox"
                checked={includeMaterials}
                onChange={(e) => setIncludeMaterials(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Inputs reactivos para ajustar o ingresar Mano de Obra y Materiales */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="calc-mano-obra" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Wrench size={13} className="text-indigo-600" />
                    <span>Costo Mano de Obra ($):</span>
                  </label>
                  {calculation.baseMoPromedio > 0 && !manualManoObra && (
                    <span className="text-[10px] text-indigo-500 font-semibold">
                      Guía: ~${calculation.baseMoPromedio.toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
                <input
                  id="calc-mano-obra"
                  type="number"
                  value={manualManoObra}
                  onChange={(e) => setManualManoObra(e.target.value)}
                  placeholder={calculation.baseMoPromedio > 0 ? String(calculation.baseMoPromedio) : 'Ej: 65000'}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {includeMaterials && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="calc-materiales" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Package size={13} className="text-amber-500" />
                      <span>Costo de Materiales ($):</span>
                    </label>
                    {calculation.baseMatPromedio > 0 && !manualMateriales && (
                      <span className="text-[10px] text-amber-500 font-semibold">
                        Guía: ~${calculation.baseMatPromedio.toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>
                  <input
                    id="calc-materiales"
                    type="number"
                    value={manualMateriales}
                    onChange={(e) => setManualMateriales(e.target.value)}
                    placeholder={calculation.baseMatPromedio > 0 ? String(calculation.baseMatPromedio) : 'Ej: 40000'}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Cuadro de Total Calculado */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Total Presupuestado (M.O. + Mat.):
                </span>
                <div className="text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-300">
                  ${calculation.totalCalculado.toLocaleString('es-AR')} ARS
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50">
                  <span>M.O: ${calculation.finalManoObra.toLocaleString('es-AR')}</span>
                  <span>Mat: ${calculation.finalMateriales.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Seña y Saldo Reactivos */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="calc-sena" className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Seña / Anticipo ($):
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyQuickSena(30)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-100 cursor-pointer"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickSena(50)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-100 cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualSena('0')}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-medium text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      0%
                    </button>
                  </div>
                </div>

                <input
                  id="calc-sena"
                  type="number"
                  value={manualSena}
                  onChange={(e) => setManualSena(e.target.value)}
                  placeholder={String(calculation.finalSena)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Saldo contra entrega:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    ${calculation.finalSaldo.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowContractModal(true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <FileText size={16} className="text-amber-300" />
                <span>Generar Contrato / Presupuesto PDF</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <MessageCircle size={15} />
                <span>Enviar Presupuesto por WhatsApp</span>
              </button>

              <Link
                to={quoteRequestUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all text-center"
              >
                <span>Pedir Presupuesto a Prestadores</span>
                <ArrowRight size={14} />
              </Link>
            </div>

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

      {/* Modal de Contrato y Recibo Oficial prellenado con los datos calculados */}
      <ContratoPresupuestoModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        initialJobTitle={tasksSummary ? `Presupuesto: ${tasksSummary.slice(0, 90)}` : 'Servicio de Mano de Obra y Materiales'}
        initialRubro={dominantRubro}
        initialManoObra={calculation.finalManoObra > 0 ? calculation.finalManoObra : undefined}
        initialMateriales={calculation.finalMateriales > 0 ? calculation.finalMateriales : undefined}
        initialAmount={calculation.totalCalculado > 0 ? calculation.totalCalculado : undefined}
      />
    </div>
  );
};
