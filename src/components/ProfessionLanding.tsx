import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Ad } from '../types';
import { ProfessionalCard } from './ProfessionalCard';
import { Skeleton } from './ui/Skeleton';
import { PROFESSIONS, PROFESSION_TIPS } from '../constants';
import { 
  ShieldCheck, Info, ChevronLeft, Briefcase, Star, MapPin, 
  HelpCircle, ChevronDown, ChevronUp, Phone, MessageSquare, ArrowRight, Building2, CheckCircle2 
} from 'lucide-react';
import { 
  updateMetaTag, 
  updateCanonicalLink, 
  injectJsonLd, 
  removeJsonLd, 
  generateProfessionLandingSchema,
  generateProfessionFaqSchema,
  getProfessionFaqs
} from '../utils/seo';
import { semTracker } from '../utils/semTracker';
import { analyticsService } from '../services/analyticsService';

// Aliases mapping so plural, slug, and informal queries land on the correct category
const SLUG_ALIASES: Record<string, string> = {
  'plomero': 'Plomero',
  'plomeros': 'Plomero',
  'plomeria': 'Plomero',
  'destapaciones': 'Plomero',
  'gasista': 'Gasista',
  'gasistas': 'Gasista',
  'gasista-matriculado': 'Gasista',
  'electricista': 'Electricista',
  'electricistas': 'Electricista',
  'electricidad': 'Electricista',
  'techista': 'Techista',
  'techistas': 'Techista',
  'techos': 'Techista',
  'reparacion-de-techos': 'Techista',
  'materiales-de-construccion': 'Materiales de Construcción',
  'materiales': 'Materiales de Construcción',
  'corralon': 'Corralón de Materiales',
  'corralones': 'Corralón de Materiales',
  'albanil': 'Albañil',
  'albaniles': 'Albañil',
  'pintor': 'Pintor',
  'pintores': 'Pintor',
  'cerrajero': 'Cerrajero',
  'cerrajeros': 'Cerrajero',
  'carpintero': 'Carpintero',
  'carpinteros': 'Carpintero'
};

