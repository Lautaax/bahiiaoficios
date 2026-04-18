import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { ProfessionalCard } from './ProfessionalCard';
import { PROFESSIONS, PROFESSION_TIPS } from '../constants';
import { ShieldCheck, Info, ChevronLeft, Briefcase, Star, MapPin } from 'lucide-react';

export const ProfessionLanding: React.FC = () => {
  const { profession } = useParams<{ profession: string }>();
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Find the actual profession name from the URL slug (case insensitive and normalized)
  const professionData = useMemo(() => {
    if (!profession) return null;
    return PROFESSIONS.find(p => 
      p.name.toLowerCase().replace(/\s+/g, '-') === profession.toLowerCase()
    );
  }, [profession]);

  const professionName = professionData?.name || profession || '';
  const tips = PROFESSION_TIPS[professionName] || PROFESSION_TIPS['Default'];

  useEffect(() => {
    const fetchProfessionals = async () => {
      if (!professionName) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'usuarios'),
          where('rol', '==', 'profesional'),
          where('profesionalInfo.rubros', 'array-contains', professionName),
          limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        let docs = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as User));
        
        // If no results with array-contains, try single rubro field (legacy support)
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

        // Sort: VIP first, then rating
        docs.sort((a, b) => {
          const isVipA = !!a.profesionalInfo?.isVip;
          const isVipB = !!b.profesionalInfo?.isVip;
          if (isVipA && !isVipB) return -1;
          if (!isVipA && isVipB) return 1;
          return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
        });

        setProfessionals(docs);
      } catch (error) {
        console.error("Error fetching professionals for landing:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfessionals();
  }, [professionName]);

  if (!professionData && !loading && professionals.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Rubro no encontrado</h2>
        <p className="text-gray-600 mb-8">No pudimos encontrar profesionales para "{professionName}".</p>
        <Link to="/dashboard" className="text-indigo-600 font-bold hover:underline">Volver al Directorio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-indigo-600 text-white py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-indigo-100 hover:text-white mb-6 transition-colors">
            <ChevronLeft size={20} />
            Volver al Directorio
          </Link>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              {professionData?.icon ? (
                <professionData.icon size={48} className="text-white" />
              ) : (
                <Briefcase size={48} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
                {professionName}s en Bahía Blanca
              </h1>
              <p className="text-xl text-indigo-100 max-w-2xl">
                Encontrá a los mejores {professionName.toLowerCase()}s calificados por la comunidad bahiense. 
                Presupuestos sin cargo y atención garantizada.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Professionals List */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {loading ? 'Buscando profesionales...' : `${professionals.length} Profesionales Disponibles`}
                </h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl h-80 animate-pulse border border-gray-200"></div>
                  ))}
                </div>
              ) : professionals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {professionals.map(prof => (
                    <ProfessionalCard key={prof.uid} professional={prof} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No hay profesionales registrados</h3>
                  <p className="text-gray-600 mb-6">Actualmente no tenemos {professionName.toLowerCase()}s registrados en esta categoría.</p>
                  <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                    Explorar otros rubros
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hiring Tips */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-24">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                <ShieldCheck size={24} />
                <h3 className="text-lg font-bold">Consejos de Contratación</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Seguí estas recomendaciones para asegurar un trabajo de calidad y seguro.
              </p>
              <ul className="space-y-4">
                {tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="bg-indigo-50 p-1 rounded mt-0.5">
                      <Info size={14} className="text-indigo-600" />
                    </div>
                    <span className="text-sm text-gray-700 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">¿Sos {professionName}?</h4>
                <p className="text-xs text-amber-700 mb-3">
                  Unite a nuestra comunidad y empezá a recibir pedidos de presupuesto de clientes en Bahía Blanca.
                </p>
                <Link to="/signup" className="text-xs font-bold text-amber-900 hover:underline">
                  Registrate gratis aquí →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer SEO Text */}
      <div className="bg-white border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-indigo max-w-none text-gray-600">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre los {professionName.toLowerCase()}s en Bahía Blanca</h3>
            <p>
              En <strong>Bahía Oficios</strong>, nos esforzamos por brindarte acceso directo a los mejores profesionales de la ciudad. 
              Ya sea que necesites un trabajo pequeño en tu hogar o una instalación compleja, nuestra plataforma te permite 
              comparar perfiles, ver trabajos anteriores y leer opiniones reales de otros vecinos.
            </p>
            <p>
              Todos los profesionales listados en esta página operan en el área de Bahía Blanca, incluyendo zonas como 
              Centro, Macrocentro, Palihue, Patagonia, Villa Mitre y alrededores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
