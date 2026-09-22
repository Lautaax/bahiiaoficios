import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit, addDoc, serverTimestamp, updateDoc, deleteDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Review } from '../types';
import { Star, MapPin, ShieldCheck, Phone, Mail, ArrowLeft, MessageSquare, Calendar, User as UserIcon, Image as IconImage, AlertCircle, CheckCircle, Briefcase, FileText, QrCode, Download, Heart, Share2, Check, Crown, Flag } from 'lucide-react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { checkAndExpireUserVip, isVipActive } from '../utils/vipUtils';
import { CachedImage } from './CachedImage';
import { ReportModal } from './ReportModal';
import { safeLocalStorage } from '../utils/storage';
import { useProfessionalSEO } from '../hooks/useProfessionalSEO';
import { getProfessionalBadges } from '../utils/badgeUtils';
import { ProfessionalBadges } from './ProfessionalBadges';

export const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<User | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareFeedback, setShowShareFeedback] = useState(false);

  // SEO & Schema.org LocalBusiness JSON-LD for Bahía Blanca search engines
  useProfessionalSEO(professional, reviews);

  useEffect(() => {
    if (currentUser && currentUser.favoritos && professional) {
      setIsFavorite(currentUser.favoritos.includes(professional.uid));
    } else if (professional) {
      try {
        const favorites = JSON.parse(safeLocalStorage.getItem('favorites') || '[]');
        setIsFavorite(Array.isArray(favorites) && favorites.includes(professional.uid));
      } catch {
        setIsFavorite(false);
      }
    }
  }, [professional, currentUser?.favoritos]);

  const toggleFavorite = async () => {
    if (!professional) return;

    if (currentUser) {
      const nextState = !isFavorite;
      setIsFavorite(nextState);
      try {
        const userRef = doc(db, 'usuarios', currentUser.uid);
        const currentFavs = currentUser.favoritos || [];
        const newFavorites = nextState
          ? [...currentFavs.filter((id: string) => id !== professional.uid), professional.uid]
          : currentFavs.filter((id: string) => id !== professional.uid);
        
        await updateDoc(userRef, { favoritos: newFavorites });
      } catch (error) {
        console.error("Error updating favorites in Firestore:", error);
        setIsFavorite(!nextState);
      }
    } else {
      try {
        const favorites = JSON.parse(safeLocalStorage.getItem('favorites') || '[]');
        const favList = Array.isArray(favorites) ? favorites : [];
        let newFavorites;
        
        if (isFavorite) {
          newFavorites = favList.filter((id: string) => id !== professional.uid);
        } else {
          newFavorites = [...favList, professional.uid];
        }
        
        safeLocalStorage.setItem('favorites', JSON.stringify(newFavorites));
        setIsFavorite(!isFavorite);
      } catch (err) {
        console.warn("Could not save favorite locally:", err);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowShareFeedback(true);
      setTimeout(() => setShowShareFeedback(false), 2000);
    });
  };

  useEffect(() => {
    if (!slug) return;
    let unsubscribeSnapshot: (() => void) | null = null;
    
    const fetchAndSubscribeProfessional = async () => {
      try {
        let docId = '';

        // First try to find by slug
        const q = query(collection(db, 'usuarios'), where('slug', '==', slug), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          docId = querySnapshot.docs[0].id;
        } else {
          // Fallback to ID
          const docRef = doc(db, 'usuarios', slug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            docId = docSnap.id;
          }
        }
        
        if (docId) {
          // Increment profile views if not the owner (once per visit)
          if (currentUser?.uid !== docId) {
            try {
              await updateDoc(doc(db, 'usuarios', docId), {
                'profesionalInfo.profileViews': increment(1)
              });

              const today = new Date().toISOString().split('T')[0];
              const statsRef = doc(db, 'usuarios', docId, 'stats', today);
              await setDoc(statsRef, {
                views: increment(1),
                date: today
              }, { merge: true });
            } catch (e) {
              console.error("Error updating profile views", e);
            }
          }

          // Real-time listener for user document to ensure live VIP and profile sync
          unsubscribeSnapshot = onSnapshot(doc(db, 'usuarios', docId), (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              if (userData.rol === 'profesional') {
                // Verificar en tiempo real si el VIP expiró
                if (userData.profesionalInfo?.isVip && !isVipActive(userData.profesionalInfo)) {
                  checkAndExpireUserVip(docId, userData.profesionalInfo);
                  if (userData.profesionalInfo) {
                    userData.profesionalInfo.isVip = false;
                  }
                }
                setProfessional({ ...userData, uid: docId });
                setError('');
              } else {
                setError('El usuario no es un perfil profesional.');
              }
            } else {
              setError('Profesional no encontrado.');
            }
            setLoading(false);
          }, (err) => {
            console.error("Error in real-time profile listener:", err);
            setError('Error al conectar con el perfil.');
            setLoading(false);
          });
        } else {
          setError('Profesional no encontrado.');
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching professional:", err);
        setError('Error al cargar el perfil.');
        setLoading(false);
      }
    };

    fetchAndSubscribeProfessional();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [slug, currentUser?.uid]);

  const fetchReviews = async () => {
    if (!professional?.uid) return;
    try {
      // Try optimal query first
      const q = query(
        collection(db, 'resenas'),
        where('profesionalId', '==', professional.uid),
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
                  where('profesionalId', '==', professional.uid),
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
    if (!professional?.uid || !professional?.profesionalInfo) return;
    try {
      const userRef = doc(db, 'usuarios', professional.uid);
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

    if (!professional?.uid || currentUser.uid === professional.uid) return; // Can't chat with yourself

    try {
      // Check if chat already exists
      const q = query(
        collection(db, 'chats'),
        where('clientId', '==', currentUser.uid),
        where('workerId', '==', professional.uid)
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
          workerId: professional.uid,
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

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta reseña?")) return;
    
    try {
      await deleteDoc(doc(db, 'resenas', reviewId));
      setReviews(reviews.filter(r => r.id !== reviewId));
      
      // Recalculate rating
      if (professional && professional.uid) {
        const remainingReviews = reviews.filter(r => r.id !== reviewId);
        const newCount = remainingReviews.length;
        const totalRating = remainingReviews.reduce((acc, rev) => acc + rev.rating, 0);
        const newAvg = newCount > 0 ? totalRating / newCount : 0;
        
        await updateDoc(doc(db, 'usuarios', professional.uid), {
          'profesionalInfo.ratingAvg': newAvg,
          'profesionalInfo.reviewCount': newCount
        });
        
        setProfessional(prev => {
          if (!prev || !prev.profesionalInfo) return prev;
          return {
            ...prev,
            profesionalInfo: {
              ...prev.profesionalInfo,
              ratingAvg: newAvg,
              reviewCount: newCount
            }
          };
        });
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Error al eliminar la reseña.");
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
  const { rubro, descripcion, ratingAvg, reviewCount, isVip: _rawVip, telefono, contactEmail, direccion, cuit, haceFactura, tipoFactura, haceUrgencias, disponibilidadInmediata, isVerified, matriculado, matriculaVerified, preciosReferencia, fotosTrabajosDetalle, fotosTrabajos, fotoPortada, diasDisponibilidad } = professional.profesionalInfo;
  
  // Verificación estricta en tiempo real de membresía VIP
  const isVip = isVipActive(professional.profesionalInfo);

  // Insignias dinámicas de confianza (Respuesta Rápida, Muy Valorado, etc.)
  const badges = getProfessionalBadges(professional);

  const todayIndex = new Date().getDay();
  const worksToday = diasDisponibilidad ? diasDisponibilidad.includes(todayIndex) : [1, 2, 3, 4, 5].includes(todayIndex);
  const DAYS_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const profileUrl = window.location.href;

  const downloadQRCode = () => {
    const svg = document.getElementById('profile-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${nombre.replace(/\s+/g, '-')}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-gray-500 hover:text-indigo-600 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Volver al listado
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info Card */}
        <div className="lg:col-span-1">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border sticky top-24 transition-all ${isVip ? 'border-amber-300 dark:border-amber-500/50 shadow-amber-100/50 dark:shadow-none' : 'border-gray-100 dark:border-gray-700'}`}>
            <div className="h-48 bg-gray-200 relative overflow-hidden">
              {fotoPortada ? (
                <CachedImage 
                  src={fotoPortada} 
                  alt={`Portada de ${nombre}`} 
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              ) : (
                <div className={`w-full h-full ${isVip ? 'bg-slate-900 border-b-2 border-amber-400' : 'bg-slate-800'}`}></div>
              )}
              
              {/* Profile Actions */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                <button
                  onClick={toggleFavorite}
                  className="p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-all transform hover:scale-105 group"
                  title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
                >
                  <Heart 
                    size={18} 
                    className={`transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-700 dark:text-slate-200 group-hover:text-red-500'}`} 
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-all transform hover:scale-105 group relative"
                  title="Compartir perfil"
                >
                  {showShareFeedback ? (
                    <Check size={18} className="text-emerald-600 animate-in zoom-in" />
                  ) : (
                    <Share2 size={18} className="text-slate-700 dark:text-slate-200 group-hover:text-indigo-600" />
                  )}
                  {showShareFeedback && (
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-lg whitespace-nowrap animate-in fade-in slide-in-from-top-1 shadow-xl">
                      ¡Enlace copiado!
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition-all transform hover:scale-105 group"
                  title="Reportar perfil inapropiado o falso"
                >
                  <Flag size={18} />
                </button>
              </div>

              {/* Badge VIP exclusivo: solo visible si la membresía está vigente */}
              {isVip && (
                <div className="absolute top-4 right-4 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm z-10 border border-amber-300 animate-in fade-in zoom-in">
                  <Crown size={14} className="fill-slate-950" />
                  <span>VIP</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            
            <div className="px-6 pb-6 relative">
              <div className="relative -mt-16 mb-4 flex justify-center">
                <CachedImage 
                  src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                  alt={nombre} 
                  className={`w-32 h-32 rounded-full object-cover border-4 shadow-md bg-white transition-all ${isVip ? 'border-amber-400 ring-4 ring-amber-300/40' : 'border-white dark:border-gray-800'}`}
                  containerClassName="rounded-full"
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
                  {matriculaVerified && (
                    <div className="flex items-center text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800" title="Profesional Matriculado y Verificado">
                      <span className="text-xs font-bold uppercase tracking-wider">Matriculado</span>
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
                  {worksToday ? (
                    <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold border border-green-100 dark:border-green-800">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span>{disponibilidadInmediata ? 'DISPONIBLE AHORA' : 'ATIENDE HOY'}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full font-bold border border-gray-200 dark:border-gray-700">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span>CERRADO HOY</span>
                    </div>
                  )}
                </div>
                
                {diasDisponibilidad && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1">
                    {DAYS_NAMES.map((d, index) => (
                      <span 
                        key={d} 
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${diasDisponibilidad.includes(index) ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'text-gray-300 dark:text-gray-600'}`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
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

              {badges.length > 0 && (
                <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                    Insignias de Confianza
                  </div>
                  <ProfessionalBadges badges={badges} variant="compact" maxVisible={5} className="justify-center" />
                </div>
              )}

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
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Insignias</h3>
                <div className="grid grid-cols-2 gap-2">
                  {/* Badge: Verificado */}
                  {(isVerified || matriculaVerified) && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Verificado</span>
                    </div>
                  )}
                  {/* Badge: Puntualidad */}
                  {(ratingAvg || 0) >= 4.5 && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <CheckCircle size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Puntual</span>
                    </div>
                  )}
                  {/* Badge: Experiencia */}
                  {(reviewCount || 0) >= 10 && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Experto</span>
                    </div>
                  )}
                  {/* Badge: VIP */}
                  {isVip && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-100 dark:border-yellow-800">
                      <Star size={16} className="text-yellow-600 dark:text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-300 uppercase">VIP</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-3">Tu Código QR</h3>
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                    <QRCodeSVG 
                      id="profile-qr"
                      value={profileUrl} 
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <button 
                    onClick={downloadQRCode}
                    className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                  >
                    <Download size={14} /> Descargar QR para tu camioneta
                  </button>
                </div>

                {telefono && (
                  <a
                    href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${nombre}, vi tu perfil en Bahía Oficios y necesito presupuesto para un servicio de ${rubro}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageSquare size={18} />
                    Pedir Presupuesto Gratis en 1 Minuto
                  </a>
                )}
                <button
                  onClick={handleContactClick}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageSquare size={18} />
                  Contactar por Chat
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="w-full text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs py-2 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Flag size={13} />
                  <span>Reportar perfil inapropiado o falso</span>
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

          {/* Badges and Trust Seals */}
          {badges.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600 dark:text-indigo-400" />
                    Insignias de Confianza y Calidad
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Reconocimientos basados en el historial de servicio, velocidad de respuesta y calificaciones de vecinos bahienses.
                  </p>
                </div>
              </div>
              <ProfessionalBadges badges={badges} variant="detailed" />
            </div>
          )}

          {/* Reference Prices Section */}
          {preciosReferencia && preciosReferencia.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="text-indigo-600" />
                Precios de Referencia
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {preciosReferencia.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{item.servicio}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.precio}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-4 italic">
                * Los precios son orientativos y pueden variar según la complejidad del trabajo.
              </p>
            </div>
          )}

          {/* Portfolio Section */}
          {((fotosTrabajosDetalle && fotosTrabajosDetalle.length > 0) || (fotosTrabajos && fotosTrabajos.length > 0)) && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <IconImage className="text-indigo-600" />
                Trabajos Realizados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(fotosTrabajosDetalle || fotosTrabajos.map(url => ({ url, descripcion: '' }))).map((item, index) => (
                  <div key={index} className="flex flex-col gap-3 group">
                    <div className="aspect-video rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 shadow-sm">
                      <CachedImage 
                        src={item.url} 
                        alt={item.descripcion || `Trabajo ${index + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        containerClassName="w-full h-full"
                        onClick={() => window.open(item.url, '_blank')}
                      />
                    </div>
                    {item.descripcion && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic px-1">
                        {item.descripcion}
                      </p>
                    )}
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
                  profesionalId={professional.uid} 
                  profesionalNombre={nombre}
                  onReviewSubmitted={() => {
                    setShowReviewForm(false);
                    fetchReviews();
                  }}
                />
              </div>
            )}

            <div className="space-y-6">
              {!reviewsLoaded ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-gray-100 dark:border-gray-700 pb-6 animate-pulse">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <div key={j} className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 mt-4 pl-12">
                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
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
                      <div className="flex items-center gap-4">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={14} 
                              className={`${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
                            />
                          ))}
                        </div>
                        {currentUser?.isAdmin && (
                          <button 
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 pl-11 italic">
                      "{review.comentario}"
                    </p>
                    {review.badges && review.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pl-11">
                        {review.badges.map((badge, idx) => (
                          <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    {review.fotos && review.fotos.length > 0 && (
                      <div className="flex gap-2 mt-3 pl-11 overflow-x-auto">
                        {review.fotos.map((foto, idx) => (
                          <CachedImage 
                            key={idx} 
                            src={foto} 
                            alt={`Foto de reseña ${idx + 1}`} 
                            className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                            containerClassName="h-20 w-20 shrink-0 rounded-lg"
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

      {showReportModal && professional && (
        <ReportModal
          professional={professional}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
