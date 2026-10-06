import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  PlusCircle, 
  Search, 
  Filter, 
  MapPin, 
  DollarSign, 
  Share2, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Tag, 
  Layers, 
  Phone, 
  AlertCircle,
  X,
  Upload,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ZONAS } from '../constants';
import { uploadToFirebase } from '../services/firebaseStorageService';
import { CachedImage } from './CachedImage';

export interface HerramientaItem {
  id?: string;
  titulo: string;
  categoria: string;
  estadoProducto: 'como_nuevo' | 'buen_estado' | 'usado' | 'para_reparar';
  precio: number;
  esPrecioAConvenir?: boolean;
  zona: string;
  descripcion: string;
  fotoUrl?: string;
  vendedorId?: string;
  vendedorNombre: string;
  vendedorTelefono: string;
  vendedorRol?: string;
  fechaCreacion?: any;
  disponible?: boolean;
}

const CATEGORIAS_HERRAMIENTAS = [
  'Todas',
  'Herramientas Eléctricas',
  'Andamios y Escaleras',
  'Maquinaria y Hormigoneras',
  'Herramientas Manuales',
  'Sobrantes de Obra y Materiales',
  'Seguridad e Indumentaria'
];

const ESTADOS_PRODUCTO: Record<string, { label: string; color: string }> = {
  como_nuevo: { label: 'Como Nuevo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  buen_estado: { label: 'Buen Estado', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' },
  usado: { label: 'Usado Funcional', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  para_reparar: { label: 'Para Reparar / Repuestos', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' }
};

export const HerramientasMarketplace: React.FC = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<HerramientaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');
  const [selectedZona, setSelectedZona] = useState('Todas');
  const [selectedEstado, setSelectedEstado] = useState('todos');

  // Modal de publicación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Herramientas Eléctricas');
  const [estadoProducto, setEstadoProducto] = useState<'como_nuevo' | 'buen_estado' | 'usado' | 'para_reparar'>('buen_estado');
  const [precio, setPrecio] = useState('');
  const [esAConvenir, setEsAConvenir] = useState(false);
  const [zona, setZona] = useState(ZONAS[0] || 'Centro');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Escuchar publicaciones de Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'herramientas_usadas'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: HerramientaItem[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as HerramientaItem));

      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.warn('Error fetching herramientas_usadas:', error);
      setItems([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Precompletar teléfono cuando se abre el modal
  useEffect(() => {
    if (showCreateModal && currentUser) {
      if (currentUser.profesionalInfo?.telefono) {
        setTelefono(currentUser.profesionalInfo.telefono);
      }
      if (currentUser.zona) {
        setZona(currentUser.zona);
      }
    }
  }, [showCreateModal, currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setFormError('Por favor indicá el título del producto.');
      return;
    }
    if (!esAConvenir && (!precio || Number(precio) <= 0)) {
      setFormError('Por favor indicá un precio válido o marcá precio a convenir.');
      return;
    }
    if (!telefono.trim()) {
      setFormError('Por favor indicá un teléfono o WhatsApp de contacto.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      let fotoUrl = '';
      if (selectedFile) {
        fotoUrl = await uploadToFirebase(selectedFile, 'herramientas');
      }

      const newItem: Omit<HerramientaItem, 'id'> = {
        titulo: titulo.trim(),
        categoria,
        estadoProducto,
        precio: esAConvenir ? 0 : Number(precio),
        esPrecioAConvenir: esAConvenir,
        zona,
        descripcion: descripcion.trim(),
        fotoUrl,
        vendedorId: currentUser?.uid || 'invitado',
        vendedorNombre: currentUser?.nombre || 'Vecino de Bahía',
        vendedorTelefono: telefono.trim(),
        vendedorRol: currentUser?.rol || 'vecino',
        fechaCreacion: serverTimestamp(),
        disponible: true
      };

      await addDoc(collection(db, 'herramientas_usadas'), newItem);

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowCreateModal(false);
        setTitulo('');
        setPrecio('');
        setDescripcion('');
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error creating tool listing:', err);
      setFormError('Hubo un error al publicar. Intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado
  const filteredItems = items.filter(item => {
    const matchesSearch = search.trim() === '' || 
      item.titulo.toLowerCase().includes(search.toLowerCase()) ||
      item.descripcion?.toLowerCase().includes(search.toLowerCase());

    const matchesCat = selectedCategoria === 'Todas' || item.categoria === selectedCategoria;
    const matchesZona = selectedZona === 'Todas' || item.zona === selectedZona;
    const matchesEstado = selectedEstado === 'todos' || item.estadoProducto === selectedEstado;

    return matchesSearch && matchesCat && matchesZona && matchesEstado;
  });

  const getWhatsAppLink = (item: HerramientaItem) => {
    const cleanPhone = item.vendedorTelefono.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone}`;
    const precioTxt = item.esPrecioAConvenir ? 'a convenir' : `$${item.precio.toLocaleString('es-AR')}`;
    const message = `Hola ${item.vendedorNombre}! Te contacto desde Bahía Oficios por tu publicación de "${item.titulo}" (${precioTxt}) en ${item.zona}. ¿Sigue disponible?`;
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-amber-400" />
              <span>Mercado Colegas & Vecinos • Bahía Blanca</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Bolsa de Herramientas y Materiales de Obra
            </h1>
            <p className="text-sm text-indigo-200/90 leading-relaxed">
              Comprá, vendé o alquilá herramientas usadas, andamios, hormigoneras y sobrantes de obra directo entre trabajadores y vecinos de Bahía Blanca. Sin comisiones.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={18} />
            <span>Publicar Herramienta o Material</span>
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar taladro, andamio, cerámicos..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Selector Categoría */}
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {CATEGORIAS_HERRAMIENTAS.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Selector Zona */}
          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="Todas">Todas las Zonas</option>
            {ZONAS.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          {/* Selector Estado */}
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="todos">Cualquier estado</option>
            <option value="como_nuevo">Como nuevo</option>
            <option value="buen_estado">Buen estado</option>
            <option value="usado">Usado funcional</option>
            <option value="para_reparar">Para reparar / repuestos</option>
          </select>
        </div>

        {/* Categorías Rápidas en Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {CATEGORIAS_HERRAMIENTAS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoria(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategoria === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Publicaciones */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 animate-pulse space-y-3">
              <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Wrench size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No hay publicaciones con estos filtros
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Sé el primero en publicar herramientas, andamios o sobrantes de obra en Bahía Blanca.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
          >
            Publicar Ahora (Gratis)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const estadoInfo = ESTADOS_PRODUCTO[item.estadoProducto] || ESTADOS_PRODUCTO.buen_estado;
            const isOwner = currentUser?.uid === item.vendedorId;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Foto de la Herramienta / Material */}
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    {item.fotoUrl ? (
                      <CachedImage
                        src={item.fotoUrl}
                        alt={item.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        containerClassName="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Wrench size={36} className="text-indigo-400/60" />
                        <span className="text-[11px] font-medium">Foto no provista</span>
                      </div>
                    )}

                    {/* Badge de Estado */}
                    <span className={`absolute top-3 left-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-xs ${estadoInfo.color}`}>
                      {estadoInfo.label}
                    </span>

                    {/* Badge de Zona */}
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                      <MapPin size={10} />
                      <span>{item.zona}</span>
                    </span>
                  </div>

                  {/* Contenido */}
                  <div className="p-5 space-y-3">
                    <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {item.categoria}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {item.titulo}
                    </h3>

                    {item.descripcion && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.descripcion}
                      </p>
                    )}

                    {/* Precio */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Precio:</span>
                      <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                        {item.esPrecioAConvenir ? (
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            A convenir / Permuta
                          </span>
                        ) : (
                          `$${Number(item.precio).toLocaleString('es-AR')}`
                        )}
                      </span>
                    </div>

                    {/* Vendedor */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5 truncate">
                        <UserIcon size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.vendedorNombre}</span>
                      </span>
                      {item.vendedorRol === 'profesional' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          Colega Profesional
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón WhatsApp de Contacto */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <a
                    href={getWhatsAppLink(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Phone size={14} />
                    <span>Contactar por WhatsApp</span>
                  </a>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (item.id && window.confirm('¿Querés eliminar esta publicación?')) {
                          await deleteDoc(doc(db, 'herramientas_usadas', item.id));
                        }
                      }}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                      title="Eliminar publicación"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Publicación */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg my-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Publicar Herramienta o Material</h3>
                  <p className="text-xs text-indigo-200">Publicación comunitaria gratuita en Bahía Blanca</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {submitSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 size={40} className="text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">¡Publicado con éxito!</h4>
                  <p className="text-slate-500">Ya está visible para todos los colegas de Bahía Blanca.</p>
                </div>
              ) : (
                <>
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Título de la Herramienta o Material:
                    </label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ej: Andamio tubular 2 cuerpos con tablones"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Categoría:</label>
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {CATEGORIAS_HERRAMIENTAS.filter(c => c !== 'Todas').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Estado:</label>
                      <select
                        value={estadoProducto}
                        onChange={(e) => setEstadoProducto(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="como_nuevo">Como Nuevo</option>
                        <option value="buen_estado">Buen Estado</option>
                        <option value="usado">Usado Funcional</option>
                        <option value="para_reparar">Para Reparar</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Precio ($):</label>
                      <input
                        type="number"
                        disabled={esAConvenir}
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        placeholder="Ej: 45000"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                      />
                      <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={esAConvenir}
                          onChange={(e) => setEsAConvenir(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Precio a convenir / permuta</span>
                      </label>
                    </div>

                    <div>
                      <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Zona en Bahía:</label>
                      <select
                        value={zona}
                        onChange={(e) => setZona(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {ZONAS.map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Teléfono / WhatsApp de contacto:
                    </label>
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: 291 4123456"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Descripción y Detalles:
                    </label>
                    <textarea
                      rows={3}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Marca, modelo, tiempo de uso, si incluye accesorios o detalles..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Foto Upload */}
                  <div>
                    <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">
                      Foto de la Herramienta o Material:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {previewUrl && (
                        <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Subiendo publicación...' : 'Publicar Gratis'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
