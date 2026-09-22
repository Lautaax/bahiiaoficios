import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { Star, MapPin, Phone, MessageSquare, MessageCircle, Mail, X, Briefcase, Heart, Share2, Check, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { PROFESSIONS } from '../constants';
import { isVipActive } from '../utils/vipUtils';
import { CachedImage } from './CachedImage';
import { safeLocalStorage } from '../utils/storage';
import { getProfessionalBadges } from '../utils/badgeUtils';
import { ProfessionalBadges } from './ProfessionalBadges';

interface ProfessionalCardProps {
  professional: User;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional }) => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareFeedback, setShowShareFeedback] = useState(false);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.favoritos) {
      setIsFavorite(currentUser.favoritos.includes(professional.uid));
    } else {
      try {
        const favorites = JSON.parse(safeLocalStorage.getItem('favorites') || '[]');
        if (professional.uid && Array.isArray(favorites)) {
          setIsFavorite(favorites.includes(professional.uid));
        }
      } catch {
        setIsFavorite(false);
      }
    }
  }, [professional.uid, currentUser?.favoritos]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!professional.uid) return;

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

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const profileUrl = `${window.location.origin}/profesional/${professional.slug || professional.uid}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setShowShareFeedback(true);
      setTimeout(() => setShowShareFeedback(false), 2000);
    });
  };

  if (professional.rol !== 'profesional' || !professional.profesionalInfo) {
    return null;
  }

  const { nombre, zona, fotoUrl, uid } = professional;
  const { 
    rubro, 
    descripcion, 
    ratingAvg, 
    reviewCount, 
    telefono, 
    contactEmail, 
    direccion, 
    haceUrgencias, 
    disponibilidadInmediata, 
    isVerified, 
    matriculado, 
    matriculaVerified, 
    preciosReferencia, 
    fotoPortada, 
    diasDisponibilidad 
  } = professional.profesionalInfo;

  const isVip = isVipActive(professional.profesionalInfo);

  const todayIndex = new Date().getDay();
  const worksToday = diasDisponibilidad ? diasDisponibilidad.includes(todayIndex) : [1, 2, 3, 4, 5].includes(todayIndex);

  // Find profession icon
  const professionData = PROFESSIONS.find(p => p.name === rubro);
  const ProfessionIcon = professionData?.icon || Briefcase;

  // Calculate lowest reference price if available
  const minPrice = useMemo(() => {
    if (!preciosReferencia || preciosReferencia.length === 0) return null;
    const numbers = preciosReferencia
      .map(p => parseInt(p.precio.replace(/\D/g, '')) || 0)
      .filter(n => n > 0);
    if (numbers.length > 0) {
      return Math.min(...numbers);
    }
    return null;
  }, [preciosReferencia]);

  // Compute reputation & response badges
  const badges = useMemo(() => getProfessionalBadges(professional), [professional]);

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
          relative flex flex-col justify-between h-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden transition-colors
          ${isVip 
            ? 'border border-amber-300/80 dark:border-amber-500/50' 
            : 'border border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'}
        `}
      >
        {/* Top Header / Subtle Neutral Banner */}
        <div className="relative h-14 bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
          {fotoPortada && (
            <CachedImage 
              src={fotoPortada} 
              alt={`Portada de ${nombre}`} 
              className="w-full h-full object-cover opacity-60 dark:opacity-40"
              containerClassName="w-full h-full"
              loading="lazy"
            />
          )}

          {/* VIP Badge */}
          {isVip && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                <Star size={10} className="fill-amber-500 text-amber-500" /> VIP
              </span>
            </div>
          )}

          {/* Quick Actions (Favorite & Share) */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
            <button
              onClick={toggleFavorite}
              aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              className="p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-400 hover:text-rose-500 transition-colors"
              title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart size={14} className={isFavorite ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
            <button
              onClick={handleShare}
              aria-label="Compartir perfil"
              className="p-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-400 hover:text-indigo-600 transition-colors relative"
              title="Compartir perfil"
            >
              {showShareFeedback ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
              {showShareFeedback && (
                <span className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                  ¡Copiado!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 pt-0 flex flex-col flex-1">
          {/* Identity & Status Pill */}
          <div className="flex items-end justify-between -mt-7 mb-2.5">
            <Link to={`/profesional/${professional.slug || uid}`} className="block relative group">
              <CachedImage 
                src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                alt={nombre} 
                className={`w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-700 transition-transform group-hover:scale-105 ${isVip ? 'ring-1 ring-amber-400' : ''}`}
                containerClassName="rounded-full"
                loading="lazy"
              />
            </Link>

            {/* Single clean priority status pill in neutral style */}
            <div>
              {haceUrgencias ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Urgencias
                </span>
              ) : disponibilidadInmediata || worksToday ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Disponible
                </span>
              ) : matriculado ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  <BadgeCheck size={12} className="text-slate-500 dark:text-slate-400" />
                  Matriculado
                </span>
              ) : null}
            </div>
          </div>

          {/* Name, Verification & Category */}
          <div className="mb-2">
            <div className="flex items-center gap-1.5">
              <Link 
                to={`/profesional/${professional.slug || uid}`}
                className="font-extrabold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
              >
                {nombre}
              </Link>
              {(matriculaVerified || isVerified) && (
                <span title={matriculaVerified ? "Matrícula verificada" : "Identidad verificada"} className="inline-flex shrink-0">
                  <BadgeCheck 
                    size={15} 
                    className="text-emerald-600 dark:text-emerald-400" 
                  />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <ProfessionIcon size={12} className="shrink-0 text-slate-400" />
                {rubro}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 truncate">
                <MapPin size={11} className="shrink-0 text-slate-400" />
                {zona}
              </span>
            </div>
          </div>

          {/* Rating & Pricing Line */}
          <div className="flex items-center justify-between text-xs my-2 py-1.5 border-y border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Star size={13} className="text-amber-400 fill-amber-400" />
              <span className="font-bold text-slate-900 dark:text-white">
                {ratingAvg ? ratingAvg.toFixed(1) : 'Nuevo'}
              </span>
              <span className="text-slate-400 text-[11px]">
                ({reviewCount || 0})
              </span>
            </div>

            {minPrice ? (
              <span className="text-[11px] font-medium">
                Desde <strong className="text-slate-900 dark:text-white font-semibold">${minPrice.toLocaleString('es-AR')}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">A convenir</span>
            )}
          </div>

          {/* Trust and Performance Badges (Respuesta Rápida, Muy Valorado, etc.) */}
          {badges.length > 0 && (
            <div className="mb-2">
              <ProfessionalBadges badges={badges} variant="compact" maxVisible={3} />
            </div>
          )}

          {/* Description snippet */}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4 flex-1">
            {descripcion || 'Profesional verificado en Bahía Blanca para presupuestos y trabajos.'}
          </p>

          {/* Action Buttons: Primary action 'Conocer trabajos y opiniones' gets the color accent, secondary action remains neutral */}
          <div className="mt-auto pt-1 flex items-center gap-2">
            <Link 
              to={`/profesional/${professional.slug || uid}`}
              className="flex-1 text-center py-2 px-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Conocer trabajos y opiniones
            </Link>

            {telefono ? (
              <a 
                href={`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${nombre}, vi tu perfil en Bahía Oficios y necesito presupuesto para un servicio de ${rubro}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 transition-colors"
              >
                <MessageSquare size={13} />
                WhatsApp
              </a>
            ) : (
              <button 
                onClick={() => setShowContactModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 transition-colors"
              >
                <MessageCircle size={13} />
                Contactar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contact Modal (Fallback when no phone is available) */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-5 text-white relative">
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3.5">
                <CachedImage 
                  src={fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=random`} 
                  alt={nombre} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                  containerClassName="rounded-full shrink-0"
                  loading="lazy"
                />
                <div>
                  <h3 className="font-bold text-lg">{nombre}</h3>
                  <div className="flex items-center gap-1.5 text-indigo-100 text-xs">
                    <ProfessionIcon size={13} />
                    <span>{rubro}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Canales de Contacto</h4>
              
              <div className="space-y-3">
                {telefono ? (
                  <a 
                    href={`tel:${telefono}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-full text-emerald-600 dark:text-emerald-400">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Teléfono / Llamada</p>
                      <p className="text-slate-900 dark:text-white text-xs font-semibold">{telefono}</p>
                    </div>
                  </a>
                ) : null}
                
                {contactEmail ? (
                  <a 
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    <div className="bg-blue-50 dark:bg-blue-950/60 p-2.5 rounded-full text-blue-600 dark:text-blue-400">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Correo Electrónico</p>
                      <p className="text-slate-900 dark:text-white text-xs font-semibold break-all">{contactEmail}</p>
                    </div>
                  </a>
                ) : null}

                {direccion && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="bg-slate-100 dark:bg-slate-700 p-2.5 rounded-full text-slate-500">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Dirección / Taller</p>
                      <p className="text-slate-900 dark:text-white text-xs font-semibold">{direccion}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContactClick}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors text-xs font-bold shadow-xs mt-2"
                >
                  <MessageSquare size={16} />
                  Enviar mensaje por Chat Interno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
