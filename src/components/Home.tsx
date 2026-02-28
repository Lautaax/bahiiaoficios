import React, { useState, useEffect } from 'react';
import { Search, MapPin, ArrowRight, Star, ShieldCheck, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Category } from '../types';
import { api } from '../services/api';

export function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getCategories().then(data => setCategories(data.slice(0, 8)));
  }, []);

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
                />
              </div>
              <Link 
                to={`/search?q=${searchTerm}`}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-md font-bold text-lg transition-colors flex items-center justify-center"
              >
                Buscar
              </Link>
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
          </motion.div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Rubros Populares</h2>
          <p className="mt-4 text-gray-600">Explorá los servicios más solicitados en la ciudad</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              to={`/search?category=${cat.slug}`}
              className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-xl rounded-xl p-6 transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Briefcase className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{cat.name}</h3>
            </Link>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Link to="/search" className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800">
            Ver todas las categorías <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden lg:grid lg:grid-cols-2 lg:gap-4">
            <div className="pt-10 pb-12 px-6 sm:pt-16 sm:px-16 lg:py-16 lg:pr-0 xl:py-20 xl:px-20">
              <div className="lg:self-center">
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
              </div>
            </div>
            <div className="relative -mt-6 aspect-w-5 aspect-h-3 md:aspect-w-2 md:aspect-h-1">
              <img 
                className="transform translate-x-6 translate-y-6 rounded-md object-cover object-left-top sm:translate-x-16 lg:translate-y-20" 
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1567&q=80" 
                alt="App screenshot" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
