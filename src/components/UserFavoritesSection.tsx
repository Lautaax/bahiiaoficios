import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { Heart, Star, MapPin, Phone, MessageSquare, ExternalLink, Trash2, ArrowRight } from 'lucide-react';
import { CachedImage } from './CachedImage';
import { isVipActive } from '../utils/vipUtils';

export const UserFavoritesSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [favoritePros, setFavoritePros] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteProfiles = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const favIds = currentUser.favoritos || [];

      if (favIds.length === 0) {
        setFavoritePros([]);
        setLoading(false);
        return;
      }

      try {
        const loaded: User[] = [];
        for (const favId of favIds) {
          try {
            const docSnap = await getDoc(doc(db, 'usuarios', favId));
            if (docSnap.exists()) {
              loaded.push({ uid: docSnap.id, ...docSnap.data() } as User);
            }
          } catch (e) {
            console.warn(`Error fetching favorite pro ${favId}:`, e);
          }
        }
        setFavoritePros(loaded);
      } catch (err) {
        console.error("Error loading favorite professionals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteProfiles();
  }, [currentUser?.favoritos]);

  const handleRemoveFavorite = async (proId: string) => {
    if (!currentUser) return;

    try {
      const newFavs = (currentUser.favoritos || []).filter(id => id !== proId);
      const userRef = doc(db, 'usuarios', currentUser.uid);
      await updateDoc(userRef, { favoritos: newFavs });
      setFavoritePros(prev => prev.filter(p => p.uid !== proId));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 animate-pulse flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart size={20} className="fill-rose-500 text-rose-500" />
            Mis Profesionales Favoritos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Guardaste {favoritePros.length} {favoritePros.length === 1 ? 'profesional' : 'profesionales'} para contactar rápidamente
          </p>
        </div>

        <Link
          to="/dashboard"
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Explorar más <ArrowRight size={13} />
        </Link>
      </div>

      {favoritePros.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-10 text-center">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No tienes favoritos guardados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
            Cuando encuentres un gasista, electricista o profesional que te interese, presiona el botón de corazón en su tarjeta para tenerlo a mano siempre.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            Buscar Profesionales
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favoritePros.map((pro) => {
            const isVip = isVipActive(pro.profesionalInfo);
            return (
              <div 
                key={pro.uid}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-3.5 mb-3">
                  <Link to={`/profesional/${pro.slug || pro.uid}`} className="shrink-0">
                    <CachedImage
                      src={pro.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(pro.nombre)}`}
                      alt={pro.nombre}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      containerClassName="w-14 h-14 rounded-xl"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <Link 
                        to={`/profesional/${pro.slug || pro.uid}`}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                      >
                        {pro.nombre}
                      </Link>
                      {isVip && (
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/80 shrink-0">
                          VIP
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      {pro.profesionalInfo?.rubro || 'Profesional'}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {pro.zona && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={11} className="shrink-0" /> {pro.zona}
                        </span>
                      )}
                      {pro.profesionalInfo?.ratingAvg ? (
                        <span className="flex items-center gap-1 text-amber-500 font-bold shrink-0">
                          <Star size={11} className="fill-amber-400" />
                          {pro.profesionalInfo.ratingAvg.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(pro.uid)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs flex items-center gap-1 transition-colors"
                    title="Quitar de favoritos"
                  >
                    <Trash2 size={13} />
                    <span>Quitar</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {pro.profesionalInfo?.telefono && (
                      <a
                        href={`https://wa.me/549${pro.profesionalInfo.telefono.replace(/\D/g, '')}?text=${encodeURIComponent('Hola! Te contacto desde Bahía Oficios.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                    )}
                    <Link
                      to={`/profesional/${pro.slug || pro.uid}`}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      Ver Perfil <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
