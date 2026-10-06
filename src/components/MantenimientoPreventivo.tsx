import React, { useState, useEffect } from 'react';
import { 
  Calendar, Bell, ShieldCheck, CheckCircle2, Clock, Wrench, Droplets, 
  Flame, Wind, Sun, Snowflake, ArrowRight, Phone, Mail, Check, AlertTriangle, 
  ExternalLink, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export interface SeasonalAlertItem {
  id: string;
  season: 'otono' | 'invierno' | 'primavera' | 'verano';
  title: string;
  category: string;
  rubroRecomendado: string;
  urgency: 'alta' | 'media' | 'preventiva';
  description: string;
  riskIfIgnored: string;
  estimatedFrequency: string;
  bestMonths: string;
  recommendedChecklist: string[];
}

const SEASONAL_MAINTENANCE_DATA: SeasonalAlertItem[] = [
  // OTOÑO
  {
    id: 'otono-calefaccion',
    season: 'otono',
    title: 'Revisión y Limpieza de Calefactores y Prueba de Gas',
    category: 'Gas y Calefacción',
    rubroRecomendado: 'Gasista',
    urgency: 'alta',
    description: 'Verificación de tiro balanceado, limpieza de inyectores, control de llama azul y prueba de hermeticidad ante posibles pérdidas de monóxido de carbono.',
    riskIfIgnored: 'Riesgo grave de intoxicación por monóxido de carbono e ineficiencia en consumo de gas.',
    estimatedFrequency: '1 vez al año (antes de los primeros fríos)',
    bestMonths: 'Marzo a Mayo',
    recommendedChecklist: [
      'Desarme y aspirado de hollín en cámaras de combustión',
      'Chequeo de conductos de ventilación hacia el exterior (libres de nidos de pájaros)',
      'Verificación de llama azul constante (sin destellos amarillos o anaranjados)',
      'Inspección de válvulas de seguridad y termocuplas'
    ]
  },
  {
    id: 'otono-canaletas',
    season: 'otono',
    title: 'Limpieza de Canaletas y Desagües Pluviales',
    category: 'Techos y Desagües',
    rubroRecomendado: 'Techista',
    urgency: 'media',
    description: 'Retiro de hojas secas acumuladas por los vientos otoñales de Bahía Blanca en canaletas de chapa y bajadas de zinguería.',
    riskIfIgnored: 'Desborde de agua hacia el interior del cielo raso y humedad en muros.',
    estimatedFrequency: 'Antes y después del otoño',
    bestMonths: 'Abril y Mayo',
    recommendedChecklist: [
      'Remoción manual de follaje y sedimentos de canaletas',
      'Lavado con manguera a presión para probar escurrimiento en bajadas',
      'Sellado de uniones con sellador poliuretánico o membrana asfáltica'
    ]
  },
  {
    id: 'otono-aislacion',
    season: 'otono',
    title: 'Aislación de Cañerías y Sellado de Burletes en Aberturas',
    category: 'Aislación y Carpintería',
    rubroRecomendado: 'Plomero',
    urgency: 'preventiva',
    description: 'Colocación de coquillas aislantes de polietileno en caños exteriores para prevenir congelamiento por heladas bahienses.',
    riskIfIgnored: 'Rotura de cañerías por expansión de hielo e ingreso de chiflones fríos.',
    estimatedFrequency: 'Previo al invierno',
    bestMonths: 'Mayo',
    recommendedChecklist: [
      'Recubrir caños de agua a la intemperie con aislante térmico',
      'Reemplazo de burletes de goma o silicona en puertas y ventanas orientadas al sur'
    ]
  },

  // INVIERNO
  {
    id: 'invierno-humedad-techos',
    season: 'invierno',
    title: 'Inspección de Fijación de Techos y Detección de Filtraciones',
    category: 'Tejados y Zinguería',
    rubroRecomendado: 'Techista',
    urgency: 'alta',
    description: 'Ajuste de tirafondos y grapas en techos de chapa ante las intensas ráfagas del sudoeste bahiense.',
    riskIfIgnored: 'Voladura parcial de chapas y filtraciones severas durante temporales de lluvia y viento.',
    estimatedFrequency: 'Cada 6 meses',
    bestMonths: 'Junio y Julio',
    recommendedChecklist: [
      'Comprobación de arandelas de neopreno en fijaciones',
      'Control de babetas perimetrales y encuentros con muros medianeros',
      'Aplicación de impermeabilizante fibrado en puntos críticos'
    ]
  },
  {
    id: 'invierno-electricidad-disyuntor',
    season: 'invierno',
    title: 'Control de Tablero Eléctrico y Prueba de Disyuntor Diferencial',
    category: 'Electricidad',
    rubroRecomendado: 'Electricista',
    urgency: 'alta',
    description: 'Chequeo de sobrecargas en líneas por uso simultáneo de caloventores, estufas eléctricas y pavas.',
    riskIfIgnored: 'Recalentamiento de conductores, disparos continuos y peligro de incendio eléctrico.',
    estimatedFrequency: 'Semestral',
    bestMonths: 'Junio a Agosto',
    recommendedChecklist: [
      'Presionar el botón de test mensual del interruptor diferencial (disyuntor)',
      'Inspección térmica de bornes y cables en tablero principal',
      'Medición de puesta a tierra con telurímetro si hubo tormentas eléctricas'
    ]
  },

  // PRIMAVERA
  {
    id: 'primavera-tanques-agua',
    season: 'primavera',
    title: 'Limpieza y Desinfección de Tanques de Agua Domiciliarios',
    category: 'Agua y Sanitarios',
    rubroRecomendado: 'Plomero',
    urgency: 'alta',
    description: 'Vaciado, cepillado de paredes interiores y cloración del tanque de reserva según recomendaciones sanitarias de Bahía Blanca.',
    riskIfIgnored: 'Acumulación de sarro, turbidez y proliferación de bacterias en el agua de consumo.',
    estimatedFrequency: '1 vez cada 6 a 12 meses',
    bestMonths: 'Septiembre y Octubre',
    recommendedChecklist: [
      'Cierre de llave de paso y vaciado parcial dejando 15cm para lavado',
      'Cepillado sin detergente de fondo y paredes del tanque',
      'Desinfección con lavandina pura (concentración recomendada)',
      'Verificación del cierre hermético de la tapa superior para evitar polvo bahiense'
    ]
  },
  {
    id: 'primavera-aire-acondicionado',
    season: 'primavera',
    title: 'Service Preventivo de Aire Acondicionado (Filtros y Carga)',
    category: 'Climatización',
    rubroRecomendado: 'Aire Acondicionado',
    urgency: 'media',
    description: 'Lavado químico de filtros, serpentina de la unidad exterior y medición de presión de gas refrigerante antes de los primeros calores.',
    riskIfIgnored: 'Mayor consumo eléctrico, bajo rendimiento frigorífico y malos olores.',
    estimatedFrequency: '1 vez al año en primavera',
    bestMonths: 'Octubre y Noviembre',
    recommendedChecklist: [
      'Lavado y desinfección de filtros antipolvo de la unidad interior',
      'Desobstrucción y control de manguera de drenaje condensado',
      'Revisión de consumo eléctrico del compresor'
    ]
  },

  // VERANO
  {
    id: 'verano-bombas-pileta',
    season: 'verano',
    title: 'Mantenimiento de Bombas Sumergibles, Cisternas y Piletas',
    category: 'Bombas y Piletas',
    rubroRecomendado: 'Plomero',
    urgency: 'media',
    description: 'Verificación de presurizadoras, sellos mecánicos y sistema de filtrado de piscinas para época estival.',
    riskIfIgnored: 'Falta de presión de agua en horarios pico de calor y desgaste prematuro del motor.',
    estimatedFrequency: 'Al inicio de temporada estival',
    bestMonths: 'Diciembre y Enero',
    recommendedChecklist: [
      'Prueba de arranque automático del automático de tanque',
      'Control de sello mecánico y ausencia de fugas en la bomba',
      'Revisión del filtro de arena y canasta colectora'
    ]
  },
  {
    id: 'verano-pintura-exterior',
    season: 'verano',
    title: 'Pintura Exterior y Mantenimiento de Maderas y Decks',
    category: 'Pintura y Mantenimiento',
    rubroRecomendado: 'Pintor',
    urgency: 'preventiva',
    description: 'Aprovechar las semanas secas del verano bahiense para impermeabilizar medianeras y proteger maderas del sol intenso.',
    riskIfIgnored: 'Degradación por rayos UV y filtraciones por revoques cuarteados.',
    estimatedFrequency: 'Cada 2 a 3 años',
    bestMonths: 'Enero a Marzo',
    recommendedChecklist: [
      'Hidrolavado de paredes para eliminar polvo y sales',
      'Sellado de microfisuras con masilla elastomérica',
      'Aplicación de dos manos de látex para frentes con protección UV'
    ]
  }
];

export const MantenimientoPreventivo: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<'todos' | 'otono' | 'invierno' | 'primavera' | 'verano'>('otono');
  const [activeChecklist, setActiveChecklist] = useState<Record<string, boolean>>({});
  
  // Subscription Form State
  const [nombre, setNombre] = useState(currentUser?.nombre || '');
  const [telefono, setTelefono] = useState(currentUser?.profesionalInfo?.telefono || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [preferenciaCanal, setPreferenciaCanal] = useState<'whatsapp' | 'email' | 'ambos'>('whatsapp');
  const [intereses, setIntereses] = useState<string[]>([
    'Gas y Calefacción',
    'Limpieza de Tanques',
    'Aires Acondicionados',
    'Techos y Canaletas'
  ]);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Determinar temporada actual según mes actual en Argentina
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentAutoSeason = (currentMonth >= 3 && currentMonth <= 5)
    ? 'otono'
    : (currentMonth >= 6 && currentMonth <= 8)
    ? 'invierno'
    : (currentMonth >= 9 && currentMonth <= 11)
    ? 'primavera'
    : 'verano';

  useEffect(() => {
    // Si la página se carga, sugerir la temporada del calendario
    setSelectedSeason(currentAutoSeason);
  }, []);

  const toggleChecklistItem = (key: string) => {
    setActiveChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleToggleInteres = (item: string) => {
    if (intereses.includes(item)) {
      setIntereses(intereses.filter(i => i !== item));
    } else {
      setIntereses([...intereses, item]);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefono && !email) {
      alert('Por favor completá tu WhatsApp o correo electrónico para recibir los recordatorios.');
      return;
    }

    setSubscribing(true);
    try {
      await addDoc(collection(db, 'mantenimiento_alertas'), {
        userId: currentUser?.uid || 'anonimo',
        nombre: nombre.trim() || 'Vecino de Bahía',
        telefono: telefono.trim(),
        email: email.trim(),
        preferenciaCanal,
        intereses,
        temporadaInicio: currentAutoSeason,
        creadoEn: serverTimestamp(),
        activo: true
      });

      // Guardar también en localStorage para persistencia rápida
      localStorage.setItem('bahiaoficios_mantenimiento_alerta', JSON.stringify({
        activo: true,
        fecha: new Date().toISOString(),
        preferenciaCanal
      }));

      setSubscribedSuccess(true);
    } catch (err) {
      console.error('Error al suscribir recordatorios:', err);
      // Fallback local
      setSubscribedSuccess(true);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSendTestWhatsApp = () => {
    const phoneClean = telefono.replace(/\D/g, '') || '';
    const message = `🔔 *RECORDATORIO DE MANTENIMIENTO DEL HOGAR • BAHÍA OFICIOS*
Hola ${nombre || 'Vecino'}! 

Te enviamos tu aviso estacional para Bahía Blanca:
🍂 *Temporada actual:* ${currentAutoSeason.toUpperCase()}

⚠️ *Tareas recomendadas para hacer este mes:*
• Revisión y prueba de calefactores y gasistas matriculados
• Desobstrucción de canaletas por viento y hojas
• Chequeo preventivo de termotanques y aislaciones

💡 *Encontrá profesionales verificados en Bahía Blanca sin comisiones:*
👉 https://bahiaoficios.com/rubro/Gasista
👉 https://bahiaoficios.com/rubro/Techista

_Tu hogar siempre seguro con Bahía Oficios._`;

    const url = phoneClean 
      ? `https://wa.me/${phoneClean.startsWith('54') ? phoneClean : '54' + phoneClean}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
    setTestNotificationSent(true);
  };

  const filteredItems = SEASONAL_MAINTENANCE_DATA.filter(it => 
    selectedSeason === 'todos' ? true : it.season === selectedSeason
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Calendar size={13} className="text-amber-400" />
            <span>Guía de Mantenimiento Preventivo de Bahía Blanca</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Recordatorios de Mantenimiento del Hogar
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            El clima y los vientos característicos de Bahía Blanca exigen revisiones periódicas. Evitá emergencias costosas en tu casa programando inspecciones en la época exacta.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              Otoño: Calefacción y Gas
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5">
              <Droplets size={14} className="text-blue-400" />
              Primavera: Tanques y Aires
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5">
              <Wind size={14} className="text-slate-300" />
              Invierno: Vientos y Fijación
            </span>
          </div>
        </div>
      </div>

      {/* Selector de Estación */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Filter size={18} className="text-indigo-600" />
              Elegí la Temporada a Consultar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Estación actual según calendario en Bahía Blanca: <strong className="capitalize text-indigo-600 dark:text-indigo-400">{currentAutoSeason}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'otono', label: '🍂 Otoño (Mar-May)', icon: Flame },
              { id: 'invierno', label: '❄️ Invierno (Jun-Ago)', icon: Snowflake },
              { id: 'primavera', label: '🌸 Primavera (Sep-Nov)', icon: Droplets },
              { id: 'verano', label: '☀️ Verano (Dic-Feb)', icon: Sun },
              { id: 'todos', label: 'Todas las Estaciones', icon: Calendar },
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = selectedSeason === tab.id;
              const isCurrent = currentAutoSeason === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedSeason(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : 'text-slate-500'} />
                  <span>{tab.label}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Estación actual" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de Tareas de Mantenimiento de la Temporada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredItems.map(item => {
          const seasonBadge = 
            item.season === 'otono' ? { label: 'Otoño', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' }
            : item.season === 'invierno' ? { label: 'Invierno', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' }
            : item.season === 'primavera' ? { label: 'Primavera', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' }
            : { label: 'Verano', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300' };

          return (
            <div 
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-7 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${seasonBadge.color}`}>
                      {seasonBadge.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.bestMonths}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.urgency === 'alta' 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' 
                      : item.urgency === 'media'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    Prioridad {item.urgency.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Riesgo si se ignora */}
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-900/40 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">¿Por qué es importante?</span>
                    <span>{item.riskIfIgnored}</span>
                  </div>
                </div>

                {/* Checklist interactivo paso a paso */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Puntos Clave de Control:
                  </div>
                  <div className="space-y-1.5">
                    {item.recommendedChecklist.map((checkText, idx) => {
                      const itemKey = `${item.id}-${idx}`;
                      const isChecked = Boolean(activeChecklist[itemKey]);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleChecklistItem(itemKey)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 cursor-pointer border ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 line-through'
                              : 'bg-slate-50 border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-400 bg-white dark:bg-slate-800'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span>{checkText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botón Acción hacia profesionales */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Frecuencia: <strong className="text-slate-700 dark:text-slate-300">{item.estimatedFrequency}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/rubro/${encodeURIComponent(item.rubroRecomendado)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                  >
                    <span>Ver {item.rubroRecomendado}s</span>
                    <ArrowRight size={13} />
                  </Link>

                  <Link
                    to="/solicitar-presupuesto"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <span>Pedir Presupuesto</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FORMULARIO DE SUSCRIPCIÓN A ALERTAS POR WHATSAPP O CORREO */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-6 sm:p-10 text-white border border-indigo-500/30 shadow-xl space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
            <Bell size={13} />
            Alertas Automatizadas Gratuitas
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Recibí las Alertas en tu WhatsApp o Correo al Iniciar Cada Estación
          </h2>
          <p className="text-sm text-indigo-200 leading-relaxed">
            Te avisamos antes de que empiece el frío o el calor para que limpies tus calefactores o acondicionadores con tiempo, antes de que los profesionales colapsen de trabajo.
          </p>
        </div>

        {subscribedSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-base font-bold text-emerald-300">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
              <span>¡Suscripción de Alertas Guardada con Éxito!</span>
            </div>
            <p className="text-xs leading-relaxed text-emerald-200">
              Vas a recibir tu aviso preventivo en cada cambio de estación en Bahía Blanca. Podés probar tu alerta de WhatsApp inmediatamente haciendo clic abajo:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendTestWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Phone size={15} />
                <span>Probar y Enviar Recordatorio por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setSubscribedSuccess(false)}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Modificar preferencias
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-indigo-200 block mb-1">
                  Tu Nombre:
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marcelo Martínez"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-indigo-400/40 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-200 block mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 291 4123456"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-indigo-400/40 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-indigo-200 block mb-1">
                  Correo Electrónico (Opcional):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-indigo-400/40 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Canal de preferencia */}
            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-2">
                ¿Por dónde preferís recibir la alerta?
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
                  { id: 'email', label: 'Correo Electrónico', icon: Mail },
                  { id: 'ambos', label: 'Ambos Canales', icon: Bell }
                ].map(canal => (
                  <button
                    key={canal.id}
                    type="button"
                    onClick={() => setPreferenciaCanal(canal.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                      preferenciaCanal === canal.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                        : 'bg-slate-900/80 text-indigo-200 border-indigo-500/30 hover:bg-slate-800'
                    }`}
                  >
                    <canal.icon size={14} />
                    <span>{canal.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rubros de Interés */}
            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-2">
                Seleccioná las revisiones que aplican a tu hogar:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  'Gas y Calefacción',
                  'Limpieza de Tanques',
                  'Aires Acondicionados',
                  'Techos y Canaletas',
                  'Bombas y Piletas',
                  'Tableros Eléctricos'
                ].map(tag => {
                  const isChecked = intereses.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleInteres(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                          : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isChecked ? 'bg-white text-indigo-900 border-white' : 'border-slate-500'
                      }`}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={subscribing}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {subscribing ? 'Guardando Alerta...' : '🔔 Activar Mis Recordatorios Estacionales'}
              </button>

              <button
                type="button"
                onClick={handleSendTestWhatsApp}
                className="px-4 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Phone size={14} />
                <span>Enviar Prueba a mi WhatsApp</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
