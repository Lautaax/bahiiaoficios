import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { ShieldCheck, Trash2, Edit, CheckCircle, XCircle, X, Image as ImageIcon, Megaphone, Tag, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Ad, TradeDiscount } from '../types';
import { uploadToFirebase } from '../services/firebaseStorageService';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'publicidad' | 'descuentos'>('usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [discounts, setDiscounts] = useState<TradeDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [viewingDni, setViewingDni] = useState<User | null>(null);
  const [managingBadges, setManagingBadges] = useState<User | null>(null);
  const [newBadge, setNewBadge] = useState('');

  // Ad/Discount Form States
  const [showAdForm, setShowAdForm] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [newAd, setNewAd] = useState<Partial<Ad>>({ position: 'home_carousel', active: true });
  const [newDiscount, setNewDiscount] = useState<Partial<TradeDiscount>>({ active: true });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentUser?.isAdmin) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersSnap, adsSnap, discountsSnap] = await Promise.all([
          getDocs(collection(db, 'usuarios')),
          getDocs(collection(db, 'ads')),
          getDocs(collection(db, 'tradeDiscounts'))
        ]);

        setUsers(usersSnap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
        setAds(adsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ad)));
        setDiscounts(discountsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as TradeDiscount)));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleVerify = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`¿Estás seguro de que quieres ${currentStatus ? 'quitar la verificación' : 'verificar'} a este profesional?`)) return;
    
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        'profesionalInfo.isVerified': !currentStatus
      });
      setUsers(users.map(u => u.uid === userId && u.profesionalInfo ? { ...u, profesionalInfo: { ...u.profesionalInfo, isVerified: !currentStatus } } : u));
    } catch (error) {
      console.error("Error updating verification:", error);
      alert("Error al actualizar la verificación.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres ELIMINAR a este usuario? Esta acción no se puede deshacer.")) return;
    
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      setUsers(users.filter(u => u.uid !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el usuario.");
    }
  };

  const handleAddBadge = async () => {
    if (!managingBadges || !newBadge.trim()) return;
    const currentBadges = managingBadges.profesionalInfo?.badges || [];
    if (currentBadges.includes(newBadge.trim())) return;
    
    const updatedBadges = [...currentBadges, newBadge.trim()];
    try {
      await updateDoc(doc(db, 'usuarios', managingBadges.uid), {
        'profesionalInfo.badges': updatedBadges
      });
      setUsers(users.map(u => u.uid === managingBadges.uid ? { ...u, profesionalInfo: { ...u.profesionalInfo, badges: updatedBadges } as any } : u));
      setManagingBadges({ ...managingBadges, profesionalInfo: { ...managingBadges.profesionalInfo, badges: updatedBadges } as any });
      setNewBadge('');
    } catch (error) {
      console.error("Error adding badge:", error);
    }
  };

  const handleRemoveBadge = async (badge: string) => {
    if (!managingBadges) return;
    const updatedBadges = (managingBadges.profesionalInfo?.badges || []).filter(b => b !== badge);
    try {
      await updateDoc(doc(db, 'usuarios', managingBadges.uid), {
        'profesionalInfo.badges': updatedBadges
      });
      setUsers(users.map(u => u.uid === managingBadges.uid ? { ...u, profesionalInfo: { ...u.profesionalInfo, badges: updatedBadges } as any } : u));
      setManagingBadges({ ...managingBadges, profesionalInfo: { ...managingBadges.profesionalInfo, badges: updatedBadges } as any });
    } catch (error) {
      console.error("Error removing badge:", error);
    }
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: any = {
        nombre: editingUser.nombre,
        nombreNegocio: editingUser.nombreNegocio || null,
        telefono: editingUser.telefono,
        rol: editingUser.rol,
        isAdmin: editingUser.isAdmin || false
      };

      if (editingUser.rol === 'profesional' && editingUser.profesionalInfo) {
        updateData.profesionalInfo = {
          ...editingUser.profesionalInfo,
          nombreNegocio: editingUser.nombreNegocio || null
        };
      }

      await updateDoc(doc(db, 'usuarios', editingUser.uid), updateData);
      setUsers(users.map(u => u.uid === editingUser.uid ? editingUser : u));
      setEditingUser(null);
      alert("Usuario actualizado correctamente.");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Error al actualizar el usuario.");
    }
  };

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingAd) {
        await updateDoc(doc(db, 'ads', editingAd.id), {
          ...newAd,
          offersTradeDiscount: newAd.offersTradeDiscount || false,
          tradeDiscountDetails: newAd.offersTradeDiscount ? newAd.tradeDiscountDetails : '',
          updatedAt: new Date()
        });
        setAds(ads.map(ad => ad.id === editingAd.id ? { ...ad, ...newAd } as Ad : ad));
        alert("Publicidad actualizada");
      } else {
        const adRef = collection(db, 'ads');
        const adData = {
          ...newAd,
          offersTradeDiscount: newAd.offersTradeDiscount || false,
          tradeDiscountDetails: newAd.offersTradeDiscount ? newAd.tradeDiscountDetails : '',
          createdAt: new Date()
        };
        const docRef = await addDoc(adRef, adData);
        setAds([...ads, { ...adData, id: docRef.id } as Ad]);
        alert("Publicidad creada");
      }
      setShowAdForm(false);
      setEditingAd(null);
      setNewAd({ position: 'home_carousel', active: true });
    } catch (error) {
      console.error("Error saving ad:", error);
      alert("Error al guardar la publicidad");
    } finally {
      setUploading(false);
    }
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const discountRef = collection(db, 'tradeDiscounts');
      const discountData = {
        ...newDiscount,
        createdAt: new Date()
      };
      const docRef = await addDoc(discountRef, discountData);
      setDiscounts([...discounts, { ...discountData, id: docRef.id } as TradeDiscount]);
      setShowDiscountForm(false);
      setNewDiscount({ active: true });
    } catch (error) {
      console.error("Error saving discount:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'ad' | 'discount') => {
    setUploading(true);
    try {
      const url = await uploadToFirebase(file, type === 'ad' ? 'ads' : 'discounts');
      if (type === 'ad') setNewAd({ ...newAd, imageUrl: url });
      else setNewDiscount({ ...newDiscount, imageUrl: url });
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  const toggleAdStatus = async (adId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'ads', adId), { active: !currentStatus });
      setAds(ads.map(ad => ad.id === adId ? { ...ad, active: !currentStatus } : ad));
    } catch (error) {
      console.error("Error toggling ad status:", error);
    }
  };

  const toggleDiscountStatus = async (discountId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'tradeDiscounts', discountId), { active: !currentStatus });
      setDiscounts(discounts.map(d => d.id === discountId ? { ...d, active: !currentStatus } : d));
    } catch (error) {
      console.error("Error toggling discount status:", error);
    }
  };

  const deleteAd = async (adId: string) => {
    if (!window.confirm("¿Eliminar esta publicidad?")) return;
    try {
      await deleteDoc(doc(db, 'ads', adId));
      setAds(ads.filter(ad => ad.id !== adId));
    } catch (error) {
      console.error("Error deleting ad:", error);
    }
  };

  const deleteDiscount = async (discountId: string) => {
    if (!window.confirm("¿Eliminar este beneficio?")) return;
    try {
      await deleteDoc(doc(db, 'tradeDiscounts', discountId));
      setDiscounts(discounts.filter(d => d.id !== discountId));
    } catch (error) {
      console.error("Error deleting discount:", error);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando panel de administración...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
        <ShieldCheck className="text-indigo-600" size={32} />
        Panel de Administración
      </h1>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'usuarios' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
        >
          <ShieldCheck size={20} />
          Usuarios
        </button>
        <button 
          onClick={() => setActiveTab('publicidad')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'publicidad' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
        >
          <Megaphone size={20} />
          Publicidad
        </button>
        <button 
          onClick={() => setActiveTab('descuentos')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'descuentos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'}`}
        >
          <Tag size={20} />
          Descuentos Gremio
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Usuario</th>
                  <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Rol</th>
                  <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">Verificado</th>
                  <th className="p-4 font-semibold text-gray-700 dark:text-gray-300 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.uid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={user.fotoUrl || `https://ui-avatars.com/api/?name=${user.nombre}`} alt={user.nombre} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {user.nombre}
                            {user.nombreNegocio && <span className="ml-2 text-xs font-normal text-gray-500">({user.nombreNegocio})</span>}
                          </p>
                          <p className="text-xs text-gray-500">{user.slug || user.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${user.rol === 'profesional' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                        {user.rol}
                      </span>
                      {user.isAdmin && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                    <td className="p-4">
                      {user.rol === 'profesional' ? (
                        <button 
                          onClick={() => handleVerify(user.uid, !!user.profesionalInfo?.isVerified)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${user.profesionalInfo?.isVerified ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        >
                          {user.profesionalInfo?.isVerified ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          {user.profesionalInfo?.isVerified ? 'Verificado' : 'No Verificado'}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.rol === 'profesional' && user.profesionalInfo?.fotoDni && currentUser?.isAdmin && (
                          <button 
                            onClick={() => setViewingDni(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver DNI"
                          >
                            <ImageIcon size={18} />
                          </button>
                        )}
                        {user.rol === 'profesional' && (
                          <button 
                            onClick={() => setManagingBadges(user)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Gestionar Insignias"
                          >
                            <Tag size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/profesional/${user.slug || user.uid}`)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver Perfil Público"
                        >
                          <ShieldCheck size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Usuario"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'publicidad' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Publicidad</h2>
            <button 
              onClick={() => setShowAdForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              Nueva Publicidad
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map(ad => (
              <div key={ad.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 group">
                <div className="relative h-40 overflow-hidden">
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingAd(ad);
                        setNewAd(ad);
                        setShowAdForm(true);
                      }}
                      className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full text-indigo-600 shadow-sm hover:bg-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => deleteAd(ad.id)}
                      className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-full text-red-600 shadow-sm hover:bg-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{ad.title}</h3>
                  <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider font-semibold">{ad.position.replace('_', ' ')}</p>
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => toggleAdStatus(ad.id, ad.active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${ad.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {ad.active ? 'Activa' : 'Inactiva'}
                    </button>
                    <span className="text-[10px] text-gray-400">ID: {ad.id.substring(0, 8)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'descuentos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Beneficios para el Gremio</h2>
            <button 
              onClick={() => setShowDiscountForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={20} />
              Nuevo Beneficio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discounts.map(d => (
              <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">{d.businessName}</h3>
                <p className="text-sm text-indigo-600 font-bold mb-2">{d.discount} OFF</p>
                <p className="text-sm text-gray-500 mb-4">{d.category}</p>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => toggleDiscountStatus(d.id, d.active)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {d.active ? 'Activo' : 'Inactivo'}
                  </button>
                  <button onClick={() => deleteDiscount(d.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad Form Modal */}
      {showAdForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingAd ? 'Editar Publicidad' : 'Nueva Publicidad'}
              </h3>
              <button 
                onClick={() => {
                  setShowAdForm(false);
                  setEditingAd(null);
                  setNewAd({ position: 'home_carousel', active: true });
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input type="text" value={newAd.title || ''} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea value={newAd.description || ''} onChange={e => setNewAd({...newAd, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" rows={2} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posición</label>
                <select value={newAd.position} onChange={e => setNewAd({...newAd, position: e.target.value as any})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700">
                  <option value="home_carousel">Carrusel Home</option>
                  <option value="sidebar">Barra Lateral</option>
                  <option value="footer">Pie de Página</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen</label>
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'ad')} className="w-full text-sm" required={!newAd.imageUrl} />
                {newAd.imageUrl && <img src={newAd.imageUrl} className="mt-2 h-20 rounded" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link (Opcional)</label>
                <input type="url" value={newAd.link || ''} onChange={e => setNewAd({...newAd, link: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" />
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">¿Descuento al gremio?</span>
                  <button
                    type="button"
                    onClick={() => setNewAd({...newAd, offersTradeDiscount: !newAd.offersTradeDiscount})}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${newAd.offersTradeDiscount ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${newAd.offersTradeDiscount ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {newAd.offersTradeDiscount && (
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Detalle del Descuento</label>
                    <input 
                      type="text" 
                      value={newAd.tradeDiscountDetails || ''} 
                      onChange={e => setNewAd({...newAd, tradeDiscountDetails: e.target.value})} 
                      placeholder="Ej: 10% OFF a profesionales"
                      className="w-full px-3 py-1.5 text-sm border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800"
                    />
                  </div>
                )}
              </div>
              <button type="submit" disabled={uploading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                {uploading ? 'Subiendo...' : 'Guardar Publicidad'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Discount Form Modal */}
      {showDiscountForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Nuevo Beneficio Gremio</h3>
              <button onClick={() => setShowDiscountForm(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDiscountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Comercio</label>
                <input type="text" value={newDiscount.businessName || ''} onChange={e => setNewDiscount({...newDiscount, businessName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción del Beneficio</label>
                <textarea value={newDiscount.description || ''} onChange={e => setNewDiscount({...newDiscount, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" rows={2} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento (Ej: 15%)</label>
                  <input type="text" value={newDiscount.discount || ''} onChange={e => setNewDiscount({...newDiscount, discount: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría/Gremio</label>
                  <input type="text" value={newDiscount.category || ''} onChange={e => setNewDiscount({...newDiscount, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" placeholder="Ej: Electricistas" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                <input type="text" value={newDiscount.address || ''} onChange={e => setNewDiscount({...newDiscount, address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen (Opcional)</label>
                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'discount')} className="w-full text-sm" />
                {newDiscount.imageUrl && <img src={newDiscount.imageUrl} className="mt-2 h-20 rounded" />}
              </div>
              <button type="submit" disabled={uploading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                {uploading ? 'Subiendo...' : 'Guardar Beneficio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editingUser.nombre} 
                  onChange={(e) => setEditingUser({...editingUser, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={editingUser.telefono || ''} 
                  onChange={(e) => setEditingUser({...editingUser, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select 
                  value={editingUser.rol} 
                  onChange={(e) => setEditingUser({...editingUser, rol: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="cliente">Cliente</option>
                  <option value="profesional">Profesional</option>
                </select>
              </div>
              
              {editingUser.rol === 'profesional' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rubro</label>
                    <input 
                      type="text" 
                      value={editingUser.profesionalInfo?.rubro || ''} 
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        profesionalInfo: { ...editingUser.profesionalInfo, rubro: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <textarea 
                      value={editingUser.profesionalInfo?.descripcion || ''} 
                      onChange={(e) => setEditingUser({
                        ...editingUser, 
                        profesionalInfo: { ...editingUser.profesionalInfo, descripcion: e.target.value } as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isAdmin"
                  checked={editingUser.isAdmin || false} 
                  onChange={(e) => setEditingUser({...editingUser, isAdmin: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 dark:text-gray-300">Es Administrador</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Negocio (Opcional)</label>
                <input 
                  type="text" 
                  value={editingUser.nombreNegocio || ''} 
                  onChange={(e) => setEditingUser({...editingUser, nombreNegocio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ej: Electricidad Bahía"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDni && currentUser?.isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Verificación de DNI: {viewingDni.nombre}</h3>
              <button onClick={() => setViewingDni(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              {viewingDni.profesionalInfo?.fotoDni ? (
                <img 
                  src={viewingDni.profesionalInfo.fotoDni} 
                  alt="DNI" 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-gray-200 dark:border-gray-700" 
                />
              ) : (
                <p className="text-gray-500">No hay foto de DNI disponible.</p>
              )}
              
              <div className="flex gap-4 mt-6 w-full justify-center">
                <button 
                  onClick={() => {
                    handleVerify(viewingDni.uid, false);
                    setViewingDni(null);
                  }}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} /> Aceptar y Verificar
                </button>
                <button 
                  onClick={() => {
                    handleVerify(viewingDni.uid, true); // this un-verifies
                    setViewingDni(null);
                  }}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle size={18} /> Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {managingBadges && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Insignias: {managingBadges.nombre}</h3>
              <button onClick={() => setManagingBadges(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {(managingBadges.profesionalInfo?.badges || []).map(badge => (
                  <span key={badge} className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
                    {badge}
                    <button onClick={() => handleRemoveBadge(badge)} className="hover:text-red-600">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {(managingBadges.profesionalInfo?.badges || []).length === 0 && (
                  <p className="text-gray-500 text-sm italic">Sin insignias asignadas.</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Sugerencias</label>
                <div className="flex flex-wrap gap-2">
                  {['Puntual', 'Gran Comunicación', 'Experto en Urgencias', 'Precio Justo', 'Limpieza', 'Matriculado', 'Verificado'].map(s => (
                    <button 
                      key={s}
                      onClick={() => {
                        setNewBadge(s);
                        // Trigger add immediately if clicked from suggestions
                        const currentBadges = managingBadges.profesionalInfo?.badges || [];
                        if (!currentBadges.includes(s)) {
                          setNewBadge(s);
                          // We can't easily call handleAddBadge here because state hasn't updated yet
                          // So we'll just set it and let them click add, or handle it here
                        }
                      }}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newBadge} 
                  onChange={e => setNewBadge(e.target.value)}
                  placeholder="Nueva insignia..."
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleAddBadge}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
