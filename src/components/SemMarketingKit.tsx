import React, { useState } from 'react';
import { 
  Megaphone, Copy, Check, ExternalLink, Target, Sparkles, 
  HelpCircle, ShieldCheck, ArrowRight, DollarSign, Search, CheckCircle2 
} from 'lucide-react';

interface CampaignPlan {
  id: string;
  name: string;
  rubro: string;
  targetUrl: string;
  headlines: string[];
  descriptions: string[];
  exactKeywords: string[];
  phraseKeywords: string[];
  negativeKeywords: string[];
  estimatedCpc: string;
  searchIntent: string;
}

const CAMPAIGNS: CampaignPlan[] = [
  {
    id: 'plomeros',
    name: 'Campaña SEM 1: Plomeros y Destapaciones Bahía Blanca',
    rubro: 'Plomero',
    targetUrl: 'https://bahiaoficios.com/rubro/plomero?utm_source=google&utm_medium=cpc&utm_campaign=plomeros_bahia_blanca',
    searchIntent: 'Urgencias de plomería, fugas de agua, destapaciones cloacales e instalación de cañerías en Bahía Blanca.',
    estimatedCpc: '$120 - $250 ARS',
    headlines: [
      'Plomero en Bahía Blanca 24hs',
      'Plomeros Calificados Urgencias',
      'Destapaciones con Máquina',
      'Presupuesto Gratis por WhatsApp',
      'Bahía Oficios - Plomeros'
    ],
    descriptions: [
      'Encontrá plomeros verificados en Bahía Blanca. Contacto directo por WhatsApp y sin comisiones.',
      '¿Fuga de agua o cañería tapada? Contactá a un plomero urgente en tu barrio en minutos.'
    ],
    exactKeywords: [
      '[plomero bahia blanca]',
      '[plomeros en bahia blanca]',
      '[destapaciones bahia blanca]',
      '[plomero urgente bahia blanca]',
      '[plomero zona centro bahia blanca]'
    ],
    phraseKeywords: [
      '"plomero bahia blanca"',
      '"plomeros en bahia blanca"',
      '"destapaciones cloacales bahia blanca"',
      '"arreglo perdidas de agua bahia blanca"'
    ],
    negativeKeywords: [
      'curso', 'empleo', 'trabajo', 'cv', 'gratis', 'pdf', 'sueldo', 'herramientas'
    ]
  },
  {
    id: 'gasistas',
    name: 'Campaña SEM 2: Gasistas Matriculados Camuzzi Bahía Blanca',
    rubro: 'Gasista',
    targetUrl: 'https://bahiaoficios.com/rubro/gasista?utm_source=google&utm_medium=cpc&utm_campaign=gasistas_matriculados_bahia_blanca',
    searchIntent: 'Gasistas matriculados para trámites Camuzzi, fugas de gas, instalación de calefactores y termotanques.',
    estimatedCpc: '$150 - $320 ARS',
    headlines: [
      'Gasista Matriculado Bahía',
      'Trámites Camuzzi y Planos',
      'Instalación Calefactores',
      'Pruebas de Hermeticidad Gas',
      'Bahía Oficios - Gasistas'
    ],
    descriptions: [
      'Gasistas matriculados habilitados en Bahía Blanca. Trámites Camuzzi, inspecciones y habilitaciones.',
      'Conectá tu calefactor o termotanque con gasistas certificados. Presupuesto sin cargo por WhatsApp.'
    ],
    exactKeywords: [
      '[gasista bahia blanca]',
      '[gasista matriculado bahia blanca]',
      '[gasistas en bahia blanca]',
      '[camuzzi gasista matriculado bahia blanca]',
      '[tramites gas camuzzi bahia blanca]'
    ],
    phraseKeywords: [
      '"gasista bahia blanca"',
      '"gasista matriculado bahia blanca"',
      '"instalador de gas bahia blanca"',
      '"reparacion calefactores gas bahia blanca"'
    ],
    negativeKeywords: [
      'curso', 'capacitacion', 'examen camuzzi', 'sueldo', 'gratis', 'pdf'
    ]
  },
  {
    id: 'electricistas',
    name: 'Campaña SEM 3: Electricistas e Instalaciones 24hs Bahía Blanca',
    rubro: 'Electricista',
    targetUrl: 'https://bahiaoficios.com/rubro/electricista?utm_source=google&utm_medium=cpc&utm_campaign=electricistas_24hs_bahia_blanca',
    searchIntent: 'Cortocircuitos, bajada de luz EDES, recableado e instalaciones eléctricas domiciliarias.',
    estimatedCpc: '$140 - $290 ARS',
    headlines: [
      'Electricista Bahía Blanca',
      'Urgencias Eléctricas 24hs',
      'Electricistas Matriculados',
      'Bajadas EDES y Disyuntores',
      'Bahía Oficios Electricistas'
    ],
    descriptions: [
      'Electricistas matriculados en Bahía Blanca. Solución de cortocircuitos, pilares EDES y térmicas.',
      'Atención de urgencias eléctricas las 24 horas en todos los barrios. Pedí presupuesto por WhatsApp.'
    ],
    exactKeywords: [
      '[electricista bahia blanca]',
      '[electricistas en bahia blanca]',
      '[electricista matriculado bahia blanca]',
      '[electricista 24 horas bahia blanca]',
      '[urgencias electricas bahia blanca]'
    ],
    phraseKeywords: [
      '"electricista bahia blanca"',
      '"electricistas matriculados bahia blanca"',
      '"cortocircuito bahia blanca"',
      '"pilar de luz edes bahia blanca"'
    ],
    negativeKeywords: [
      'curso', 'utn', 'tecnicatura', 'sueldo', 'empleo', 'diagrama', 'gratis'
    ]
  },
  {
    id: 'techistas',
    name: 'Campaña SEM 4: Techistas y Reparación de Techos Bahía Blanca',
    rubro: 'Techista',
    targetUrl: 'https://bahiaoficios.com/rubro/techista?utm_source=google&utm_medium=cpc&utm_campaign=techistas_techos_bahia_blanca',
    searchIntent: 'Goteras, reparación de techos de chapa o losa, membrana asfáltica, zinguería y canaletas.',
    estimatedCpc: '$130 - $270 ARS',
    headlines: [
      'Techista en Bahía Blanca',
      'Arreglo de Techos y Goteras',
      'Chapas, Membrana y Zinguería',
      'Presupuesto Techo sin Cargo',
      'Bahía Oficios Techistas'
    ],
    descriptions: [
      'Reparación urgente de techos en Bahía Blanca. Filtraciones, goteras, colocación de membrana y chapas.',
      'Especialistas en techos resistentes a los vientos bahienses. Compará presupuestos gratis hoy.'
    ],
    exactKeywords: [
      '[techista bahia blanca]',
      '[techistas en bahia blanca]',
      '[reparacion de techos bahia blanca]',
      '[arreglo de goteras bahia blanca]',
      '[membrana para techos bahia blanca]'
    ],
    phraseKeywords: [
      '"techista bahia blanca"',
      '"techistas en bahia blanca"',
      '"colocacion de membrana bahia blanca"',
      '"techos de chapa bahia blanca"'
    ],
    negativeKeywords: [
      'como poner membrana', 'tutorial', 'hazlo tu mismo', 'curso', 'empleo'
    ]
  },
  {
    id: 'materiales',
    name: 'Campaña SEM 5: Corralones y Materiales de Construcción Bahía Blanca',
    rubro: 'Materiales de Construcción',
    targetUrl: 'https://bahiaoficios.com/rubro/materiales-de-construccion?utm_source=google&utm_medium=cpc&utm_campaign=materiales_construccion_corralon',
    searchIntent: 'Precios de arena, cemento Loma Negra, ladrillos huecos, hierro y corralones con flete en Bahía Blanca.',
    estimatedCpc: '$160 - $340 ARS',
    headlines: [
      'Materiales Construcción Bahía',
      'Corralón con Flete a Obra',
      'Cemento, Arena y Ladrillos',
      'Precios y Descuento Gremio',
      'Bahía Oficios Corralones'
    ],
    descriptions: [
      'Cotizá materiales de obra gruesa en corralones de Bahía Blanca. Arena, cemento, ladrillos y hierros.',
      'Entrega directa en obra con camión grúa en Bahía Blanca y la zona. Pedí cotización directa.'
    ],
    exactKeywords: [
      '[materiales de construccion bahia blanca]',
      '[corralon bahia blanca]',
      '[corralones en bahia blanca]',
      '[precio de cemento bahia blanca]',
      '[arena y piedra bahia blanca]'
    ],
    phraseKeywords: [
      '"materiales de construccion bahia blanca"',
      '"corralon de materiales bahia blanca"',
      '"venta de arena y cemento bahia blanca"',
      '"ladrillos huecos bahia blanca"'
    ],
    negativeKeywords: [
      'mercado libre', 'empleo', 'cv', 'distribuidor mayorista buenos aires'
    ]
  }
];

