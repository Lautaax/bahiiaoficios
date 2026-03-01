import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, MapPin, Star, ShieldCheck, Filter, BadgeCheck } from 'lucide-react';
import { searchProfessionals } from '../services/firestoreService';
import { User } from '../types';
import { api } from '../services/api';
import { Category } from '../types';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categorySlug = searchParams.get('category') || '';
  
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await searchProfessionals(query, categorySlug);
        setResults(data);
      } catch (error) {
        console.error("Error searching professionals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, categorySlug]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newQuery = formData.get('q') as string;
    setSearchParams({ q: newQuery, category: categorySlug });
  };

  const handleCategoryChange = (slug: string) => {
    setSearchParams({ q: query, category: slug === categorySlug ? '' : slug });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="q"
                defaultValue={query}
                type="text"
                placeholder="Buscar profesionales, servicios..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Buscar
            </button>
          </form>
          
          {/* Category Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                !categorySlug 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categorySlug === cat.slug
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
          <h2 className="text-xl font-semibold text-gray-900">
            {loading ? 'Buscando...' : `${results.length} profesionales encontrados`}
          </h2>
          {/* Filter button for mobile could go here */}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((pro) => (
              <div key={pro.uid} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${pro.nombre}&background=random`} 
                        alt={pro.nombre}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{pro.nombre}</h3>
                          {pro.profesionalInfo?.isVip && (
                            <ShieldCheck className="w-4 h-4 text-yellow-500" fill="currentColor" fillOpacity={0.2} title="VIP" />
                          )}
                          {pro.profesionalInfo?.fotoDni && (
                            <BadgeCheck className="w-4 h-4 text-blue-500" fill="currentColor" fillOpacity={0.1} title="Identidad Verificada" />
                          )}
                        </div>
                        <p className="text-sm text-indigo-600 font-medium">{pro.profesionalInfo?.rubro}</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-md">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-bold text-yellow-700">{pro.profesionalInfo?.ratingAvg}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {pro.profesionalInfo?.descripcion}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500 mb-4">
                    <MapPin className="w-3 h-3 mr-1" />
                    {pro.zona}, {pro.ciudad}
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {pro.profesionalInfo?.reviewCount} reseñas
                    </span>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                      Ver Perfil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No se encontraron resultados</h3>
            <p className="text-gray-500 mt-2">Intenta con otros términos o cambia los filtros.</p>
            <button 
              onClick={() => {
                setSearchParams({});
              }}
              className="mt-4 text-indigo-600 font-medium hover:text-indigo-800"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
