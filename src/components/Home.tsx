import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, MapPin, ArrowRight, Star, ShieldCheck, Users, Briefcase, 
  MessageSquare, CheckCircle, Megaphone, AlertCircle, Mic, MicOff, 
  SlidersHorizontal, Filter, X, Tag, ChevronLeft, ChevronRight, 
  Building2, Handshake, Sparkles, HelpCircle, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Category, User, Ad } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { ProfessionalCard } from './ProfessionalCard';
import { PROFESSIONS, ZONAS } from '../constants';
import { CachedImage } from './CachedImage';
import { preloadImages } from '../utils/imageCache';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { userSearchService } from '../services/userSearchService';
import { HomeQuickJobPost } from './HomeQuickJobPost';

export function Home() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [allPros, setAllPros] = useState<User[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [openHomeFaq, setOpenHomeFaq] = useState<number | null>(0);

  const [adsPerPage, setAdsPerPage] = useState(3);

  useEffect(() => {
    const updateAdsPerPage = () => {
      if (window.innerWidth < 640) {
        setAdsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setAdsPerPage(2);
      } else {
        setAdsPerPage(3);
      }
    };
    updateAdsPerPage();
    window.addEventListener('resize', updateAdsPerPage);
    return () => window.removeEventListener('resize', updateAdsPerPage);
  }, []);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZona, setSelectedZona] = useState('Todas');
  const [minRating, setMinRating] = useState<number>(0);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(false);
  const [haceUrgencias, setHaceUrgencias] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Array<{ term: string; category?: string; zona?: string }>>([]);
  const navigate = useNavigate();

  // Load user recent searches from Firestore / local cache
  useEffect(() => {
    userSearchService.getUserRecentSearches(currentUser?.uid).then((res) => {
      if (res && res.length > 0) {
        setRecentSearches(res);
      }
    });
  }, [currentUser?.uid]);

  // Compute personalized recommendations based on recent searches and professional badges
  const personalizedData = useMemo(() => {
    return userSearchService.getPersonalizedSuggestions(allPros, recentSearches);
  }, [allPros, recentSearches]);

  const { isListening, speechFeedback, toggleListening } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchTerm(transcript);
      api.trackSearch(transcript);
      userSearchService.saveRecentSearch(currentUser?.uid, transcript, {
        zona: selectedZona !== 'Todas' ? selectedZona : undefined,
        userEmail: currentUser?.email
      });
      const params = new URLSearchParams();
      params.set('search', transcript);
      if (selectedZona && selectedZona !== 'Todas') params.set('zona', selectedZona);
      if (minRating > 0) params.set('rating', minRating.toString());
      if (disponibilidadInmediata) params.set('disponibilidad', 'true');
      if (haceUrgencias) params.set('urgencias', 'true');
      navigate(`/dashboard?${params.toString()}`);
    }
  });

  useEffect(() => {
    const fetchPopularRubros = async () => {
      try {
        const q = query(
          collection(db, 'search_stats'),
          orderBy('searchCount', 'desc'),
          limit(8)
        );
        const snapshot = await getDocs(q);
        const popular = snapshot.docs.map(doc => doc.data());
        
        if (popular.length >= 4) {
          setCategories(popular.map((p: any) => {
            const profession = PROFESSIONS.find(prof => prof.name === p.name);
            return {
              id: p.name,
              name: p.name,
              icon: profession?.icon || Briefcase
            };
          }));
        } else {
          // Fallback to top demanded niches: Plomero, Gasista, Electricista, Techista, Materiales
          const defaults = ['Plomero', 'Gasista', 'Electricista', 'Techista', 'Materiales de Construcción', 'Albañil', 'Pintor', 'Cerrajero'];
          setCategories(defaults.map(name => {
            const profession = PROFESSIONS.find(prof => prof.name === name);
            return {
              id: name,
              name: name,
              icon: profession?.icon || Briefcase
            };
          }));
        }
      } catch (error) {
        const defaults = ['Plomero', 'Gasista', 'Electricista', 'Techista', 'Materiales de Construcción', 'Albañil', 'Pintor', 'Cerrajero'];
        setCategories(defaults.map(name => {
          const profession = PROFESSIONS.find(prof => prof.name === name);
          return {
            id: name,
            name: name,
            icon: profession?.icon || Briefcase
          };
        }));
      }
    };

    fetchPopularRubros();
    
    const fetchAds = async () => {
      try {
        const q = query(collection(db, 'ads'), where('active', '==', true), where('position', '==', 'home_carousel'));
        const snapshot = await getDocs(q);
        const fetchedAds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
        setAds(fetchedAds);
        // Precargar imágenes de anuncios en caché
        preloadImages(fetchedAds.map(a => a.imageUrl));
      } catch (error) {
        console.error("Error fetching ads:", error);
      }
    };

    const fetchFeatured = async () => {
      try {
        // We fetch all professionals and sort them in memory for more complex logic
        const q = query(
          collection(db, 'usuarios'),
          where('rol', '==', 'profesional'),
          limit(50) // Fetch a reasonable amount to sort
        );
        const snapshot = await getDocs(q);
        const pros = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as User[];
        setAllPros(pros);
        
        // Algorithm: VIP first, then ratingAvg (5 to 1), then reviewCount
        const sortedPros = pros.sort((a, b) => {
          const aVip = a.profesionalInfo?.isVip ? 1 : 0;
          const bVip = b.profesionalInfo?.isVip ? 1 : 0;
          if (aVip !== bVip) return bVip - aVip;
          
          const aRating = a.profesionalInfo?.ratingAvg || 0;
          const bRating = b.profesionalInfo?.ratingAvg || 0;
          if (aRating !== bRating) return bRating - aRating;
          
          const aReviews = a.profesionalInfo?.reviewCount || 0;
          const bReviews = b.profesionalInfo?.reviewCount || 0;
          return bReviews - aReviews;
        });

        const selectedPros = sortedPros.slice(0, 8);
        
        // Precargar fotos de perfil y portadas en segundo plano
        const imagesToWarm = selectedPros.flatMap(p => [
          p.fotoUrl,
          p.profesionalInfo?.fotoPortada
        ]).filter(Boolean) as string[];
        preloadImages(imagesToWarm);
      } catch (error) {
        console.error("Error fetching featured pros:", error);
      }
    };

    fetchAds();
    fetchFeatured();
  }, []);

  useEffect(() => {
    // El carrusel de sponsors se activa solo si hay más de 4 sponsors
    if (ads.length > 4) {
      const timer = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [ads]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      api.trackSearch(term);
      userSearchService.saveRecentSearch(currentUser?.uid, term, {
        zona: selectedZona !== 'Todas' ? selectedZona : undefined,
        userEmail: currentUser?.email
      });
      params.set('search', term);
    }
    if (selectedZona && selectedZona !== 'Todas') {
      params.set('zona', selectedZona);
    }
    if (minRating > 0) {
      params.set('rating', minRating.toString());
    }
    if (disponibilidadInmediata) {
      params.set('disponibilidad', 'true');
    }
    if (haceUrgencias) {
      params.set('urgencias', 'true');
    }

    const qs = params.toString();
    navigate(qs ? `/dashboard?${qs}` : '/dashboard');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950">
      {/* Hero Section */}
      <div className="relative bg-slate-900 text-white overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 mb-6">
              <MapPin size={13} className="text-indigo-400" />
              <span>La guía oficial de oficios de Bahía Blanca</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Encontrá al profesional que necesitás en Bahía Blanca
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              La red más confiable de oficios y servicios verificados. Plomeros, electricistas, albañiles y especialistas calificados a tu alcance.
            </p>
            
            {/* Buscador Principal con Búsqueda Avanzada y Búsqueda por Voz */}
            <div id="onboarding-search-step" className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700 flex flex-col md:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl relative">
                  <Search className="text-slate-400 w-5 h-5 shrink-0" />
                  <input 
                    id="onboarding-search-input"
                    type="text" 
                    placeholder="¿Qué arreglo o servicio necesitás solucionar hoy en Bahía?" 
                    className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 py-3 px-3 text-sm sm:text-base outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />

                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 mr-1"
                      title="Borrar texto"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {/* Botón de Búsqueda por Voz */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Detener búsqueda por voz" : "Búsqueda por voz (dictar búsqueda)"}
                    className={`p-2 rounded-xl transition-all shrink-0 flex items-center gap-1 text-xs font-semibold ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Mic size={18} className={isListening ? 'animate-bounce' : ''} />
                    {isListening && <span className="hidden sm:inline">Escuchando...</span>}
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botón Filtros / Búsqueda Avanzada */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`px-4 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border ${
                      showAdvancedSearch || selectedZona !== 'Todas' || minRating > 0 || disponibilidadInmediata || haceUrgencias
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Filtros por zona y calificación"
                  >
                    <SlidersHorizontal size={17} />
                    <span className="hidden sm:inline">Filtros</span>
                    {(selectedZona !== 'Todas' || minRating > 0 || disponibilidadInmediata || haceUrgencias) && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                    )}
                  </button>

                  <button 
                    onClick={handleSearch}
                    className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center shrink-0 shadow-sm"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {/* Feedback de voz */}
              {speechFeedback && (
                <div 
                  className={`mt-2.5 px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 shadow-sm text-left ${
                    isListening
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200'
                      : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-400 animate-ping' : 'bg-indigo-400'}`}></span>
                  <span>{speechFeedback}</span>
                </div>
              )}

              {/* Panel de Búsqueda Avanzada */}
              <AnimatePresence>
                {showAdvancedSearch && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 bg-white dark:bg-slate-800/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-2xl text-left overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-indigo-500" />
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Búsqueda Avanzada en Bahía Blanca</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedSearch(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Zona Geográfica específica en Bahía Blanca */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <MapPin size={14} className="text-indigo-500" />
                          Zona Geográfica (Bahía Blanca)
                        </label>
                        <select
                          value={selectedZona}
                          onChange={(e) => setSelectedZona(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="Todas">Toda Bahía Blanca</option>
                          {ZONAS.map((z) => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Filtrá según el barrio o sector de Bahía Blanca
                        </p>
                      </div>

                      {/* Rango de Calificación de los profesionales */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <Star size={14} className="text-amber-500 fill-amber-400" />
                          Rango de Calificación
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: 'Todas', val: 0 },
                            { label: '3.0+ ★', val: 3 },
                            { label: '4.0+ ★', val: 4 },
                            { label: '4.5+ ★', val: 4.5 },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setMinRating(minRating === opt.val ? 0 : opt.val)}
                              className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                                minRating === opt.val
                                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {minRating === 0 ? 'Sin límite de calificación' : `Profesionales con mínimo ${minRating} estrellas`}
                        </p>
                      </div>
                    </div>

                    {/* Filtros adicionales */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={disponibilidadInmediata}
                            onChange={(e) => setDisponibilidadInmediata(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                          />
                          <span>Disponible Ahora</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={haceUrgencias}
                            onChange={(e) => setHaceUrgencias(e.target.checked)}
                            className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                          />
                          <span>Urgencias 24h</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        {(selectedZona !== 'Todas' || minRating > 0 || disponibilidadInmediata || haceUrgencias) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedZona('Todas');
                              setMinRating(0);
                              setDisponibilidadInmediata(false);
                              setHaceUrgencias(false);
                            }}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                          >
                            Limpiar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSearch}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                        >
                          Aplicar y Buscar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-8 flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Perfiles Verificados</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>100% Bahía Blanca</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link 
                to="/solicitar-presupuesto"
                id="onboarding-quotes-step"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
              >
                <Briefcase size={18} className="text-indigo-600" />
                Pedir Presupuesto Gratis en 1 Minuto
              </Link>
              <Link 
                to="/dashboard?urgencias=true"
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
              >
                <AlertCircle size={18} />
                URGENCIAS 24HS
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Componente de Acceso Rápido para Publicar Trabajos Solicitados */}
      <HomeQuickJobPost />

      {/* Categories Grid */}
      <div className="bg-slate-50 dark:bg-slate-900/50 py-16 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Rubros Populares
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Explorá los servicios más solicitados en la ciudad
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link 
                  key={cat.id} 
                  to={`/rubro/${encodeURIComponent(cat.name.toLowerCase().replace(/\s+/g, '-'))}`}
                  onClick={() => {
                    api.trackSearch(cat.name);
                    userSearchService.saveRecentSearch(currentUser?.uid, cat.name, {
                      category: cat.name,
                      userEmail: currentUser?.email
                    });
                  }}
                  className="group bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col items-center text-center shadow-sm hover:shadow-md"
                >
                  <div className="w-13 h-13 sm:w-14 sm:h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {cat.name}
                  </h3>
                </Link>
              );
            })}
          </div>
          
          <div className="mt-10 text-center">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Ver todas las categorías <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* Sugerencias personalizadas basadas en búsquedas recientes guardadas en Firestore */}
      {personalizedData.suggestedPros.length > 0 && (
        <section aria-label="Sugerencias personalizadas" className="bg-indigo-50/40 dark:bg-slate-900/90 py-14 border-b border-indigo-100/60 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/70 px-3 py-1 rounded-full mb-2 border border-indigo-200 dark:border-indigo-800/80">
                  <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Sugerencias personalizadas para vos
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Profesionales recomendados según tus búsquedas
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Basado en tu actividad reciente y profesionales con mejores insignias de respuesta en Bahía Blanca
                </p>
              </div>

              {/* Chips de búsquedas recientes y botón para limpiar */}
              {personalizedData.activeTerms.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                    Búsquedas recientes:
                  </span>
                  {personalizedData.activeTerms.map((t, idx) => (
                    <Link
                      key={idx}
                      to={`/dashboard?search=${encodeURIComponent(t.term)}${t.zona && t.zona !== 'Todas' ? `&zona=${encodeURIComponent(t.zona)}` : ''}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-2xs"
                    >
                      <span>🔍 {t.term}</span>
                      {t.zona && t.zona !== 'Todas' && (
                        <span className="text-[10px] text-slate-400">({t.zona})</span>
                      )}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      await userSearchService.clearRecentSearches(currentUser?.uid);
                      setRecentSearches([]);
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors ml-1 underline cursor-pointer"
                  >
                    Borrar
                  </button>
                </div>
              )}
            </div>

            {/* Grilla de profesionales sugeridos con insignias */}
            <div id="onboarding-featured-pros" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {personalizedData.suggestedPros.slice(0, 4).map((pro, index) => (
                <div key={pro.uid} id={index === 0 ? "onboarding-chat-step" : undefined} className="h-full">
                  <ProfessionalCard professional={pro} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empresas que colaboran con Bahía Oficios */}
      {ads.length > 0 && (
        <div className="bg-white dark:bg-slate-950 py-16 overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full mb-2 border border-indigo-100 dark:border-indigo-900/60">
                  <Building2 size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Alianzas & Sponsors Locales
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Empresas que colaboran con Bahía Oficios
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Comercios, corralones y proveedores bahienses comprometidos con el gremio y la comunidad
                </p>
              </div>
              {ads.length > 4 && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    onClick={() => setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length)}
                    aria-label="Anterior"
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => setCurrentAdIndex((prev) => (prev + 1) % ads.length)}
                    aria-label="Siguiente"
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            {ads.length > 4 ? (
              <div className="relative overflow-hidden">
                <motion.div 
                  className="flex"
                  animate={{ x: `-${currentAdIndex * (100 / adsPerPage)}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {ads.map((ad) => (
                    <motion.div 
                      key={ad.id} 
                      className="w-full md:w-1/2 lg:w-1/3 flex-shrink-0 px-3 group"
                      whileHover={{ y: -3 }}
                    >
                      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-800 overflow-hidden h-full flex flex-col transition-all duration-200">
                        <div className="relative h-44 overflow-hidden bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center p-4 border-b border-slate-100 dark:border-slate-800">
                          <CachedImage 
                            src={ad.imageUrl} 
                            alt={ad.title} 
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                            containerClassName="w-full h-full flex items-center justify-center"
                            referrerPolicy="no-referrer" 
                            loading="lazy"
                          />
                          <div className="absolute top-3 right-3">
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                              <Handshake size={11} /> Aliado
                            </span>
                          </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {ad.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                              {ad.description}
                            </p>
                            
                            {ad.offersTradeDiscount && (
                              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                                  <Tag size={13} className="text-indigo-600 dark:text-indigo-400" />
                                  Beneficio Gremio: {ad.tradeDiscountDetails}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  * Presentá tu perfil en <strong>Bahía Oficios</strong> para acceder.
                                </p>
                              </div>
                            )}
                          </div>

                          {ad.link && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                              <a 
                                href={ad.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                              >
                                Conocer más sobre esta empresa <ArrowRight size={14} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {ads.map((ad) => (
                  <div 
                    key={ad.id} 
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-800 overflow-hidden h-full flex flex-col transition-all duration-200 group"
                  >
                    <div className="relative h-44 overflow-hidden bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center p-4 border-b border-slate-100 dark:border-slate-800">
                      <CachedImage 
                        src={ad.imageUrl} 
                        alt={ad.title} 
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                        containerClassName="w-full h-full flex items-center justify-center"
                        referrerPolicy="no-referrer" 
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <Handshake size={11} /> Aliado
                        </span>
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {ad.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                          {ad.description}
                        </p>
                        
                        {ad.offersTradeDiscount && (
                          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700">
                            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs mb-1">
                              <Tag size={13} className="text-indigo-600 dark:text-indigo-400" />
                              Beneficio Gremio: {ad.tradeDiscountDetails}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                              * Presentá tu perfil en <strong>Bahía Oficios</strong> para acceder.
                            </p>
                          </div>
                        )}
                      </div>

                      {ad.link && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                          <a 
                            href={ad.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            Conocer más sobre esta empresa <ArrowRight size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* Beneficios Exclusivos y Publicidad para Negocios (Side by Side) */}
      <div className="bg-white dark:bg-slate-950 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Beneficios Exclusivos */}
            <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 text-white flex flex-col justify-between shadow-sm border border-slate-800 h-full relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Tag size={13} />
                  Beneficios Exclusivos
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight">Descuentos para el Gremio</h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  ¿Sos profesional registrado? Aprovechá descuentos y convenios exclusivos en casas de repuestos, materiales y corralones de Bahía Blanca.
                </p>
              </div>
              <div className="relative z-10 pt-2">
                <Link 
                  to="/beneficios"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-98"
                >
                  Ver Beneficios del Gremio
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Publicidad para Negocios */}
            <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 text-white flex flex-col justify-between shadow-sm border border-slate-800 h-full relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
                  <Megaphone size={13} />
                  Publicidad para Comercios
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-3 tracking-tight">¿Tenés un Comercio o Corralón?</h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  Llegá a miles de clientes potenciales y profesionales en Bahía Blanca. Publicitá tu negocio con presencia destacada en la plataforma.
                </p>
              </div>
              <div className="relative z-10 pt-2">
                <Link 
                  to="/publicitar"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-98"
                >
                  Publicitar mi Comercio
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Strategic Section: Rubros Prioritarios de Bahía Blanca */}
      <section className="bg-slate-50 dark:bg-slate-900/60 py-16 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-3">
              <MapPin size={13} className="text-indigo-600 dark:text-indigo-400" />
              Guía Oficial de Rubros en Bahía Blanca
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Plomeros, Gasistas, Electricistas, Techistas y Corralones
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Los 5 servicios y oficios con mayor demanda en Bahía Blanca. Contactá al instante a profesionales calificados y cotizá materiales para tu obra sin intermediarios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {/* Plomeros */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full">
                    Urgencias & Destapaciones
                  </span>
                  <span className="text-xs text-slate-400">Bahía Blanca</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  Plomeros en Bahía Blanca
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Destapaciones cloacales con máquina, reparación de pérdidas de agua, cambio de canillas e instalación de termotanques y cañerías en termofusión.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Destapaciones 24hs</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Termofusión</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Presupuesto gratis</span>
                </div>
              </div>
              <Link 
                to="/rubro/plomero" 
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Ver Plomeros Disponibles <ArrowRight size={14} />
              </Link>
            </div>

            {/* Gasistas */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full">
                    Matriculados Camuzzi
                  </span>
                  <span className="text-xs text-slate-400">Bahía Blanca</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  Gasistas Matriculados
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Trámites y planos ante Camuzzi Gas del Sur, colocación de calefactores tiro balanceado, pruebas de hermeticidad certificadas y detección de fugas.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Habilitación Camuzzi</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Calefactores</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Matrícula al día</span>
                </div>
              </div>
              <Link 
                to="/rubro/gasista" 
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Ver Gasistas Matriculados <ArrowRight size={14} />
              </Link>
            </div>

            {/* Electricistas */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
                    EDES & Guardia 24hs
                  </span>
                  <span className="text-xs text-slate-400">Bahía Blanca</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  Electricistas en Bahía Blanca
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Reparación de cortocircuitos urgentes, bajadas de luz y pilares reglamentarios para EDES, tableros con disyuntores y recableado de viviendas.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Pilares EDES</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Urgencias 24hs</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Certificados CAE</span>
                </div>
              </div>
              <Link 
                to="/rubro/electricista" 
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Ver Electricistas Disponibles <ArrowRight size={14} />
              </Link>
            </div>

            {/* Techistas */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
                    Arreglo de Techos & Goteras
                  </span>
                  <span className="text-xs text-slate-400">Bahía Blanca</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  Techistas en Bahía Blanca
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Filtraciones por tormentas, colocación de membrana asfáltica, cambio de chapas cincalum, limpieza de canaletas y zinguería a medida.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Chapas & Tirantes</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Membrana asfáltica</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Zinguería</span>
                </div>
              </div>
              <Link 
                to="/rubro/techista" 
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                Ver Techistas Calificados <ArrowRight size={14} />
              </Link>
            </div>

            {/* Materiales de Construcción */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between md:col-span-2 lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full">
                    Corralones & Flete en Obra
                  </span>
                  <span className="text-xs text-slate-400">Bahía Blanca y la Región</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                  Materiales de Construcción & Corralones
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  Cotizá bolsas y bolsones de arena, piedra partida, cemento Loma Negra, cal, ladrillos huecos y perfiles de hierro con entrega directa en camión hidrogrúa en tu obra o domicilio.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Arena & Cemento</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Ladrillos huecos</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Flete a domicilio</span>
                  <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">✓ Beneficio Gremio</span>
                </div>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <Link 
                  to="/rubro/materiales-de-construccion" 
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  Ver Corralones y Materiales <ArrowRight size={14} />
                </Link>
                <Link 
                  to="/beneficios" 
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                >
                  Descuentos Gremio
                </Link>
              </div>
            </div>
          </div>

          {/* Homepage FAQ Section para posicionamiento orgánico en Google */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle size={22} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Preguntas Frecuentes sobre Oficios y Materiales en Bahía Blanca
              </h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: '¿Cómo contratar un plomero o gasista matriculado urgente en Bahía Blanca?',
                  a: 'En Bahía Oficios podés filtrar por rubro y barrio (Centro, Villa Mitre, Palihue, etc.) y contactar directamente por WhatsApp al profesional para acordar el horario de visita y presupuesto sin costo ni intermediarios.'
                },
                {
                  q: '¿Los electricistas y techistas atienden emergencias por cortocircuitos o goteras?',
                  a: 'Sí, podés usar el filtro "Urgencias 24h" para encontrar especialistas con guardia activa listos para acudir a cortes de luz o filtraciones urgentes causadas por tormentas y vientos en la ciudad.'
                },
                {
                  q: '¿Dónde comprar materiales de construcción y cómo pedir presupuesto de corralón?',
                  a: 'A través de la sección de Materiales de Construcción podés cotizar arena, cemento, hierro y ladrillos con los corralones y distribuidoras asociadas de Bahía Blanca que cuentan con flete con grúa a domicilio.'
                },
                {
                  q: '¿Bahía Oficios cobra alguna comisión por pedir presupuesto o contratar?',
                  a: 'No, Bahía Oficios es un directorio 100% libre de comisiones para clientes y vecinos. El trato y el pago se acuerdan directamente entre vos y el profesional.'
                }
              ].map((faq, index) => {
                const isOpen = openHomeFaq === index;
                return (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenHomeFaq(isOpen ? null : index)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp size={18} className="text-indigo-600 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Solo para usuarios autenticados si buscan un servicio */}
      {currentUser && (
        <div className="bg-slate-50 dark:bg-slate-900/50 py-16 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  ¿Buscás resolver un arreglo o proyecto en tu hogar?
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Explorá nuestra guía completa de profesionales verificados en Bahía Blanca y contactá directamente por WhatsApp al especialista que necesitás.
                </p>
              </div>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-sm active:scale-95 shrink-0"
              >
                Buscar Profesionales
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
