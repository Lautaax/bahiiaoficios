import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Review } from '../types';
import { Star, MapPin, ShieldCheck, Phone, MessageSquare, MessageCircle, Mail, X, ChevronDown, ChevronUp, Briefcase, Heart, AlertCircle } from 'lucide-react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { PROFESSIONS } from '../constants';

interface ProfessionalCardProps {
  professional: User;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional }) => {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [latestReview, setLatestReview] = useState<Review | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (professional.uid) {
      setIsFavorite(favorites.includes(professional.uid));
    }
  }, [professional.uid]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!professional.uid) return;

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter((id: string) => id !== professional.uid);
    } else {
      newFavorites = [...favorites, professional.uid];
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  useEffect(() => {
    const fetchLatestReview = async () => {
      if (!professional.uid) return;
      
      try {
        // Try optimal query first
        const q = query(
          collection(db, 'resenas'),
          where('profesionalId', '==', professional.uid),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setLatestReview({
            id: doc.id,
            ...doc.data(),
            fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
          } as Review);
        }
      } catch (error: any) {
        // Fallback for missing index
        if (error.code === 'failed-precondition') {
           // Suppress error log for known missing index issue, as we have a fallback
           console.warn("Index missing for latest review query, using fallback.");
           try {
             const simpleQ = query(
               collection(db, 'resenas'),
               where('profesionalId', '==', professional.uid),
               limit(10) // Fetch a few to sort client-side
             );
             const querySnapshot = await getDocs(simpleQ);
             if (!querySnapshot.empty) {
                const reviews = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
                } as Review));
                
                // Sort client-side
                reviews.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
                setLatestReview(reviews[0]);
             }
           } catch (fallbackError) {
             console.error("Error in fallback fetch:", fallbackError);
           }
        }
      }
    };

    fetchLatestReview();
  }, [professional.uid]);

  if (professional.rol !== 'profesional' || !professional.profesionalInfo) {
    return null;
  }

  const { nombre, zona, fotoUrl, uid } = professional;
  const { rubro, descripcion, ratingAvg, reviewCount, isVip, telefono, contactEmail, direccion, haceUrgencias, disponibilidadInmediata, isVerified, matriculado, preciosReferencia, fotoPortada } = professional.profesionalInfo;

  const isClient = currentUser?.rol === 'cliente';

  // Find profession icon
  const professionData = PROFESSIONS.find(p => p.name === rubro);
  const ProfessionIcon = professionData?.icon || Briefcase;

  const handleShowReviews = async () => {
    if (!showReviews && reviews.length === 0) {
      setLoadingReviews(true);
      try {
        // Try optimal query first
        const q = query(
          collection(db, 'resenas'),
          where('profesionalId', '==', uid),
          orderBy('fecha', 'desc'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const fetchedReviews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
        })) as Review[];
        setReviews(fetchedReviews);
      } catch (error: any) {
        // Fallback for missing index
        if (error.code === 'failed-precondition') {
            console.warn("Index missing for reviews query, using fallback.");
            try {
                const simpleQ = query(
                    collection(db, 'resenas'),
                    where('profesionalId', '==', uid),
                    limit(20) // Fetch more to sort client-side
                );
                const querySnapshot = await getDocs(simpleQ);
                const fetchedReviews = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    fecha: doc.data().fecha?.toDate ? doc.data().fecha.toDate() : new Date(doc.data().fecha)
                })) as Review[];
                
                // Sort client-side
                fetchedReviews.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
                setReviews(fetchedReviews.slice(0, 5));
            } catch (fallbackError) {
                console.error("Error in fallback fetch reviews:", fallbackError);
            }
        }
      } finally {
        setLoadingReviews(false);
      }
    }
    setShowReviews(!showReviews);
  };

  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const userRef = doc(db, 'usuarios', uid);
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

    if (currentUser.uid === uid) return;

    try {
      const q = query(
        collection(db, 'chats'),
        where('clientId', '==', currentUser.uid),
        where('workerId', '==', uid)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingChatId = querySnapshot.docs[0].id;
        navigate(`/chat/${existingChatId}`);
      } else {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          clientId: currentUser.uid,
          workerId: uid,
          clientName: currentUser.nombre,
          workerName: nombre,
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

  return (
    <>
      <div 
        className={`
          relative flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1
          ${isVip ? 'border-2 border-amber-400 shadow-lg shadow-amber-100/50' : 'border border-gray-200 shadow-sm'}
        `}
      >
        {/* Cover Image */}
        <div className="relative h-32 overflow-hidden bg-gray-200">
          {fotoPortada ? (
            <img 
              src={fotoPortada} 
              alt={`Portada de ${nombre}`} 
              className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center opacity-80">
              <ProfessionIcon size={40} className="text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* VIP Badge - Enhanced Style */}
        {isVip && (
          <div className="absolute top-0 right-0 z-10">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-1.5 animate-pulse-slow">
              <ShieldCheck size={14} className="fill-white" />
              <span className="tracking-wide">DESTACADO</span>
            </div>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 left-3 z-20 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-all hover:scale-110 group"
          title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart 
            size={20} 
            className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400'}`} 
          />
        </button>

        <div className="p-5 pt-0 flex flex-col h-full relative">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4 -mt-8">
            <div className="relative">
              <img 
                src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                alt={nombre} 
                className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-md ${isVip ? 'ring-4 ring-amber-100' : ''}`}
                loading="lazy"
              />
              {isVip && (
                <div className="absolute -bottom-1 -right-1 bg-amber-400 rounded-full p-1 border-2 border-white shadow-sm">
                  <Star size={10} className="text-white fill-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-gray-900 truncate">{nombre}</h3>
                {isVerified && (
                  <div className="flex items-center text-blue-600" title="Perfil Verificado">
                    <ShieldCheck size={18} className="fill-blue-100" />
                  </div>
                )}
                {matriculado && (
                  <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" title="Profesional Matriculado">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Matriculado</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {professional.profesionalInfo.rubros && professional.profesionalInfo.rubros.length > 0 ? (
                  professional.profesionalInfo.rubros.slice(0, 3).map((r, idx) => {
                    const pData = PROFESSIONS.find(p => p.name === r);
                    const Icon = pData?.icon || Briefcase;
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium border border-indigo-100">
                        <Icon size={12} />
                        {r}
                      </span>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-sm uppercase tracking-wide">
                    <ProfessionIcon size={16} />
                    <span>{rubro}</span>
                  </div>
                )}
                {professional.profesionalInfo.rubros && professional.profesionalInfo.rubros.length > 3 && (
                  <span className="text-xs text-gray-500 flex items-center">+{professional.profesionalInfo.rubros.length - 3}</span>
                )}
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap gap-1 mb-2">
                {(isVerified || matriculado) && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100" title="Perfil Verificado">
                    <ShieldCheck size={10} className="fill-blue-100" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">Verificado</span>
                  </div>
                )}
                {(ratingAvg || 0) >= 4.5 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100" title="Puntualidad">
                    <Star size={10} className="fill-amber-100" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">Puntual</span>
                  </div>
                )}
                {(reviewCount || 0) >= 10 && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100" title="Experiencia">
                    <Briefcase size={10} />
                    <span className="text-[9px] font-bold uppercase tracking-tight">Experto</span>
                  </div>
                )}
              </div>

              <div className="flex items-center text-gray-500 text-xs gap-1">
                <MapPin size={12} />
                <span>{zona}, Bahía Blanca</span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {haceUrgencias && (
                  <div className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium border border-red-100">
                    <AlertCircle size={12} />
                    <span>Urgencias 24/7</span>
                  </div>
                )}
                {disponibilidadInmediata ? (
                  <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span>Disponible ahora</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    <span>Ocupado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex-grow leading-relaxed">
            {descripcion}
          </p>

          {/* Starting Price Highlight */}
          {preciosReferencia && preciosReferencia.length > 0 && (
            <div className="mb-4 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Desde</span>
              <span className="text-sm font-bold text-indigo-600">
                {preciosReferencia.reduce((min, p) => {
                  const price = parseInt(p.precio.replace(/\D/g, '')) || 0;
                  return (min === 0 || (price > 0 && price < min)) ? price : min;
                }, 0) > 0 
                  ? `$${preciosReferencia.reduce((min, p) => {
                      const price = parseInt(p.precio.replace(/\D/g, '')) || 0;
                      return (min === 0 || (price > 0 && price < min)) ? price : min;
                    }, 0)}`
                  : preciosReferencia[0].precio}
              </span>
              <span className="text-[10px] text-gray-400 font-medium ml-auto">{preciosReferencia[0].servicio}</span>
            </div>
          )}

          {/* Stats & Footer */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleShowReviews}
                className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Star size={16} className="text-amber-400 fill-amber-400 mr-1.5" />
                <span className="font-bold text-gray-900 text-sm">{ratingAvg ? ratingAvg.toFixed(1) : 'N/A'}</span>
                <span className="text-gray-500 text-xs ml-1 font-medium">({reviewCount || 0} reseñas)</span>
                {showReviews ? <ChevronUp size={14} className="ml-2 text-gray-400" /> : <ChevronDown size={14} className="ml-2 text-gray-400" />}
              </button>
            </div>
            
            <div className="flex gap-2">
              <Link 
                to={`/profesional/${professional.slug || uid}`}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Ver Perfil
              </Link>
              {isClient && (
                <button 
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className={`p-2.5 rounded-lg transition-colors border ${showReviewForm ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent'}`}
                  title="Dejar reseña"
                >
                  <MessageSquare size={20} />
                </button>
              )}
              {isClient && (
                <button 
                  onClick={handleContactClick}
                  className="p-2.5 rounded-lg transition-colors border text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent"
                  title="Iniciar Chat"
                >
                  <MessageCircle size={20} />
                </button>
              )}
              {telefono ? (
                <a 
                  href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vi tu perfil en Bahía Oficios y necesito presupuesto para...`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95
                    ${isVip 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
                      : 'bg-green-600 hover:bg-green-700 text-white'}
                  `}
                  onClick={handleWhatsAppClick}
                >
                  <MessageSquare size={16} />
                  WhatsApp
                </a>
              ) : (
                <button 
                  onClick={() => setShowContactModal(true)}
                  className={`
                    px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95
                    ${isVip 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                  `}
                >
                  Contactar
                </button>
              )}
            </div>
          </div>

          {/* Latest Review Highlight (when list is hidden) */}
          {!showReviews && latestReview && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in">
              <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Última reseña
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      {latestReview.clienteNombre || 'Usuario'}
                    </span>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={10} 
                        className={`${i < latestReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-xs italic line-clamp-2">"{latestReview.comentario}"</p>
              </div>
            </div>
          )}

          {/* Reviews Section */}
          {showReviews && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-gray-400" />
                Últimas Reseñas
              </h4>
              {loadingReviews ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 animate-pulse">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="w-2.5 h-2.5 bg-gray-200 rounded-full"></div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 bg-gray-200 rounded w-full"></div>
                        <div className="h-2.5 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-semibold text-gray-800 text-xs">{review.clienteNombre || 'Usuario'}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={10} 
                              className={`${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs italic leading-relaxed">"{review.comentario}"</p>
                      {review.badges && review.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {review.badges.map((badge, idx) => (
                            <span key={idx} className="bg-indigo-50 text-indigo-600 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-100">
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-right mt-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {review.fecha ? new Date(review.fecha).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500 text-xs italic">No hay reseñas todavía.</p>
                  {isClient && (
                    <button 
                      onClick={() => setShowReviewForm(true)}
                      className="mt-2 text-indigo-600 text-xs font-medium hover:underline"
                    >
                      ¡Sé el primero en opinar!
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Review Form Expandable */}
          {showReviewForm && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
              <ReviewForm 
                profesionalId={uid} 
                profesionalNombre={nombre}
                onReviewSubmitted={() => {
                  setShowReviewForm(false);
                  // Refresh reviews if they are shown
                  if (showReviews) {
                    setReviews([]); // Clear to force refetch
                    handleShowReviews();
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white relative">
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <img 
                  src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                  alt={nombre} 
                  className="w-16 h-16 rounded-full object-cover border-4 border-white/20"
                  loading="lazy"
                />
                <div>
                  <h3 className="font-bold text-xl">{nombre}</h3>
                  <div className="flex items-center gap-1.5 text-indigo-100 text-sm">
                    <ProfessionIcon size={14} />
                    <span>{rubro}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Información de Contacto</h4>
              
              <div className="space-y-4">
                {telefono ? (
                  <a 
                    href={`tel:${telefono}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                  >
                    <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                      <Phone size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Teléfono</p>
                      <p className="text-gray-900 font-semibold">{telefono}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 opacity-60">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <Phone size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Teléfono</p>
                      <p className="text-gray-400 italic">No disponible</p>
                    </div>
                  </div>
                )}
                
                {contactEmail ? (
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 group"
                  >
                    <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-gray-900 font-semibold break-all">{contactEmail}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 opacity-60">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <Mail size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Email</p>
                      <p className="text-gray-400 italic">No disponible</p>
                    </div>
                  </div>
                )}

                {direccion && (
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100">
                    <div className="bg-gray-100 p-3 rounded-full">
                      <MapPin size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Dirección</p>
                      <p className="text-gray-900 font-semibold">{direccion}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContactClick}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium shadow-sm"
                >
                  <MessageSquare size={20} />
                  Contactar por Chat
                </button>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Al contactar, menciona que lo viste en <span className="font-bold text-indigo-600">Portal de Oficios</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