export const ProfessionLanding: React.FC = () => {
  const { profession } = useParams<{ profession: string }>();
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [corralonAds, setCorralonAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Normalize slug and find canonical profession name
  const rawSlug = (profession || '').toLowerCase().trim();
  const matchedAliasName = SLUG_ALIASES[rawSlug];

  const professionData = useMemo(() => {
    if (matchedAliasName) {
      return PROFESSIONS.find(p => p.name === matchedAliasName) || null;
    }
    return PROFESSIONS.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '-') === rawSlug ||
      p.name.toLowerCase() === rawSlug
    ) || null;
  }, [rawSlug, matchedAliasName]);

  const professionName = professionData?.name || matchedAliasName || profession || '';
  const tips = PROFESSION_TIPS[professionName] || PROFESSION_TIPS['Default'];
  const faqs = useMemo(() => getProfessionFaqs(professionName), [professionName]);

  const isMaterialesOrCorralon = professionName.toLowerCase().includes('material') || 
                                professionName.toLowerCase().includes('corral');

  // Dynamic High-Quality SEO Metadata & OpenGraph
  useEffect(() => {
    if (!professionName) return;

    const previousTitle = document.title;
    const pageTitle = `${professionName}s en Bahía Blanca | Presupuestos y Contacto Directo - Bahía Oficios`;
    const metaDescription = `Encontrá los mejores ${professionName.toLowerCase()}s en Bahía Blanca. Profesionales verificados y matriculados, presupuestos gratis por WhatsApp y cobertura en todos los barrios.`;
    const canonicalUrl = `https://bahiaoficios.com/rubro/${rawSlug}`;

    document.title = pageTitle;
    updateMetaTag('name', 'description', metaDescription);
    updateMetaTag('name', 'keywords', `${professionName.toLowerCase()} bahia blanca, ${professionName.toLowerCase()} urgente bahia blanca, mejores ${professionName.toLowerCase()}s bahia blanca, presupuesto ${professionName.toLowerCase()} bahia blanca, ${professionName.toLowerCase()} matriculado, bahia oficios`);
    
    // Social / OpenGraph
    updateMetaTag('property', 'og:title', pageTitle);
    updateMetaTag('property', 'og:description', metaDescription);
    updateMetaTag('property', 'og:url', canonicalUrl);
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:locale', 'es_AR');

    // Twitter Card
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', pageTitle);
    updateMetaTag('name', 'twitter:description', metaDescription);

    updateCanonicalLink(canonicalUrl);

    // Track search intent for SEM & Analytics
    semTracker.trackConversion('search_performed', {
      rubro: professionName,
      searchTerm: `${professionName} Bahía Blanca`
    });

    analyticsService.trackSearch(professionName, {
      category: professionName
    });

    // Inyectar FAQ Schema para que Google muestre las respuestas directamente en las búsquedas
    const faqSchema = generateProfessionFaqSchema(professionName);
    injectJsonLd(`faq-${professionName}`, faqSchema);

    return () => {
      document.title = previousTitle;
      removeJsonLd(`profession-${professionName}`);
      removeJsonLd(`faq-${professionName}`);
    };
  }, [professionName, rawSlug]);

  // Inject ItemList Schema.org structured data once professionals are loaded
  useEffect(() => {
    if (professionName && professionals.length > 0) {
      const schemaData = generateProfessionLandingSchema(professionName, professionals);
      injectJsonLd(`profession-${professionName}`, schemaData);
    }
  }, [professionName, professionals]);

  // Fetch Professionals and Corralones
  useEffect(() => {
    const fetchData = async () => {
      if (!professionName) return;
      setLoading(true);
      try {
        // Query professionals with array-contains or exact rubro
        const q = query(
          collection(db, 'usuarios'),
          where('rol', '==', 'profesional'),
          where('profesionalInfo.rubros', 'array-contains', professionName),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        let docs = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
        
        if (docs.length === 0) {
          const q2 = query(
            collection(db, 'usuarios'),
            where('rol', '==', 'profesional'),
            where('profesionalInfo.rubro', '==', professionName),
            limit(50)
          );
          const snap2 = await getDocs(q2);
          docs = snap2.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
        }

        // If searching for materials, also match general construction pros or corralón
        if (isMaterialesOrCorralon && docs.length === 0) {
          const q3 = query(
            collection(db, 'usuarios'),
            where('rol', '==', 'profesional'),
            where('profesionalInfo.rubro', 'in', ['Materiales de Construcción', 'Corralón de Materiales', 'Albañil']),
            limit(50)
          );
          const snap3 = await getDocs(q3);
          docs = snap3.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
        }

        // Sort: VIP first, then rating
        docs.sort((a, b) => {
          const isVipA = !!a.profesionalInfo?.isVip;
          const isVipB = !!b.profesionalInfo?.isVip;
          if (isVipA && !isVipB) return -1;
          if (!isVipA && isVipB) return 1;
          return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
        });

        setProfessionals(docs);

        // If Materiales / Corralón, fetch commercial sponsors in that category
        if (isMaterialesOrCorralon) {
          const adsSnap = await getDocs(query(collection(db, 'ads'), where('active', '==', true)));
          const adsList = adsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ad));
          setCorralonAds(adsList);
        }
      } catch (error) {
        console.error("Error fetching professionals for landing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [professionName, isMaterialesOrCorralon]);

  const Icon = professionData?.icon || Briefcase;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* SEM High-Converting Hero Banner */}
      <div className="relative bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white py-12 sm:py-20 border-b border-indigo-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-6 text-xs sm:text-sm font-semibold transition-colors bg-white/10 px-3 py-1.5 rounded-xl w-fit backdrop-blur-xs"
          >
            <ChevronLeft size={16} />
            Volver a Todos los Rubros
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
                <MapPin size={13} className="text-indigo-400" />
                Bahía Blanca y Alrededores
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                {professionName}s en Bahía Blanca
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mb-6">
                Contactá directo por WhatsApp a los mejores {professionName.toLowerCase()}s calificados de la ciudad. 
                Presupuestos sin compromiso, atención garantizada y cobertura en todos los barrios.
              </p>

              {/* SEM Key Value Badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-400" /> Sin intermediarios ni comisiones
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-400" /> Contacto directo por WhatsApp
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-400" /> Presupuestos en minutos
                </span>
              </div>
            </div>

            {/* Quick Quote SEM Action Card */}
            <div className="bg-white/10 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-800 rounded-3xl p-6 md:p-8 text-center sm:text-left shrink-0 max-w-sm w-full">
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center mb-4 mx-auto sm:mx-0 shadow-lg">
                <Icon size={28} />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                ¿Necesitás un presupuesto urgente?
              </h2>
              <p className="text-xs text-indigo-200 mb-5 leading-relaxed">
                Publicá tu solicitud gratis o contactá ahora a los profesionales disponibles en Bahía Blanca.
              </p>
              <Link
                to={`/solicitar-presupuesto?rubro=${encodeURIComponent(professionName)}`}
                onClick={() => semTracker.trackConversion('quote_submitted', { rubro: professionName })}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                Pedir Presupuesto Gratis <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Professional Listings */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {loading 
                      ? 'Buscando especialistas...' 
                      : `${professionals.length} ${professionName}s disponibles en Bahía Blanca`}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Ordenados por opiniones verificadas y disponibilidad inmediata
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                      <Skeleton className="w-full h-48 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : professionals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {professionals.map(prof => (
                    <ProfessionalCard key={prof.uid} professional={prof} />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-700 shadow-xs">
                  <div className="bg-indigo-50 dark:bg-slate-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                    <Icon size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Profesionales disponibles a pedido
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-md mx-auto">
                    Actualmente estamos incorporando más especialistas de {professionName.toLowerCase()} en Bahía Blanca. 
                    Publicá tu trabajo para que los técnicos del rubro te contacten directamente.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link 
                      to={`/solicitar-presupuesto?rubro=${encodeURIComponent(professionName)}`}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      Publicar Pedido de {professionName}
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Ver Otros Rubros
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* Corralones & Alianzas Comerciales si aplica */}
            {isMaterialesOrCorralon && corralonAds.length > 0 && (
              <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Corralones y Casas de Materiales Destacadas
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {corralonAds.map(ad => (
                    <div key={ad.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{ad.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{ad.description}</p>
                      </div>
                      {ad.link && (
                        <a 
                          href={ad.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          Contactar Comercio <ArrowRight size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SEO Rich FAQ Accordion Section */}
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                <HelpCircle size={22} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xl font-extrabold tracking-tight">
                  Preguntas Frecuentes sobre {professionName}s en Bahía Blanca
                </h3>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <span>{faq.question}</span>
                        {isOpen ? <ChevronUp size={18} className="text-indigo-600 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700/60">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hiring Tips */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs sticky top-20">
              <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck size={22} />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Consejos para Contratar</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                Recomendaciones clave de Bahía Oficios para contratar un buen servicio de {professionName.toLowerCase()}.
              </p>
              <ul className="space-y-3.5">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <div className="bg-indigo-50 dark:bg-indigo-950/60 p-1 rounded-lg mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Info size={14} />
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                  ¿Sos {professionName} en Bahía Blanca?
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-400/90 mb-3 leading-relaxed">
                  Sumate a la plataforma líder de la ciudad y recibí pedidos de presupuestos de vecinos todos los días.
                </p>
                <Link 
                  to="/signup" 
                  className="text-xs font-black text-amber-900 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  Registrarme Gratis →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer SEO Indexation Text */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Directorio de {professionName}s en Bahía Blanca
            </h3>
            <p className="leading-relaxed">
              En <strong>Bahía Oficios</strong> conectamos a la comunidad bahiense con {professionName.toLowerCase()}s calificados, 
              matriculados y con referencias verificadas. Podés pedir presupuestos sin costo, consultar por urgencias las 24 horas 
              y contactar directamente a través de WhatsApp sin intermediarios ni comisiones sobre la mano de obra.
            </p>
            <p className="leading-relaxed">
              Zonas de cobertura habitual: Centro, Macrocentro, Villa Mitre, Palihue, Barrio Patagonia, Universitario, 
              Noroeste, Bella Vista, Ingeniero White, General Daniel Cerri y Punta Alta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
