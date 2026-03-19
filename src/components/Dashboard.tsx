import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { ProfessionalCard } from './ProfessionalCard';
import { Search, Filter, MapPin, Crown, X, ChevronDown, House, Wrench, Car, Megaphone, Sparkles, MessageSquare, ShieldCheck, CheckCircle } from 'lucide-react';
import { PROFESSIONS, ZONAS } from '../constants';

// Helper to normalize strings (remove accents)
const normalizeString = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubro, setSelectedRubro] = useState<string>('Todos');
  const [selectedZona, setSelectedZona] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [disponibilidadInmediata, setDisponibilidadInmediata] = useState(false);
  const [haceUrgencias, setHaceUrgencias] = useState(false);
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);
  const [showVipWelcome, setShowVipWelcome] = useState(false);
  const [isRubroOpen, setIsRubroOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    const search = searchParams.get('search');
    const rubro = searchParams.get('rubro');

    if (rubro) {
      setSelectedRubro(rubro);
      setSearchTerm('');
    } else if (search) {
      const term = search.trim();
      const normalizedSearch = normalizeString(term);
      
      // Check if the search term matches a profession name exactly (normalized)
      // This handles cases like "Gasista" or "gasista" -> Filter by Rubro: Gasista
      const matchedProfession = PROFESSIONS.find(p => normalizeString(p.name) === normalizedSearch);
      
      if (matchedProfession) {
        setSelectedRubro(matchedProfession.name);
        setSearchTerm('');
      } else {
        // Otherwise, it's a general search (name, description, etc.)
        setSelectedRubro('Todos');
        setSearchTerm(term);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUser?.rol === 'profesional' && currentUser?.profesionalInfo?.isVip) {
      // Check if we've already shown this message in this session
      const hasSeenVipMessage = sessionStorage.getItem('hasSeenVipMessage');
      if (!hasSeenVipMessage) {
        setShowVipWelcome(true);
        sessionStorage.setItem('hasSeenVipMessage', 'true');
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
            limit(20)
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
               limit(50)
             );
             const querySnapshot = await getDocs(simpleQ);
             let docs = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
             
             // Client-side sort
             docs = docs.sort((a, b) => {
                const isVipA = !!a.profesionalInfo?.isVip;
                const isVipB = !!b.profesionalInfo?.isVip;

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
      const matchesZona = selectedZona === 'Todas' || p.zona === selectedZona;
      
      const term = normalizeString(searchTerm.trim());
      const matchesSearch = !term || 
        normalizeString(p.nombre).includes(term) || 
        normalizeString(p.profesionalInfo?.descripcion || '').includes(term) ||
        normalizeString(p.zona).includes(term) ||
        (p.profesionalInfo?.rubros && p.profesionalInfo.rubros.some(r => normalizeString(r).includes(term))) ||
        normalizeString(p.profesionalInfo?.rubro || '').includes(term);

      const matchesDisponibilidad = !disponibilidadInmediata || p.profesionalInfo?.disponibilidadInmediata;
      const matchesUrgencias = !haceUrgencias || p.profesionalInfo?.haceUrgencias;

      return matchesRubro && matchesZona && matchesSearch && matchesDisponibilidad && matchesUrgencias;
    });
  }, [professionals, selectedRubro, selectedZona, searchTerm, disponibilidadInmediata, haceUrgencias]);

  // Sort professionals by gamification score
  const sortedProfessionals = useMemo(() => {
    return [...filteredProfessionals].sort((a, b) => {
      // VIP always first
      if (a.profesionalInfo?.isVip && !b.profesionalInfo?.isVip) return -1;
      if (!a.profesionalInfo?.isVip && b.profesionalInfo?.isVip) return 1;

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
      .slice(0, 6); // Show top 6
  }, [professionals]);

  const rubros = ['Todos', ...PROFESSIONS.map(p => p.name)];
  const zonas = ['Todas', ...ZONAS];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Client Quote Requests */}
        {currentUser?.rol === 'cliente' && (
          <ClientQuoteRequests />
        )}

        {/* VIP Welcome Message */}
        {showVipWelcome && (
          <div className="mb-8 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-xl p-6 relative shadow-sm">
            <button 
              onClick={() => setShowVipWelcome(false)}
              className="absolute top-4 right-4 text-amber-800 hover:text-amber-900"
            >
              <X size={20} />
            </button>
            <div className="flex items-start gap-4">
              <div className="bg-amber-400 p-3 rounded-full text-white shadow-md">
                <Crown size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900 mb-2">¡Bienvenido al Club VIP! 🌟</h3>
                <p className="text-amber-800">
                  Tu perfil ahora está destacado y aparecerá en los primeros resultados de búsqueda. 
                  ¡Prepárate para recibir más clientes!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero / Search Section */}
        <div className="mb-8 space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Encontrá al experto que necesitás</h2>
          <p className="text-gray-600 max-w-2xl">
            Conectamos clientes con los mejores profesionales de oficios en Bahía Blanca. 
            Electricistas, gasistas, plomeros y más, calificados por la comunidad.
          </p>

          <div className="flex flex-col lg:flex-row gap-4 mt-6">
            {/* Buscador */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
                placeholder="Buscar por nombre, zona o servicio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value) setSelectedRubro('Todos');
                }}
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-4">
                {/* Filtro Rubro */}
                <div className="relative min-w-[220px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Filter className="h-5 w-5 text-gray-400" />
                  </div>
                  
                  <button
                    onClick={() => setIsRubroOpen(!isRubroOpen)}
                    className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {selectedRubro === 'Todos' ? (
                        <span className="text-gray-700">Todos los Rubros</span>
                      ) : (
                        <>
                          {(() => {
                            const p = PROFESSIONS.find(p => p.name === selectedRubro);
                            const Icon = p?.icon;
                            return Icon ? <Icon size={16} className="text-indigo-600 shrink-0" /> : null;
                          })()}
                          <span className="text-gray-900 font-medium truncate">{selectedRubro}</span>
                        </>
                      )}
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isRubroOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRubroOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsRubroOpen(false)}
                      ></div>
                      <div className="absolute z-20 mt-1 w-full bg-white shadow-xl max-h-80 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm custom-scrollbar">
                        <div
                          className={`cursor-pointer select-none relative py-3 pl-3 pr-4 hover:bg-indigo-50 transition-colors ${selectedRubro === 'Todos' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-900'}`}
                          onClick={() => {
                            setSelectedRubro('Todos');
                            setIsRubroOpen(false);
                            setSearchTerm('');
                          }}
                        >
                          <span className="block truncate ml-8">Todos los Rubros</span>
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
                            <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                              {category}
                            </div>
                            {professions.map((profession) => (
                              <div
                                key={profession.name}
                                className={`cursor-pointer select-none relative py-3 pl-3 pr-4 hover:bg-indigo-50 transition-colors flex items-center gap-3 ${selectedRubro === profession.name ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-900'}`}
                                onClick={() => {
                                  setSelectedRubro(profession.name);
                                  setIsRubroOpen(false);
                                  setSearchTerm('');
                                }}
                              >
                                <profession.icon size={18} className={`${selectedRubro === profession.name ? 'text-indigo-600' : 'text-gray-400'}`} />
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
                <div className="relative min-w-[180px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <select
                    value={selectedZona}
                    onChange={(e) => setSelectedZona(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm appearance-none"
                >
                    {zonas.map(z => (
                    <option key={z} value={z}>{z}</option>
                    ))}
                </select>
                </div>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                    showAdvancedFilters || disponibilidadInmediata || haceUrgencias
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter size={18} />
                  Filtros Avanzados
                </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setDisponibilidadInmediata(!disponibilidadInmediata)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                disponibilidadInmediata
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${disponibilidadInmediata ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              Disponible Ahora
            </button>
            <button
              onClick={() => setHaceUrgencias(!haceUrgencias)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                haceUrgencias
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${haceUrgencias ? 'bg-red-500' : 'bg-gray-400'}`}></div>
              Urgencias 24h
            </button>
            
            {selectedRubro !== 'Todos' && (
              <button
                onClick={() => setSelectedRubro('Todos')}
                className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-2 hover:bg-indigo-200 transition-colors"
              >
                {selectedRubro}
                <X size={14} />
              </button>
            )}
            
            {selectedZona !== 'Todas' && (
              <button
                onClick={() => setSelectedZona('Todas')}
                className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-2 hover:bg-indigo-200 transition-colors"
              >
                {selectedZona}
                <X size={14} />
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Filtros Avanzados</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disponibilidadInmediata}
                    onChange={(e) => setDisponibilidadInmediata(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Disponibilidad Inmediata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={haceUrgencias}
                    onChange={(e) => setHaceUrgencias(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Atención de Urgencias 24h</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Security Banner */}
        <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="text-indigo-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-indigo-900 mb-1">Tips para una contratación segura</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Pide siempre un presupuesto detallado por escrito. Revisa las reseñas de otros bahienses en el perfil del profesional. Para trabajos de gas o electricidad, verifica que el profesional esté matriculado (busca la insignia verde).
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sectores Populares</h3>
            <button 
              onClick={() => setIsRubroOpen(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todos los rubros
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {popularCategories.map((category) => {
              const categoryIcons: Record<string, any> = {
                'Hogar y Construcción': House,
                'Servicios Generales': Wrench,
                'Automotor': Car,
                'Digital y Diseño': Megaphone,
                'Otros': Sparkles
              };
              const CategoryIcon = categoryIcons[category] || Sparkles;

              return (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedRubro(category === selectedRubro ? 'Todos' : category);
                    setSearchTerm('');
                  }}
                  className={`group flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    selectedRubro === category
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                      : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-3 transition-colors ${
                    selectedRubro === category ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                  }`}>
                    <CategoryIcon size={24} />
                  </div>
                  <span className={`text-sm font-medium text-center ${
                    selectedRubro === category ? 'text-indigo-700' : 'text-gray-700'
                  }`}>
                    {category}
                  </span>
                </button>
              );
            })}
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

        {/* Results Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {sortedProfessionals.length} Profesionales encontrados
          </h3>
          <span className="text-sm text-gray-500">Ordenado por: Destacados y Calificación</span>
        </div>

        {loading ? (
             <div className="flex justify-center py-12">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProfessionals.map(prof => (
                <ProfessionalCard key={prof.uid} professional={prof} />
            ))}
            </div>
        )}

        {!loading && sortedProfessionals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron profesionales con esos criterios.</p>
          </div>
        )}
      </main>
    </div>
  );
};

const ClientQuoteRequests: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
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
    const fetchRequests = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'quoteRequests'),
          where('clienteId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side by fecha desc
        reqs.sort((a: any, b: any) => {
          const dateA = a.fecha?.toDate?.() || new Date(0);
          const dateB = b.fecha?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setRequests(reqs);
      } catch (error) {
        console.error("Error fetching client quote requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [currentUser]);

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tus Solicitudes de Presupuesto</h2>
      <div className="space-y-4">
        {requests.map(req => (
          <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Solicitud de {req.rubro}</h3>
                <p className="text-sm text-gray-500">{req.zona} • {new Date(req.fecha?.toDate()).toLocaleDateString()}</p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                {req.respuestas?.length || 0}/3 Respuestas
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{req.descripcion}</p>
            
            {req.respuestas && req.respuestas.length > 0 && (
              <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Respuestas de Profesionales:</h4>
                <div className="space-y-3">
                  {req.respuestas.map((resp: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <Link to={`/profesional/${resp.profesionalId}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                          {resp.profesionalNombre}
                        </Link>
                        <span className="font-bold text-green-600 dark:text-green-400">${resp.precio}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{resp.mensaje}</p>
                      <div className="mt-3 flex justify-end gap-2">
                        {resp.requiresDeposit && !resp.depositPaid && (
                          <button
                            onClick={() => handleDepositPayment(req.id, resp.profesionalId)}
                            disabled={paying === req.id}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            {paying === req.id ? 'Procesando...' : 'Pagar Seña ($10.000)'}
                          </button>
                        )}
                        {resp.requiresDeposit && resp.depositPaid && (
                          <span className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                            <CheckCircle size={14} /> Seña Pagada
                          </span>
                        )}
                        <Link 
                          to={`/profesional/${resp.profesionalId}`}
                          className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-200 transition-colors flex items-center gap-1"
                        >
                          <MessageSquare size={14} /> Contactar
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
  );
};
