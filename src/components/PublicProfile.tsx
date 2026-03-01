import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Review } from '../types';
import { Star, MapPin, ShieldCheck, Phone, Mail, ArrowLeft, MessageSquare, Calendar, User as UserIcon } from 'lucide-react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';

export const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [professional, setProfessional] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchProfessional = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, 'usuarios', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          if (userData.rol === 'profesional') {
            setProfessional({ ...userData, uid: docSnap.id });
          } else {
            setError('El usuario no es un perfil profesional.');
          }
        } else {
          setError('Profesional no encontrado.');
        }
      } catch (err) {
        console.error("Error fetching professional:", err);
        setError('Error al cargar el perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessional();
  }, [id]);

  const fetchReviews = async () => {
    if (!id) return;
    try {
      // Try optimal query first
      const q = query(
        collection(db, 'resenas'),
        where('profesionalId', '==', id),
        orderBy('fecha', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedReviews = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
      })) as Review[];
      setReviews(fetchedReviews);
    } catch (err: any) {
      // Fallback for missing index
      if (err.code === 'failed-precondition') {
          console.warn("Index missing for reviews query in PublicProfile, using fallback.");
          try {
              const simpleQ = query(
                  collection(db, 'resenas'),
                  where('profesionalId', '==', id),
                  limit(50) // Fetch reasonable amount
              );
              const querySnapshot = await getDocs(simpleQ);
              const fetchedReviews = querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
              })) as Review[];
              
              // Sort client-side
              fetchedReviews.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
              setReviews(fetchedReviews);
          } catch (fallbackError) {
              console.error("Error in fallback fetch reviews:", fallbackError);
          }
      }
    }
  };

  useEffect(() => {
    if (professional) {
      fetchReviews();
    }
  }, [professional]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !professional || !professional.profesionalInfo) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 inline-block">
          {error || 'Perfil no disponible'}
        </div>
        <br />
        <Link to="/" className="text-indigo-600 hover:underline flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
      </div>
    );
  }

  const { nombre, zona, fotoUrl } = professional;
  const { rubro, descripcion, ratingAvg, reviewCount, isVip, telefono, contactEmail, direccion, cuit, haceFactura, tipoFactura } = professional.profesionalInfo;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Volver al listado
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 sticky top-24">
            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
              {isVip && (
                <div className="absolute top-4 right-4 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <ShieldCheck size={12} /> VIP
                </div>
              )}
            </div>
            
            <div className="px-6 pb-6 relative">
              <div className="relative -mt-16 mb-4 flex justify-center">
                <img 
                  src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                  alt={nombre} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white"
                />
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{nombre}</h1>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide text-sm mb-2">{rubro}</p>
                <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm gap-1">
                  <MapPin size={14} />
                  <span>{zona}, Bahía Blanca</span>
                </div>
              </div>

              <div className="flex justify-center gap-6 mb-6 border-t border-b border-gray-100 dark:border-gray-700 py-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 font-bold text-gray-900 dark:text-white text-xl">
                    <Star size={20} className="text-amber-400 fill-amber-400" />
                    {ratingAvg ? ratingAvg.toFixed(1) : '-'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Calificación</div>
                </div>
                <div className="text-center border-l border-gray-100 dark:border-gray-700 pl-6">
                  <div className="font-bold text-gray-900 dark:text-white text-xl">
                    {reviewCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Reseñas</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Contacto</h3>
                
                {telefono ? (
                  <a href={`tel:${telefono}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                      <Phone size={18} />
                    </div>
                    <span className="font-medium">{telefono}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400 p-2">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                      <Phone size={18} />
                    </div>
                    <span className="italic">No disponible</span>
                  </div>
                )}

                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                      <Mail size={18} />
                    </div>
                    <span className="font-medium truncate">{contactEmail}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400 p-2">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                      <Mail size={18} />
                    </div>
                    <span className="italic">No disponible</span>
                  </div>
                )}

                {direccion && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 p-2">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 dark:text-gray-400">
                      <MapPin size={18} />
                    </div>
                    <span className="font-medium">{direccion}</span>
                  </div>
                )}
              </div>

              {(haceFactura || cuit) && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Datos Fiscales</h3>
                  {cuit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">CUIT/CUIL:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{cuit}</span>
                    </div>
                  )}
                  {haceFactura && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Facturación:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        Factura {tipoFactura || 'A/C'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* About Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sobre mí</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {descripcion || "Este profesional no ha añadido una descripción todavía."}
            </p>
          </div>

          {/* Reviews Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="text-indigo-600" />
                Reseñas y Opiniones
              </h2>
              {currentUser && currentUser.rol === 'cliente' && (
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {showReviewForm ? 'Cancelar' : 'Escribir Reseña'}
                </button>
              )}
            </div>

            {showReviewForm && (
              <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                <ReviewForm 
                  profesionalId={id!} 
                  profesionalNombre={nombre}
                  onReviewSubmitted={() => {
                    setShowReviewForm(false);
                    fetchReviews();
                  }}
                />
              </div>
            )}

            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                          <UserIcon size={20} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                            {review.clienteNombre || 'Usuario'}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {review.fecha ? new Date(review.fecha).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={`${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 pl-11 italic">
                      "{review.comentario}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No hay reseñas todavía.</p>
                  {currentUser?.rol === 'cliente' && (
                    <p className="text-sm mt-1">¡Sé el primero en dejar tu opinión!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
