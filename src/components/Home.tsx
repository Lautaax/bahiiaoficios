import React, { useState, useEffect } from 'react';
import { Search, MapPin, ArrowRight, Star, ShieldCheck, Users, Briefcase, MessageSquare, CheckCircle, Megaphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Category, User, Ad } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ProfessionalCard } from './ProfessionalCard';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';

export function Home() {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredPros, setFeaturedPros] = useState<User[]>([]);
  const [currentProIndex, setCurrentProIndex] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth < 640) setCardsPerPage(1);
      else if (window.innerWidth < 1024) setCardsPerPage(2);
      else setCardsPerPage(4);
    };
    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then(data => setCategories(data.slice(0, 8)));
    
    const fetchAds = async () => {
      try {
        const q = query(collection(db, 'ads'), where('active', '==', true), where('position', '==', 'home_carousel'));
        const snapshot = await getDocs(q);
        setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
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

        setFeaturedPros(sortedPros.slice(0, 8));
      } catch (error) {
        console.error("Error fetching featured pros:", error);
      }
    };

    fetchAds();
    fetchFeatured();
  }, []);

  useEffect(() => {
    if (ads.length > 0) {
      const timer = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [ads]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1581094794329-cd1096a7a5e6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Encontrá al profesional que necesitás en Bahía Blanca
            </h1>
            <p className="text-xl text-indigo-100 mb-10">
              La guía más completa de oficios y servicios verificados. Plomeros, electricistas, albañiles y más, a un click de distancia.
            </p>
            
            <div className="bg-white p-2 rounded-lg shadow-lg flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
              <div className="flex-1 flex items-center px-4 bg-gray-50 rounded-md">
                <Search className="text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="¿Qué estás buscando? (ej. Electricista)" 
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-500 py-3 px-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button 
                onClick={handleSearch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md font-bold text-lg transition-colors flex items-center justify-center"
              >
                Buscar
              </button>
            </div>
            
            <div className="mt-8 flex justify-center gap-6 text-sm font-medium text-indigo-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span>Perfiles Verificados</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-400" />
                <span>Solo Bahía Blanca</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-indigo-800/50">
              <p className="text-indigo-100 mb-4">¿No sabes a quién elegir?</p>
              <Link 
                to="/solicitar-presupuesto"
                className="inline-flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
              >
                <MessageSquare size={20} className="text-indigo-600" />
                Solicitar Presupuesto Múltiple
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="bg-indigo-50/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Rubros Populares</h2>
            <p className="mt-4 text-gray-600">Explorá los servicios más solicitados en la ciudad</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link 
                key={cat.id} 
                to={`/dashboard?rubro=${encodeURIComponent(cat.name)}`}
                className="group bg-white hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 hover:shadow-xl rounded-xl p-6 transition-all duration-300 flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{cat.name}</h3>
              </Link>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Link to="/dashboard" className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800">
              Ver todas las categorías <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Ads Carousel Section */}
      {ads.length > 0 && (
        <div className="bg-white py-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="text-indigo-600" size={24} />
                Destacados y Novedades
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentAdIndex((prev) => (prev - 1 + ads.length) % ads.length)}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentAdIndex((prev) => (prev + 1) % ads.length)}
                  className="p-2 bg-gray-50 border border-gray-200 rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden">
              <motion.div 
                className="flex gap-6"
                animate={{ x: `-${currentAdIndex * (100 / (window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3))}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {ads.map((ad) => (
                  <motion.div 
                    key={ad.id} 
                    className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] bg-gray-50 rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex-shrink-0 group"
                    whileHover={{ y: -5 }}
                  >
                    <div className="relative h-48 overflow-hidden bg-white">
                      <img 
                        src={ad.imageUrl} 
                        alt={ad.title} 
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                        referrerPolicy="no-referrer" 
                        loading="lazy"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                          Publicidad
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {ad.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {ad.description}
                      </p>
                      {ad.link && (
                        <a 
                          href={ad.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors"
                        >
                          Saber más <ArrowRight size={16} />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* Featured Professionals Section */}
      {featuredPros.length > 0 && (
        <div className="bg-slate-50 py-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="text-left">
                <h2 className="text-3xl font-bold text-gray-900">Profesionales Destacados</h2>
                <p className="mt-2 text-gray-600">Conocé a los expertos más recomendados de la ciudad</p>
              </div>
              {featuredPros.length > cardsPerPage && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentProIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentProIndex === 0}
                    className={`p-2 bg-white border border-gray-200 rounded-full shadow-sm transition-colors ${currentProIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 text-indigo-600'}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentProIndex((prev) => Math.min(Math.ceil(featuredPros.length / cardsPerPage) - 1, prev + 1))}
                    disabled={currentProIndex >= Math.ceil(featuredPros.length / cardsPerPage) - 1}
                    className={`p-2 bg-white border border-gray-200 rounded-full shadow-sm transition-colors ${currentProIndex >= Math.ceil(featuredPros.length / cardsPerPage) - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 text-indigo-600'}`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <motion.div 
                className="flex gap-5"
                animate={{ x: `-${currentProIndex * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {featuredPros.map((pro) => (
                  <div key={pro.uid} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(25%-15px)] flex-shrink-0">
                    <ProfessionalCard professional={pro} />
                  </div>
                ))}
              </motion.div>
            </div>
            
            <div className="mt-12 text-center">
              <Link to="/dashboard" className="inline-flex items-center bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-md">
                Ver todos los profesionales <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trade Discounts Section */}
      <div className="bg-indigo-50/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="text-indigo-200" size={24} />
                <span className="text-indigo-100 font-bold tracking-wider uppercase text-sm">Beneficios Exclusivos</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Descuentos para el Gremio</h2>
              <p className="text-indigo-100 text-lg">
                ¿Sos profesional? Aprovechá descuentos exclusivos en casas de repuestos, materiales y más comercios adheridos.
              </p>
            </div>
            <Link 
              to="/beneficios"
              className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Ver Beneficios
            </Link>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
            <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
              <div className="lg:self-center">
                {currentUser ? (
                  <>
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                      <span className="block">¿Necesitas un servicio?</span>
                      <span className="block text-indigo-200">Encuentra al experto ideal.</span>
                    </h2>
                    <p className="mt-4 text-lg leading-6 text-indigo-100">
                      Explora nuestra guía de profesionales verificados en Bahía Blanca y contacta al que mejor se adapte a tus necesidades.
                    </p>
                    <Link 
                      to="/dashboard" 
                      className="mt-8 bg-white border border-transparent rounded-md shadow px-5 py-3 inline-flex items-center text-base font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      ¡Busca a los profesionales!
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                      <span className="block">¿Ofrecés un servicio?</span>
                      <span className="block text-indigo-200">Sumate a la guía.</span>
                    </h2>
                    <p className="mt-4 text-lg leading-6 text-indigo-100">
                      Registrate gratis, verificá tu identidad y llegá a más clientes en Bahía Blanca. Tu perfil aparecerá en las búsquedas de miles de vecinos.
                    </p>
                    <Link 
                      to="/signup" 
                      className="mt-8 bg-white border border-transparent rounded-md shadow px-5 py-3 inline-flex items-center text-base font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      Registrarme Ahora
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="relative -mt-6 aspect-w-5 aspect-h-3 md:aspect-w-2 md:aspect-h-1">
              <img 
                className="transform translate-x-6 translate-y-6 rounded-md object-cover object-left-top sm:translate-x-16 lg:translate-y-20" 
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1567&q=80" 
                alt="App screenshot" 
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
