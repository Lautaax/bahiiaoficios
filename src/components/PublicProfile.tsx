import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Review } from '../types';
import { Star, MapPin, ShieldCheck, Phone, Mail, ArrowLeft, MessageSquare, Calendar, User as UserIcon, Image as IconImage, AlertCircle } from 'lucide-react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';

export const PublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
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
            
            // Increment profile views if not the owner
            if (currentUser?.uid !== docSnap.id) {
              try {
                await updateDoc(docRef, {
                  'profesionalInfo.profileViews': (userData.profesionalInfo?.profileViews || 0) + 1
                });
              } catch (e) {
                console.error("Error updating profile views", e);
              }
            }
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
      setReviewsLoaded(true);
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
              setReviewsLoaded(true);
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

  // Sync ratings if they are out of sync
  useEffect(() => {
    if (professional && reviewsLoaded) {
      const currentCount = professional.profesionalInfo?.reviewCount || 0;
      const currentAvg = professional.profesionalInfo?.ratingAvg || 0;
      
      const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
      const newAvg = reviews.length > 0 ? totalRating / reviews.length : 0;
      
      // Check if either count or avg is out of sync (using a small epsilon for float comparison)
      if (currentCount !== reviews.length || Math.abs(currentAvg - newAvg) > 0.01) {
        const syncRatings = async () => {
          try {
            const userRef = doc(db, 'usuarios', professional.uid);
            await updateDoc(userRef, {
              'profesionalInfo.ratingAvg': newAvg,
              'profesionalInfo.reviewCount': reviews.length
            });
            // Update local state to reflect changes immediately
            setProfessional(prev => {
              if (!prev || !prev.profesionalInfo) return prev;
              return {
                ...prev,
                profesionalInfo: {
                  ...prev.profesionalInfo,
                  ratingAvg: newAvg,
                  reviewCount: reviews.length
                }
              };
            });
          } catch (e) {
            console.error("Error syncing ratings:", e);
          }
        };
        syncRatings();
      }
    }
  }, [reviews, professional, reviewsLoaded]);

  const handleWhatsAppClick = async () => {
    if (!id || !professional?.profesionalInfo) return;
    try {
      const userRef = doc(db, 'usuarios', id);
      await updateDoc(userRef, {
        'profesionalInfo.whatsappClicks': (professional.profesionalInfo.whatsappClicks || 0) + 1
      });
    } catch (error) {
      console.error("Error updating whatsapp clicks:", error);
    }
  };

  const handleContactClick = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser.uid === id) return; // Can't chat with yourself

    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('clientId', '==', currentUser.uid),
        where('workerId', '==', id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Chat exists, navigate to it
        const existingChatId = querySnapshot.docs[0].id;
        navigate(`/chat/${existingChatId}`);
      } else {
        // Create new chat
        const newChatRef = await addDoc(collection(db, 'chats'), {
          clientId: currentUser.uid,
          workerId: id,
          clientName: currentUser.nombre,
          workerName: professional?.nombre,
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        navigate(`/chat/${newChatRef.id}`);
      }
    } catch (error) {
      console.error("Error creating/navigating to chat:", error);
      alert("Hubo un error al intentar iniciar el chat. Por favor, intenta de nuevo.");
    }
  };

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
  const { rubro, descripcion, ratingAvg, reviewCount, isVip, telefono, contactEmail, direccion, cuit, haceFactura, tipoFactura, haceUrgencias, disponibilidadInmediata, isVerified } = professional.profesionalInfo;

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
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{nombre}</h1>
                  {isVerified && (
                    <div className="flex items-center text-blue-600" title="Perfil Verificado">
                      <ShieldCheck size={24} className="fill-blue-100" />
                    </div>
                  )}
                </div>
                
                {professional.profesionalInfo.rubros && professional.profesionalInfo.rubros.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2 mb-3">
                    {professional.profesionalInfo.rubros.map((r, idx) => (
                      <span key={idx} className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide text-sm bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide text-sm mb-2">{rubro}</p>
                )}

                <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm gap-1 mb-3">
                  <MapPin size={14} />
                  <span>{zona}, Bahía Blanca</span>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {haceUrgencias && (
                    <div className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs px-3 py-1 rounded-full font-bold border border-red-100 dark:border-red-800">
                      <AlertCircle size={14} />
                      <span>ATENCIÓN URGENCIAS 24/7</span>
                    </div>
                  )}
                  {disponibilidadInmediata ? (
                    <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold border border-green-100 dark:border-green-800">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span>DISPONIBLE AHORA</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full font-bold border border-gray-200 dark:border-gray-700">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span>OCUPADO</span>
                    </div>
                  )}
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

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                {telefono && (
                  <a
                    href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi tu perfil en Bahía Oficios y necesito presupuesto para...`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare size={18} />
                    Contactar por WhatsApp
                  </a>
                )}
                <button
                  onClick={handleContactClick}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageSquare size={18} />
                  Contactar por Chat
                </button>
              </div>
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

          {/* Portfolio Section */}
          {professional.profesionalInfo.fotosTrabajos && professional.profesionalInfo.fotosTrabajos.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <IconImage className="text-indigo-600" />
                Trabajos Realizados
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {professional.profesionalInfo.fotosTrabajos.map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-gray-100 dark:border-gray-700 shadow-sm">
                    <img 
                      src={url} 
                      alt={`Trabajo ${index + 1}`} 
                      className="w-full h-full object-cover"
                      onClick={() => window.open(url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    {review.fotos && review.fotos.length > 0 && (
                      <div className="flex gap-2 mt-3 pl-11 overflow-x-auto">
                        {review.fotos.map((foto, idx) => (
                          <img 
                            key={idx} 
                            src={foto} 
                            alt={`Foto de reseña ${idx + 1}`} 
                            className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(foto, '_blank')}
                          />
                        ))}
                      </div>
                    )}
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
