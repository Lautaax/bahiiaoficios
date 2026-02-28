import React, { useState } from 'react';
import { User, Review } from '../types';
import { Star, MapPin, ShieldCheck, Phone, MessageSquare, Mail, X, ChevronDown, ChevronUp } from 'lucide-react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface ProfessionalCardProps {
  professional: User;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional }) => {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  const { currentUser } = useAuth();

  if (professional.rol !== 'profesional' || !professional.profesionalInfo) {
    return null;
  }

  const { nombre, zona, fotoUrl, uid } = professional;
  const { rubro, descripcion, ratingAvg, reviewCount, isVip, telefono, contactEmail, direccion } = professional.profesionalInfo;

  const isClient = currentUser?.rol === 'cliente';

  const handleShowReviews = async () => {
    if (!showReviews && reviews.length === 0) {
      setLoadingReviews(true);
      try {
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
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoadingReviews(false);
      }
    }
    setShowReviews(!showReviews);
  };

  return (
    <>
      <div 
        className={`
          relative flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1
          ${isVip ? 'border-2 border-amber-400 shadow-lg shadow-amber-100/50' : 'border border-gray-200 shadow-sm'}
        `}
      >
        {/* VIP Badge - Enhanced Style */}
        {isVip && (
          <div className="absolute top-0 right-0 z-10">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-md flex items-center gap-1.5 animate-pulse-slow">
              <ShieldCheck size={14} className="fill-white" />
              <span className="tracking-wide">DESTACADO</span>
            </div>
          </div>
        )}

        <div className="p-5 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <img 
                src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                alt={nombre} 
                className={`w-16 h-16 rounded-full object-cover ${isVip ? 'ring-4 ring-amber-100 ring-offset-2' : ''}`}
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
              </div>
              <p className="text-indigo-600 font-bold text-sm mb-1 uppercase tracking-wide">{rubro}</p>
              <div className="flex items-center text-gray-500 text-xs gap-1">
                <MapPin size={12} />
                <span>{zona}, Bahía Blanca</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow leading-relaxed">
            {descripcion}
          </p>

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
              {isClient && (
                <button 
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className={`p-2.5 rounded-lg transition-colors border ${showReviewForm ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent'}`}
                  title="Dejar reseña"
                >
                  <MessageSquare size={20} />
                </button>
              )}
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
            </div>
          </div>

          {/* Reviews Section */}
          {showReviews && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-gray-400" />
                Últimas Reseñas
              </h4>
              {loadingReviews ? (
                <div className="text-center py-6 text-gray-500 text-xs animate-pulse">Cargando reseñas...</div>
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
                />
                <div>
                  <h3 className="font-bold text-xl">{nombre}</h3>
                  <p className="text-indigo-100 text-sm">{rubro}</p>
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
