import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Mic, MicOff, AlertCircle, MapPin, Star, SlidersHorizontal, X } from 'lucide-react';
import { searchProfessionals } from '../services/firestoreService';
import { User, Category } from '../types';
import { api } from '../services/api';
import { ProfessionalCard } from './ProfessionalCard';
import { SearchAutocomplete } from './SearchAutocomplete';
import { collection, getDocs, query as firestoreQuery, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ZONAS } from '../constants';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../context/AuthContext';
import { userSearchService } from '../services/userSearchService';

export function Search() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  const zonaParam = searchParams.get('zona') || 'Todas';
  const ratingParam = Number(searchParams.get('rating')) || 0;
  
  const [searchInput, setSearchInput] = useState(query);
  const [selectedZona, setSelectedZona] = useState<string>(zonaParam);
  const [minRating, setMinRating] = useState<number>(ratingParam);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Voice search state
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);

  // Sync search input when url query changes
  useEffect(() => {
    setSearchInput(query);
    setSelectedZona(searchParams.get('zona') || 'Todas');
    setMinRating(Number(searchParams.get('rating')) || 0);
  }, [query, searchParams]);

  // Load categories and professionals for autocomplete
  useEffect(() => {
    api.getCategories().then(setCategories);

    const loadProfessionalsForAutocomplete = async () => {
      try {
        const q = firestoreQuery(
          collection(db, 'usuarios'),
          where('rol', '==', 'profesional'),
          limit(100)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
        setAllProfessionals(list);
      } catch (err) {
        console.error("Error loading autocomplete professionals:", err);
      }
    };

    loadProfessionalsForAutocomplete();
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await searchProfessionals(query, categorySlug, selectedZona, minRating);
        setResults(data);

        // Track search analytics and persist recent search to Firestore
        if (query.trim() || categorySlug) {
          const effectiveTerm = query.trim() || categorySlug;
          analyticsService.trackSearch(effectiveTerm, {
            category: categorySlug,
            zona: selectedZona,
            resultsCount: data.length
          });
          userSearchService.saveRecentSearch(currentUser?.uid, effectiveTerm, {
            category: categorySlug,
            zona: selectedZona,
            resultsCount: data.length,
            userEmail: currentUser?.email
          });
        }
      } catch (error) {
        console.error("Error searching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, categorySlug, selectedZona, minRating]);

  const updateUrlParams = (newParams: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v && v !== 'Todas' && v !== '0') {
        nextParams.set(k, v);
      } else {
        nextParams.delete(k);
      }
    });
    setSearchParams(nextParams);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateUrlParams({
      q: searchInput.trim(),
      category: categorySlug,
      zona: selectedZona,
      rating: minRating.toString()
    });
  };

  const handleCategoryChange = (slug: string) => {
    updateUrlParams({
      q: query,
      category: slug === categorySlug ? '' : slug,
      zona: selectedZona,
      rating: minRating.toString()
    });
  };

  const handleZonaChange = (zona: string) => {
    setSelectedZona(zona);
    updateUrlParams({
      q: query,
      category: categorySlug,
      zona: zona,
      rating: minRating.toString()
    });
  };

  const handleRatingChange = (rating: number) => {
    const nextRating = minRating === rating ? 0 : rating;
    setMinRating(nextRating);
    updateUrlParams({
      q: query,
      category: categorySlug,
      zona: selectedZona,
      rating: nextRating.toString()
    });
  };

  const handleSelectProfession = (professionName: string) => {
    setSearchInput(professionName);
    updateUrlParams({
      q: professionName,
      category: categorySlug,
      zona: selectedZona,
      rating: minRating.toString()
    });
  };

  const handleSelectProfessional = (pro: User) => {
    navigate(`/profesional/${pro.slug || pro.uid}`);
  };

  // Web Speech API Voice Search
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechFeedback("Tu navegador no soporta búsqueda por voz. Recomendamos Google Chrome.");
      setTimeout(() => setSpeechFeedback(null), 4000);
      return;
    }

    if (isListening) {
      setIsListening(false);
      setSpeechFeedback(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-AR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback("Escuchando... Di la profesión que buscas (ej: Electricista, Plomero)");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleaned = transcript.trim();
          setSearchInput(cleaned);
          setSearchParams({ q: cleaned, category: categorySlug });
          setSpeechFeedback(`Buscando "${cleaned}"...`);
          setTimeout(() => setSpeechFeedback(null), 2500);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechFeedback("Permiso de micrófono no otorgado.");
        } else if (event.error === 'no-speech') {
          setSpeechFeedback("No se detectó audio. Por favor intenta de nuevo.");
        } else {
          setSpeechFeedback("No se pudo reconocer la voz.");
        }
        setTimeout(() => setSpeechFeedback(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      setIsListening(false);
      setSpeechFeedback("Error al iniciar el micrófono.");
      setTimeout(() => setSpeechFeedback(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <div className="relative flex-1 flex items-center">
              <SearchIcon className="absolute left-3.5 z-10 text-gray-400 w-5 h-5 pointer-events-none" />
              
              <SearchAutocomplete
                value={searchInput}
                onChange={setSearchInput}
                onSelectProfession={handleSelectProfession}
                onSelectProfessional={handleSelectProfessional}
                professionals={allProfessionals}
                placeholder="¿Qué arreglo o servicio necesitás solucionar hoy en Bahía?"
                inputClassName="w-full pl-10 pr-12 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm transition-all"
              />

              {/* Botón de Búsqueda por Voz */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                aria-label={isListening ? "Detener búsqueda por voz" : "Buscar por voz"}
                title={isListening ? "Escuchando..." : "Buscar por voz (Web Speech API)"}
                className={`absolute right-2.5 z-10 p-1.5 rounded-lg transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400'
                    : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>

            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                showFilters || selectedZona !== 'Todas' || minRating > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
              }`}
              title="Filtros por zona y calificación"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtros</span>
              {(selectedZona !== 'Todas' || minRating > 0) && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              )}
            </button>

            <button 
              type="submit" 
              className="bg-indigo-600 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shrink-0"
            >
              Buscar
            </button>
          </form>

          {/* Feedback de voz */}
          {speechFeedback && (
            <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 px-3 py-1.5 rounded-xl animate-in fade-in">
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-indigo-600'}`}></span>
              <span>{speechFeedback}</span>
            </div>
          )}

          {/* Panel de Filtros Avanzados (Zona y Calificación) */}
          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 rounded-2xl animate-in fade-in slide-in-from-top-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Zona en Bahía Blanca */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-indigo-500" />
                    Zona Geográfica en Bahía Blanca
                  </label>
                  <select
                    value={selectedZona}
                    onChange={(e) => handleZonaChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Todas">Toda Bahía Blanca</option>
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                {/* Rango de Calificación */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                    <Star size={13} className="text-amber-500 fill-amber-400" />
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
                        onClick={() => handleRatingChange(opt.val)}
                        className={`py-1.5 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          minRating === opt.val
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(selectedZona !== 'Todas' || minRating > 0) && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-700 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedZona('Todas');
                      setMinRating(0);
                      updateUrlParams({
                        q: query,
                        category: categorySlug,
                        zona: 'Todas',
                        rating: '0'
                      });
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Restablecer filtros
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Category Filters */}
          <div className="flex gap-2 mt-3.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                !categorySlug 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  categorySlug === cat.slug
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-750'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {loading ? 'Buscando profesionales...' : `${results.length} profesionales encontrados`}
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 animate-pulse border border-gray-100 dark:border-slate-700/80">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((pro) => (
              <ProfessionalCard key={pro.uid} professional={pro} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No se encontraron resultados</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Intenta buscando con otra profesión o limpiando los filtros aplicados.
            </p>
            <button 
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
              className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-800"
            >
              Limpiar búsqueda y filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

