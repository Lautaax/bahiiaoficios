import React, { useState, useEffect } from 'react';
import { Search, MapPin, ArrowRight, Star, ShieldCheck, Users, Briefcase, MessageSquare, CheckCircle, Megaphone, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Category, User, Ad } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { ProfessionalCard } from './ProfessionalCard';
import { Tag, ChevronLeft, ChevronRight, Briefcase as BriefcaseIcon, Building2, Handshake } from 'lucide-react';
import { PROFESSIONS, ZONAS } from '../constants';
import { CachedImage } from './CachedImage';
import { preloadImages } from '../utils/imageCache';

export function Home() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredPros, setFeaturedPros] = useState<User[]>([]);
  const [currentProIndex, setCurrentProIndex] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [ads, setAds] = useState<Ad[]>([]);

  const [adsPerPage, setAdsPerPage] = useState(3);

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth < 640) {
        setCardsPerPage(1);
        setAdsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerPage(2);
        setAdsPerPage(2);
      } else {
        setCardsPerPage(4);
        setAdsPerPage(3);
      }
    };
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopularRubros = async () => {
      try {
        const q = query(
          collection(db, 'search_stats'),
          orderBy('searchCount', 'desc'),
          limit(4)
        );
        const snapshot = await getDocs(q);
        const popular = snapshot.docs.map(doc => doc.data());
        
        if (popular.length > 0) {
          setCategories(popular.map((p: any) => {
            const profession = PROFESSIONS.find(prof => prof.name === p.name);
            return {
              id: p.name,
              name: p.name,
              icon: profession?.icon || BriefcaseIcon
            };
          }));
        } else {
          // Fallback to default popular ones if no stats yet
          const defaults = ['Electricista', 'Plomero', 'Gasista', 'Albañil'];
          setCategories(defaults.map(name => {
            const profession = PROFESSIONS.find(prof => prof.name === name);
            return {
              id: name,
              name: name,
              icon: profession?.icon || BriefcaseIcon
            };
          }));
        }
      } catch (error) {
        // Fallback to default popular categories if stats collection is empty or restricted
        const defaults = ['Electricista', 'Plomero', 'Gasista', 'Albañil'];
        setCategories(defaults.map(name => {
          const profession = PROFESSIONS.find(prof => prof.name === name);
          return {
            id: name,
            name: name,
            icon: profession?.icon || BriefcaseIcon
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
        setFeaturedPros(selectedPros);
        
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
    if (searchTerm.trim()) {
      api.trackSearch(searchTerm.trim());
      navigate(`/dashboard?search=${encodeURIComponent(searchTerm.trim())}`);
    }
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
            
            <div className="bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
              <div className="flex-1 flex items-center px-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <Search className="text-slate-400 w-5 h-5 shrink-0" />
                <input 
                  type="text" 
                  placeholder="¿Qué servicio buscás? (ej. Electricista, Plomero)" 
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 py-3 px-3 text-sm sm:text-base outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button 
                onClick={handleSearch}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-8 py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center shrink-0 shadow-sm"
              >
                Buscar
              </button>
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
                to="/trabajos"
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95"
              >
                <Briefcase size={18} className="text-indigo-600" />
                Trabajos Solicitados
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
                  to={`/dashboard?rubro=${encodeURIComponent(cat.name)}`}
                  onClick={() => api.trackSearch(cat.name)}
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

      {/* Featured Professionals Section */}
      {featuredPros.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 py-16 overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div className="text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/50 px-3 py-1 rounded-full mb-2 border border-amber-200/60 dark:border-amber-800/50">
                  <Star size={13} className="fill-amber-500 text-amber-500" />
                  Recomendados de la Ciudad
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Profesionales Destacados
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Especialistas calificados y con mejor reputación en Bahía Blanca
                </p>
              </div>
              {featuredPros.length > cardsPerPage && (
                <div className="flex gap-2 self-end sm:self-auto">
                  <button 
                    onClick={() => setCurrentProIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentProIndex === 0}
                    aria-label="Anterior profesional"
                    className={`p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all ${currentProIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95'}`}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => setCurrentProIndex((prev) => Math.min(featuredPros.length - cardsPerPage, prev + 1))}
                    disabled={currentProIndex >= featuredPros.length - cardsPerPage}
                    aria-label="Siguiente profesional"
                    className={`p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all ${currentProIndex >= featuredPros.length - cardsPerPage ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95'}`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative overflow-hidden">
              <motion.div 
                className="flex"
                animate={{ x: `-${currentProIndex * (100 / cardsPerPage)}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {featuredPros.map((pro) => (
                  <div key={pro.uid} className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2.5">
                    <ProfessionalCard professional={pro} />
                  </div>
                ))}
              </motion.div>
            </div>
            
            <div className="mt-12 text-center">
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-98 text-sm"
              >
                Ver todos los profesionales de Bahía Blanca <ArrowRight size={15} />
              </Link>
            </div>
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