export const SemMarketingKit: React.FC = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignPlan>(CAMPAIGNS[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-4">
            <Megaphone size={14} className="text-indigo-600 dark:text-indigo-400" />
            Estrategia SEM & Google Ads para Bahía Oficios
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Campañas SEM para Salir Primero en Google
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Estructura optimizada de anuncios de Google Ads para cuando busquen <strong>plomero</strong>, <strong>gasista</strong>, <strong>electricista</strong>, <strong>techistas</strong> y <strong>materiales de construcción</strong> en Bahía Blanca.
          </p>
        </div>

        {/* Top SEM Strategic Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold mb-4">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Calidad Máxima (Quality Score 10/10)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Las URLs de destino (`/rubro/plomero`, `/rubro/gasista`, etc.) coinciden exactamente con las palabras clave buscadas, reduciendo el costo por clic hasta un 50% y garantizando la posición #1.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center font-bold mb-4">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Conversión Directa a WhatsApp
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Los anuncios dirigen a páginas con botones directos de WhatsApp y presupuestos gratis, registrando la conversión en Google Ads (`gtag`) automáticamente.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold mb-4">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
              Palabras Negativas Incluidas
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Filtramos búsquedas de "cursos", "empleos" o "PDF" para que no gastes presupuesto publicitario en personas que buscan trabajo en lugar de contratar el servicio.
            </p>
          </div>
        </div>

        {/* Campaign Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {CAMPAIGNS.map(camp => (
            <button
              key={camp.id}
              onClick={() => setSelectedCampaign(camp)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                selectedCampaign.id === camp.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {camp.rubro}
            </button>
          ))}
        </div>

        {/* Selected Campaign Detailed Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full mb-2">
                <Target size={14} /> Listo para activar en Google Ads
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {selectedCampaign.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {selectedCampaign.searchIntent}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={selectedCampaign.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Probar Landing Page <ExternalLink size={14} />
              </a>
              <button
                onClick={() => {
                  const fullText = `CAMPAÑA: ${selectedCampaign.name}\n\nURL DESTINO:\n${selectedCampaign.targetUrl}\n\nTITULARES:\n${selectedCampaign.headlines.join('\n')}\n\nDESCRIPCIONES:\n${selectedCampaign.descriptions.join('\n')}\n\nKEYWORDS EXACTAS:\n${selectedCampaign.exactKeywords.join('\n')}\n\nKEYWORDS FRASE:\n${selectedCampaign.phraseKeywords.join('\n')}\n\nNEGATIVAS:\n${selectedCampaign.negativeKeywords.join(', ')}`;
                  copyToClipboard(fullText, 'full_campaign');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {copiedKey === 'full_campaign' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === 'full_campaign' ? '¡Campaña Copiada!' : 'Copiar Todo el Plan'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
            {/* Left: Google Search Ad Preview */}
            <div className="space-y-6">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Search size={18} className="text-indigo-600" />
                Vista Previa del Anuncio en Google (Posición #1)
              </h3>

              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1.5">
                  <span className="font-bold text-slate-900 dark:text-white">Patrocinado</span>
                  <span>•</span>
                  <span>bahiaoficios.com</span>
                  <span>› rubro › {selectedCampaign.rubro.toLowerCase()}</span>
                </div>
                <h4 className="text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
                  {selectedCampaign.headlines[0]} | {selectedCampaign.headlines[1]} | {selectedCampaign.headlines[3]}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {selectedCampaign.descriptions[0]} {selectedCampaign.descriptions[1]}
                </p>

                {/* Sitelinks Extensions */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer">
                    Pedir Presupuesto Gratis
                  </div>
                  <div className="text-xs text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer">
                    Urgencias 24 Horas
                  </div>
                  <div className="text-xs text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer">
                    Opiniones Reales
                  </div>
                  <div className="text-xs text-[#1a0dab] dark:text-[#8ab4f8] font-medium hover:underline cursor-pointer">
                    Contacto por WhatsApp
                  </div>
                </div>
              </div>

              {/* Titulares y Descripciones para Google Ads */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Titulares (Headlines - 30 Caracteres c/u)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedCampaign.headlines.join('\n'), 'headlines')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'headlines' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === 'headlines' ? 'Copiado' : 'Copiar Titulares'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {selectedCampaign.headlines.map((hl, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200">
                      <span>{hl}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{hl.length}/30</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Descripciones (Descriptions - 90 Caracteres c/u)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedCampaign.descriptions.join('\n'), 'descriptions')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'descriptions' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === 'descriptions' ? 'Copiado' : 'Copiar Descripciones'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {selectedCampaign.descriptions.map((desc, i) => (
                    <div key={i} className="flex items-start justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 gap-2">
                      <span>{desc}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{desc.length}/90</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Palabras Clave y Configuración */}
            <div className="space-y-6">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Target size={18} className="text-emerald-500" />
                Palabras Clave de Máxima Intención (Keywords)
              </h3>

              {/* Exact Match Keywords */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Concordancia Exacta [Keywords] (Menor costo, mayor conversión)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedCampaign.exactKeywords.join('\n'), 'exact')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'exact' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === 'exact' ? 'Copiado' : 'Copiar Exactas'}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  {selectedCampaign.exactKeywords.map((kw, i) => (
                    <div key={i}>{kw}</div>
                  ))}
                </div>
              </div>

              {/* Phrase Match Keywords */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Concordancia de Frase "Keywords" (Para captar variaciones con barrio)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedCampaign.phraseKeywords.join('\n'), 'phrase')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'phrase' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === 'phrase' ? 'Copiado' : 'Copiar Frases'}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs font-mono text-indigo-700 dark:text-indigo-400">
                  {selectedCampaign.phraseKeywords.map((kw, i) => (
                    <div key={i}>{kw}</div>
                  ))}
                </div>
              </div>

              {/* Negative Keywords */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Palabras Clave Negativas (Para no tirar dinero en clics inútiles)
                  </h4>
                  <button
                    onClick={() => copyToClipboard(selectedCampaign.negativeKeywords.join('\n'), 'negative')}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'negative' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedKey === 'negative' ? 'Copiado' : 'Copiar Negativas'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs">
                  {selectedCampaign.negativeKeywords.map((neg, i) => (
                    <span key={i} className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-lg text-rose-700 dark:text-rose-400 font-mono text-[11px]">
                      -{neg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Strategy Advice */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <span className="font-bold block mb-1">💡 Configuración de Puja en Google Ads:</span>
                Seleccionar <strong>Estrategia de Puja: Cuota de Impresiones Objetivo</strong> con <strong>Ubicación: Parte superior absoluta de la página de resultados (100%)</strong> o <strong>Maximizar Clics con límite de CPC de $300 ARS</strong>. De esta manera, cada vez que busquen en Bahía Blanca, la web aparecerá siempre primera.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
