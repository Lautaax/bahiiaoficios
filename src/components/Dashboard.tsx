import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { ProfessionalCard } from './ProfessionalCard';
import { EmpresasColaboradoras } from './EmpresasColaboradoras';
import { Skeleton } from './ui/Skeleton';
import { Search, Filter, MapPin, Crown, X, ChevronDown, House, Wrench, Car, Megaphone, Sparkles, MessageSquare, ShieldCheck, CheckCircle, Tag, Scale, Scissors, Heart, Star, Briefcase, Clock, ExternalLink, CheckCircle2, DollarSign, Building2, Handshake, ChevronLeft, ChevronRight, Award, Mic, MicOff } from 'lucide-react';
import { PROFESSIONS, ZONAS } from '../constants';
import { api } from '../services/api';
import { isVipActive } from '../utils/vipUtils';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { safeLocalStorage, safeSessionStorage } from '../utils/storage';

// Helper to normalize strings (remove accents)
const normalizeString = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize from URL or defaults
  const [selectedRubro, setSelectedRubro] = useState<string>(searchParams.get('rubro') || 'Todos');
  const [selectedZona, setSelectedZona] = useState<string>(searchParams.get('zona') || 'Todas');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(searchParams.get('disponibilidad') === 'true');
  const [haceUrgencias, setHaceUrgencias] = useState(searchParams.get('urgencias') === 'true');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favoritos') === 'true');
  const [minRating, setMinRating] = useState<number>(Number(searchParams.get('rating')) || 0);
  const [sortBy, setSortBy] = useState<'score' | 'rating' | 'reviews'>(searchParams.get('sort') as any || 'score');
  
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);
  const [showVipWelcome, setShowVipWelcome] = useState(false);
  const [isRubroOpen, setIsRubroOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const professionalsPerPage = 12;

  const { isListening, speechFeedback, toggleListening } = useVoiceSearch({
    onResult: (transcript) => {
      setSearchTerm(transcript);
      setSelectedRubro('Todos');
      api.trackSearch(transcript);
    }
  });

  // Update URL when filters change
  useEffect(() => {
    const params: Record<string, string> = {};
    
    let finalRubro = selectedRubro;
    let finalSearchTerm = searchTerm;

    // Smart search: if searching for a rubro name, switch to that rubro
    if (searchTerm && selectedRubro === 'Todos') {
      const normalizedSearch = normalizeString(searchTerm);
      const matchedProfession = PROFESSIONS.find(p => normalizeString(p.name) === normalizedSearch);
      if (matchedProfession) {
        finalRubro = matchedProfession.name;
        finalSearchTerm = '';
        setSelectedRubro(finalRubro);
        setSearchTerm('');
      }
    }

    if (finalRubro !== 'Todos') params.rubro = finalRubro;
    if (selectedZona !== 'Todas') params.zona = selectedZona;
    if (finalSearchTerm) params.search = finalSearchTerm;
    if (haceUrgencias) params.urgencias = 'true';
    if (disponibilidadInmediata) params.disponibilidad = 'true';
    if (showFavoritesOnly) params.favoritos = 'true';
    if (minRating > 0) params.rating = minRating.toString();
    if (sortBy !== 'score') params.sort = sortBy;
    
    setSearchParams(params, { replace: true });
    setCurrentPage(1); // Reset to first page on filter change
  }, [selectedRubro, selectedZona, searchTerm, haceUrgencias, disponibilidadInmediata, showFavoritesOnly, minRating]);

  useEffect(() => {
    if (currentUser?.rol === 'profesional' && currentUser?.profesionalInfo?.isVip) {
      // Check if we've already shown this message in this session
      const hasSeenVipMessage = safeSessionStorage.getItem('hasSeenVipMessage');
      if (!hasSeenVipMessage) {
        setShowVipWelcome(true);
        safeSessionStorage.setItem('hasSeenVipMessage', 'true');
      }
    }
  }, [currentUser]);

  // Fetch professionals from Firestore
  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      setIndexErrorLink(null);
      try {
        const usersRef = collection(db, 'usuarios');
        
        // Try optimal query first
        try {
          const q = query(
            usersRef, 
            where('rol', '==', 'profesional'),
            orderBy('profesionalInfo.isVip', 'desc'),
            orderBy('profesionalInfo.ratingAvg', 'desc'),
            limit(100) // Fetch more results for pagination/filtering
          );

          const querySnapshot = await getDocs(q);
          const docs = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
          setProfessionals(docs);
        } catch (error: any) {
          // If index is missing, fallback to simple query and client-side sort
          if (error.code === 'failed-precondition' && error.message.includes('index')) {
             console.warn("Missing index, falling back to client-side sort");
             const simpleQ = query(
               usersRef,
               where('rol', '==', 'profesional'),
               limit(200)
             );
             const querySnapshot = await getDocs(simpleQ);
             let docs = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
             
             // Client-side sort
             docs = docs.sort((a, b) => {
                const isVipA = isVipActive(a.profesionalInfo);
                const isVipB = isVipActive(b.profesionalInfo);

                if (isVipA && !isVipB) return -1;
                if (!isVipA && isVipB) return 1;
                return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
             });
             
             setProfessionals(docs);
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        console.error("Error fetching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, []);

  // Client-side filtering for Rubro, Zona, and Search Term
  // (Doing this client-side allows for more flexible text search without Algolia/Elasticsearch)
  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => {
      const isCategory = PROFESSIONS.some(prof => prof.category === selectedRubro);
      const professionsInCategory = isCategory ? PROFESSIONS.filter(prof => prof.category === selectedRubro).map(prof => prof.name) : [];

      const matchesRubro = selectedRubro === 'Todos' || 
        (isCategory ? 
          ((p.profesionalInfo?.rubros && p.profesionalInfo.rubros.some(r => professionsInCategory.includes(r))) || 
          (p.profesionalInfo?.rubro && professionsInCategory.includes(p.profesionalInfo.rubro)))
          :
          ((p.profesionalInfo?.rubros && p.profesionalInfo.rubros.includes(selectedRubro)) || 
          p.profesionalInfo?.rubro === selectedRubro)
        );
      const matchesZona = !selectedZona || selectedZona === 'Todas' || (p.zona && normalizeString(p.zona).includes(normalizeString(selectedZona)));
      
      const term = normalizeString(searchTerm.trim());
      const matchesSearch = !term || 
        normalizeString(p.nombre).includes(term) || 
        normalizeString(p.profesionalInfo?.descripcion || '').includes(term) ||
        normalizeString(p.zona).includes(term) ||
        (p.profesionalInfo?.rubros && p.profesionalInfo.rubros.some(r => normalizeString(r).includes(term))) ||
        normalizeString(p.profesionalInfo?.rubro || '').includes(term);

      const matchesDisponibilidad = !disponibilidadInmediata || p.profesionalInfo?.disponibilidadInmediata;
      const matchesUrgencias = !haceUrgencias || p.profesionalInfo?.haceUrgencias;

      let isFav = false;
      if (showFavoritesOnly) {
        if (currentUser && currentUser.favoritos) {
          isFav = currentUser.favoritos.includes(p.uid);
        } else {
          try {
            const favorites = JSON.parse(safeLocalStorage.getItem('favorites') || '[]');
            isFav = Array.isArray(favorites) && favorites.includes(p.uid);
          } catch {
            isFav = false;
          }
        }
      }
      const matchesFavorites = !showFavoritesOnly || isFav;
      const matchesRating = !minRating || (p.profesionalInfo?.ratingAvg || 0) >= minRating;

      return matchesRubro && matchesZona && matchesSearch && matchesDisponibilidad && matchesUrgencias && matchesFavorites && matchesRating;
    });
  }, [professionals, selectedRubro, selectedZona, searchTerm, disponibilidadInmediata, haceUrgencias, showFavoritesOnly, currentUser?.favoritos, minRating]);

  // Sort professionals by gamification score or selected criteria
  const sortedProfessionals = useMemo(() => {
    return [...filteredProfessionals].sort((a, b) => {
      // VIP always first
      const isVipA = isVipActive(a.profesionalInfo);
      const isVipB = isVipActive(b.profesionalInfo);
      if (isVipA && !isVipB) return -1;
      if (!isVipA && isVipB) return 1;

      if (sortBy === 'rating') {
        const diff = (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
        if (diff !== 0) return diff;
        // Secondary sort by review count if rating is equal
        return (b.profesionalInfo?.reviewCount || 0) - (a.profesionalInfo?.reviewCount || 0);
      }

      if (sortBy === 'reviews') {
        const diff = (b.profesionalInfo?.reviewCount || 0) - (a.profesionalInfo?.reviewCount || 0);
        if (diff !== 0) return diff;
        // Secondary sort by rating if review count is equal
        return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
      }

      // Default: Score based sorting (gamification)
      // Calculate score for A
      let scoreA = 0;
      if (a.profesionalInfo) {
        scoreA += (a.profesionalInfo.ratingAvg || 0) * 10;
        scoreA += (a.profesionalInfo.reviewCount || 0) * 2;
        scoreA += (a.profesionalInfo.fotosTrabajos?.length || 0) * 1;
        if (a.profesionalInfo.matriculado) scoreA += 15;
        if (a.profesionalInfo.isVerified) scoreA += 10;
        if (a.fotoUrl) scoreA += 5;
        if (a.profesionalInfo.descripcion && a.profesionalInfo.descripcion.length > 50) scoreA += 5;
      }

      // Calculate score for B
      let scoreB = 0;
      if (b.profesionalInfo) {
        scoreB += (b.profesionalInfo.ratingAvg || 0) * 10;
        scoreB += (b.profesionalInfo.reviewCount || 0) * 2;
        scoreB += (b.profesionalInfo.fotosTrabajos?.length || 0) * 1;
        if (b.profesionalInfo.matriculado) scoreB += 15;
        if (b.profesionalInfo.isVerified) scoreB += 10;
        if (b.fotoUrl) scoreB += 5;
        if (b.profesionalInfo.descripcion && b.profesionalInfo.descripcion.length > 50) scoreB += 5;
      }

      return scoreB - scoreA;
    });
  }, [filteredProfessionals]);

  // Calculate Popular Categories based on supply (count of professionals in each category)
  // This makes the list dynamic based on the actual data
  const popularCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    
    professionals.forEach(p => {
      const rubros = p.profesionalInfo?.rubros || (p.profesionalInfo?.rubro ? [p.profesionalInfo.rubro] : []);
      rubros.forEach(r => {
        const profession = PROFESSIONS.find(prof => prof.name === r);
        if (profession && profession.category) {
          counts[profession.category] = (counts[profession.category] || 0) + 1;
        }
      });
    });

    const uniqueCategories = Array.from(new Set(PROFESSIONS.map(p => p.category || 'Otros')));

    // Sort by count descending
    return uniqueCategories
      .sort((a, b) => {
        const countA = counts[a] || 0;
        const countB = counts[b] || 0;
        return countB - countA; // Descending order
      })
      .slice(0, 4); // Show top 4
  }, [professionals]);

  // Pagination
  const totalPages = Math.ceil(sortedProfessionals.length / professionalsPerPage);
  const currentProfessionals = sortedProfessionals.slice(
    (currentPage - 1) * professionalsPerPage,
    currentPage * professionalsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRubro, selectedZona, searchTerm, disponibilidadInmediata, haceUrgencias]);

  const rubros = ['Todos', ...PROFESSIONS.map(p => p.name)];
  const zonas = ['Todas', ...ZONAS];

  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-900 dark:text-slate-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Quote Requests */}
        {currentUser?.rol === 'cliente' && (
          <ClientQuoteRequests />
        )}

        {/* VIP Welcome Message */}
        {showVipWelcome && (
          <div className="mb-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 relative shadow-sm">
            <button 
              onClick={() => setShowVipWelcome(false)}
              className="absolute top-4 right-4 text-amber-800 hover:text-amber-900 dark:text-amber-300"
            >
              <X size={20} />
            </button>
            <div className="flex items-start gap-4">
              <div className="bg-amber-500 p-3 rounded-2xl text-slate-950 shadow-sm">
                <Crown size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-950 dark:text-amber-200 mb-1">¡Bienvenido al Club VIP!</h3>
                <p className="text-sm text-amber-900 dark:text-amber-300/90 leading-relaxed">
                  Tu perfil ahora está destacado y aparecerá con máxima prioridad en los resultados de búsqueda de Bahía Blanca.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero / Search Section */}
        <div className="mb-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-3 py-1 rounded-full mb-2 border border-indigo-100 dark:border-indigo-900">
              <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Directorio Profesional Verificado • Bahía Blanca</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Encontrá al experto que necesitás
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Conectamos vecinos con los mejores profesionales de oficios en Bahía Blanca. 
              Electricistas, gasistas, plomeros y más, calificados por la comunidad.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Buscador con Búsqueda por Voz */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-20 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-xs"
                placeholder="Buscar por nombre, rubro o servicio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value) {
                    setSelectedRubro('Todos');
                    api.trackSearch(e.target.value);
                  }
                }}
              />

              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    title="Borrar búsqueda"
                  >
                    <X size={15} />
                  </button>
                )}

                {/* Botón de Búsqueda por Voz */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Detener dictado por voz" : "Búsqueda por voz (dictar)"}
                  className={`p-1.5 rounded-lg transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/30'
                      : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mic size={16} className={isListening ? 'animate-bounce' : ''} />
                </button>
              </div>

              {/* Feedback de voz */}
              {speechFeedback && (
                <div 
                  className={`absolute left-0 -bottom-8 z-20 px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 shadow-md ${
                    isListening
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-white animate-ping' : 'bg-indigo-400'}`}></span>
                  <span>{speechFeedback}</span>
                </div>
              )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3">
                {/* Filtro Rubro */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <Filter className="h-4 w-4 text-slate-400" />
                  </div>
                  
                  <button
                    onClick={() => setIsRubroOpen(!isRubroOpen)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-xs flex items-center justify-between text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {selectedRubro === 'Todos' ? (
                        <span className="text-slate-600 dark:text-slate-300">Todos los Rubros</span>
                      ) : (
                        <>
                          {(() => {
                            const p = PROFESSIONS.find(p => p.name === selectedRubro);
                            const Icon = p?.icon;
                            return Icon ? <Icon size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" /> : null;
                          })()}
                          <span className="text-slate-900 dark:text-white font-medium truncate">{selectedRubro}</span>
                        </>
                      )}
                    </div>
                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${isRubroOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRubroOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsRubroOpen(false)}
                      ></div>
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 shadow-xl max-h-80 rounded-xl py-1 text-sm border border-slate-200 dark:border-slate-700 overflow-auto focus:outline-none custom-scrollbar">
                        <div
                          className={`cursor-pointer select-none relative py-2.5 pl-3 pr-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedRubro === 'Todos' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-900 dark:text-slate-100'}`}
                          onClick={() => {
                            setSelectedRubro('Todos');
                            setIsRubroOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          <span className="block truncate ml-7">Todos los Rubros</span>
                        </div>
                        {Object.entries(
                          PROFESSIONS.reduce((acc, profession) => {
                            const category = profession.category || 'Otros';
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(profession);
                            return acc;
                          }, {} as Record<string, typeof PROFESSIONS>)
                        ).map(([category, professions]) => (
                          <div key={category}>
                            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50">
                              {category}
                            </div>
                            {professions.map((profession) => (
                              <div
                                key={profession.name}
                                className={`cursor-pointer select-none relative py-2.5 pl-3 pr-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2.5 ${selectedRubro === profession.name ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-800 dark:text-slate-200'}`}
                                onClick={() => {
                                  setSelectedRubro(profession.name);
                                  setIsRubroOpen(false);
                                  setSearchTerm('');
                                  api.trackSearch(profession.name);
                                }}
                              >
                                <profession.icon size={16} className={`${selectedRubro === profession.name ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                <span className="block truncate">
                                  {profession.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Filtro Zona */}
                <div className="relative min-w-[170px] flex-1 sm:flex-initial">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                      type="text"
                      value={selectedZona}
                      onChange={(e) => setSelectedZona(e.target.value)}
                      placeholder="Zona o Barrio"
                      className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-xs"
                      list="dashboard-zonas-list"
                  />
                  <datalist id="dashboard-zonas-list">
                    {ZONAS.map(z => (
                      <option key={z} value={z} />
                    ))}
                  </datalist>
                </div>

                {/* Ordenar por */}
                <div className="relative min-w-[150px] flex-1 sm:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="block w-full pl-3.5 pr-9 py-3 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-xs appearance-none"
                  >
                    <option value="score">Recomendados</option>
                    <option value="rating">Mejor Calificados</option>
                    <option value="reviews">Más Reseñas</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={15} className="text-slate-400" />
                  </div>
                </div>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                    showAdvancedFilters || disponibilidadInmediata || haceUrgencias
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/70 dark:border-indigo-800 dark:text-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Filter size={16} />
                  <span>Filtros</span>
                </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
            <button
              onClick={() => setDisponibilidadInmediata(!disponibilidadInmediata)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                disponibilidadInmediata
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${disponibilidadInmediata ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
              Disponible Ahora
            </button>
            <button
              onClick={() => setHaceUrgencias(!haceUrgencias)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                haceUrgencias
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${haceUrgencias ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
              Urgencias 24h
            </button>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                showFavoritesOnly
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <Heart size={13} className={showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
              Mis Guardados
            </button>
            
            {selectedRubro !== 'Todos' && (
              <button
                onClick={() => setSelectedRubro('Todos')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
              >
                <span>{selectedRubro}</span>
                <X size={13} />
              </button>
            )}
            
            {selectedZona !== 'Todas' && (
              <button
                onClick={() => setSelectedZona('Todas')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
              >
                <span>{selectedZona}</span>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs animate-in fade-in slide-in-from-top-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Filtros Avanzados</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={disponibilidadInmediata}
                    onChange={(e) => setDisponibilidadInmediata(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span>Disponibilidad Inmediata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={haceUrgencias}
                    onChange={(e) => setHaceUrgencias(e.target.checked)}
                    className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500"
                  />
                  <span>Atención de Urgencias 24h</span>
                </label>
                
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <span>Rating mínimo:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setMinRating(minRating === star ? 0 : star)}
                        className={`p-0.5 transition-colors ${minRating >= star ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-200'}`}
                      >
                        <Star size={16} className={minRating >= star ? 'fill-current' : ''} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Banner */}
        <div className="mb-10 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-none">
          <ShieldCheck className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 mb-1">Tips para una contratación segura</h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Pide siempre un presupuesto detallado por escrito. Revisa las reseñas de otros bahienses en el perfil del profesional. Para trabajos de gas o electricidad, verifica que el profesional esté matriculado (busca la insignia verde).
            </p>
          </div>
        </div>

        {/* Index Error Alert */}
        {indexErrorLink && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  ⚠️ <strong>Atención Desarrollador:</strong> Falta un índice en Firestore para ordenar los resultados.
                  <br />
                  <a href={indexErrorLink} target="_blank" rel="noopener noreferrer" className="font-bold underline text-yellow-800 hover:text-yellow-900">
                    Haz clic aquí para crear el índice automáticamente en la consola de Firebase.
                  </a>
                  <br />
                  (Mientras tanto, se muestran datos de prueba).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Grid Header with enhanced style for Profesionales Destacados */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-3 py-1 rounded-full mb-1.5 border border-indigo-100 dark:border-indigo-900">
              <Award size={13} className="text-indigo-600 dark:text-indigo-400" />
              Guía Oficial de Prestadores
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Profesionales en Bahía Blanca
              <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full">
                {sortedProfessionals.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Priorizando perfiles <strong className="text-amber-600 dark:text-amber-400">Destacados VIP</strong>, verificación de matrícula y mejores calificaciones
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              {sortBy === 'score' ? 'Orden: Destacados y Calificación' : sortBy === 'rating' ? 'Orden: Mejor Calificados' : 'Orden: Más Reseñas'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 auto-rows-fr">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between h-full space-y-3">
                <Skeleton className="w-full h-16 rounded-xl" />
                <div className="flex items-end justify-between -mt-8 px-1">
                  <Skeleton className="w-14 h-14 rounded-full border-2 border-white dark:border-slate-800" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-1.5 pt-1">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-8 w-full rounded-md" />
                <Skeleton className="h-8 w-full rounded-md" />
                <div className="flex gap-2 pt-2 mt-auto">
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 auto-rows-fr">
                {currentProfessionals.map(prof => (
                    <ProfessionalCard key={prof.uid} professional={prof} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      title="Anterior"
                      aria-label="Página anterior"
                    >
                      <ChevronDown size={18} className="rotate-90" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {/* First Page */}
                      {currentPage > 2 && (
                        <>
                          <button
                            onClick={() => handlePageChange(1)}
                            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                          >
                            1
                          </button>
                          {currentPage > 3 && <span className="px-1.5 text-slate-400 text-xs">...</span>}
                        </>
                      )}

                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => Math.abs(page - currentPage) <= 1)
                        .map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-10 h-10 rounded-xl border font-semibold text-xs transition-all ${
                              currentPage === page
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                      {/* Last Page */}
                      {currentPage < totalPages - 1 && (
                        <>
                          {currentPage < totalPages - 2 && <span className="px-1.5 text-slate-400 text-xs">...</span>}
                          <button
                            onClick={() => handlePageChange(totalPages)}
                            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      title="Siguiente"
                      aria-label="Página siguiente"
                    >
                      <ChevronDown size={18} className="-rotate-90" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Página {currentPage} de {totalPages}
                  </p>
                </div>
              )}
            </>
        )}

        {!loading && sortedProfessionals.length === 0 && (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <Briefcase size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              No se encontraron profesionales
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Probá ajustando los términos de búsqueda, cambiando la zona o seleccionando "Todos los Rubros".
            </p>
          </div>
        )}

        {/* Empresas Colaboradoras al final de la página */}
        <div className="mt-14">
          <EmpresasColaboradoras />
        </div>
      </main>
    </div>
  );
};

const ClientQuoteRequests: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const handleDepositPayment = async (requestId: string, profesionalId: string) => {
    if (!currentUser) return;
    setPaying(requestId);
    try {
      const response = await fetch('/api/create_preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Seña de Servicio',
          price: 10000,
          userEmail: currentUser.email,
          type: 'deposit',
          metadata: {
            user_id: currentUser.uid,
            profesional_id: profesionalId,
            request_id: requestId,
            type: 'deposit'
          }
        }),
      });

      const data = await response.json();
      if (data.id) {
        window.location.href = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.id}`;
      } else {
        alert('Error al crear la preferencia de pago.');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Hubo un error al iniciar el pago.');
    } finally {
      setPaying(null);
    }
  };

  useEffect(() => {
    const fetchRequestsAndJobs = async () => {
      if (!currentUser) return;
      try {
        // 1. Direct quote requests
        const qDirect = query(
          collection(db, 'quoteRequests'),
          where('clienteId', '==', currentUser.uid)
        );
        const snapDirect = await getDocs(qDirect);
        const reqs = snapDirect.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reqs.sort((a: any, b: any) => {
          const dateA = a.fecha?.toDate?.() || new Date(0);
          const dateB = b.fecha?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setRequests(reqs);

        // 2. Trabajos solicitados múltiples
        const qJobs = query(
          collection(db, 'trabajosSolicitados'),
          where('clienteId', '==', currentUser.uid)
        );
        const snapJobs = await getDocs(qJobs);
        const jobsList = snapJobs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        jobsList.sort((a: any, b: any) => {
          const dateA = a.fechaCreacion?.toDate?.() || new Date(0);
          const dateB = b.fechaCreacion?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setTrabajos(jobsList);
      } catch (error) {
        console.error("Error fetching client quote requests & jobs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequestsAndJobs();
  }, [currentUser]);

  if (loading) return null;
  if (requests.length === 0 && trabajos.length === 0) return null;

  return (
    <div className="mb-10 space-y-8 animate-in fade-in">
      {/* Sección Trabajos Solicitados y Presupuestos Recibidos */}
      {trabajos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-600 dark:text-indigo-400" />
                Tus Trabajos Publicados y Presupuestos Recibidos
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Propuestas de profesionales de Bahía Blanca para tus pedidos
              </p>
            </div>
            <Link
              to="/trabajos"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Ir al Tablón de Trabajos <ExternalLink size={13} />
            </Link>
          </div>

          <div className="space-y-4">
            {trabajos.map(trabajo => {
              const proposals = trabajo.presupuestos || [];
              return (
                <div key={trabajo.id} className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                          {trabajo.rubro}
                        </span>
                        <span className="text-xs text-slate-400">• {trabajo.zona}</span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                        {trabajo.titulo}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                        {proposals.length} {proposals.length === 1 ? 'Presupuesto recibido' : 'Presupuestos recibidos'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 leading-relaxed">
                    {trabajo.descripcion}
                  </p>

                  {/* Listado de presupuestos recibidos */}
                  {proposals.length > 0 ? (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-700/80 pt-4 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Ofertas de profesionales:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {proposals.map((prop: any) => {
                          const cleanPhone = prop.profesionalTelefono?.replace(/\D/g, '') || '';
                          const whatsappMsg = encodeURIComponent(
                            `Hola ${prop.profesionalNombre}, vi tu presupuesto de $${prop.montoEstimado} en Bahía Oficios para mi trabajo "${trabajo.titulo}".`
                          );
                          const isAccepted = prop.estado === 'aceptado';
                          return (
                            <div 
                              key={prop.id} 
                              className={`p-4 rounded-xl border transition-all ${
                                isAccepted 
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                                  : 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={prop.profesionalFoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(prop.profesionalNombre)}`}
                                    alt={prop.profesionalNombre}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                  />
                                  <div>
                                    <Link to={`/profesional/${prop.profesionalSlug || prop.profesionalId}`} className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-indigo-600">
                                      {prop.profesionalNombre}
                                    </Link>
                                    {prop.profesionalIsVip && (
                                      <span className="ml-1.5 text-[10px] bg-amber-400 text-slate-900 font-bold px-1.5 py-0.2 rounded">
                                        VIP
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                                  ${Number(prop.montoEstimado).toLocaleString('es-AR')}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                                "{prop.mensaje}"
                              </p>

                              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                <span className="text-slate-400 text-[11px]">
                                  Tiempo: {prop.tiempoEstimado}
                                </span>
                                <div className="flex items-center gap-2">
                                  {cleanPhone && (
                                    <a
                                      href={`https://wa.me/54${cleanPhone}?text=${whatsappMsg}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                    >
                                      WhatsApp →
                                    </a>
                                  )}
                                  <Link
                                    to="/trabajos"
                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                  >
                                    Gestionar
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs text-slate-500 text-center">
                      Aún no hay propuestas enviadas para este pedido. Te avisaremos en cuanto un profesional responda.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sección Solicitudes Directas */}
      {requests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tus Solicitudes Directas de Presupuesto</h2>
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">Solicitud de {req.rubro}</h3>
                    <p className="text-xs text-slate-400">{req.zona} • {new Date(req.fecha?.toDate()).toLocaleDateString()}</p>
                  </div>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-100 dark:border-indigo-900">
                    {req.respuestas?.length || 0}/3 Respuestas
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">{req.descripcion}</p>
                
                {req.respuestas && req.respuestas.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-700/80 pt-4">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Respuestas de Profesionales:</h4>
                    <div className="space-y-3">
                      {req.respuestas.map((resp: any, idx: number) => (
                        <div key={idx} className="bg-slate-50/80 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                          <div className="flex justify-between items-center mb-2">
                            <Link to={`/profesional/${resp.profesionalId}`} className="font-semibold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                              {resp.profesionalNombre}
                            </Link>
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">${resp.precio}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{resp.mensaje}</p>
                          <div className="mt-3 flex justify-end gap-2">
                            {resp.requiresDeposit && !resp.depositPaid && (
                              <button
                                onClick={() => handleDepositPayment(req.id, resp.profesionalId)}
                                disabled={paying === req.id}
                                className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1 disabled:opacity-50 border border-emerald-200 dark:border-emerald-800"
                              >
                                {paying === req.id ? 'Procesando...' : 'Pagar Seña ($10.000)'}
                              </button>
                            )}
                            {resp.requiresDeposit && resp.depositPaid && (
                              <span className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1">
                                <CheckCircle size={13} /> Seña Pagada
                              </span>
                            )}
                            <Link 
                              to={`/profesional/${resp.profesionalId}`}
                              className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1 border border-indigo-100 dark:border-indigo-900"
                            >
                              <MessageSquare size={13} /> Contactar
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
