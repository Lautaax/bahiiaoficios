import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { ProfessionalCard } from './ProfessionalCard';
import { Search, Filter, MapPin, Crown, X } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRubro, setSelectedRubro] = useState<string>('Todos');
  const [selectedZona, setSelectedZona] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null);
  const [showVipWelcome, setShowVipWelcome] = useState(false);

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
                if (a.profesionalInfo?.isVip && !b.profesionalInfo?.isVip) return -1;
                if (!a.profesionalInfo?.isVip && b.profesionalInfo?.isVip) return 1;
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
      const matchesRubro = selectedRubro === 'Todos' || p.profesionalInfo?.rubro === selectedRubro;
      const matchesZona = selectedZona === 'Todas' || p.zona === selectedZona;
      
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term || 
        p.nombre.toLowerCase().includes(term) || 
        p.profesionalInfo?.descripcion.toLowerCase().includes(term) ||
        p.zona.toLowerCase().includes(term);

      return matchesRubro && matchesZona && matchesSearch;
    });
  }, [professionals, selectedRubro, selectedZona, searchTerm]);

  const rubros = ['Todos', 'Electricista', 'Gasista', 'Plomero', 'Albañil', 'Pintor', 'Carpintero', 'Jardinero', 'Mecánico', 'Cerrajero', 'Flete', 'Limpieza', 'Techista'];
  const zonas = ['Todas', 'Centro', 'Universitario', 'Villa Mitre', 'Patagonia', 'Norte', 'Bella Vista', 'Palihue', 'San Andrés', 'Tiro Federal', 'Ingeniero White'];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-4">
                {/* Filtro Rubro */}
                <div className="relative min-w-[180px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                    value={selectedRubro}
                    onChange={(e) => setSelectedRubro(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm appearance-none"
                >
                    {rubros.map(r => (
                    <option key={r} value={r}>{r}</option>
                    ))}
                </select>
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
            </div>
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
            {filteredProfessionals.length} Profesionales encontrados
          </h3>
          <span className="text-sm text-gray-500">Ordenado por: Destacados y Calificación</span>
        </div>

        {loading ? (
             <div className="flex justify-center py-12">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfessionals.map(prof => (
                <ProfessionalCard key={prof.uid} professional={prof} />
            ))}
            </div>
        )}

        {!loading && filteredProfessionals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No se encontraron profesionales con esos criterios.</p>
          </div>
        )}
      </main>
    </div>
  );
};
