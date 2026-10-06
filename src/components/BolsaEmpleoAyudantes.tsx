import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Briefcase, PlusCircle, Search, Filter, MapPin, DollarSign, 
  Phone, Calendar, Clock, CheckCircle2, ShieldCheck, Wrench, HardHat, 
  UserCheck, AlertCircle, X, ArrowRight, Sparkles, MessageSquare, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZONAS } from '../constants';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

export interface EmpleoObraItem {
  id?: string;
  tipoPublicacion: 'busca_ayudante' | 'se_ofrece'; // Contratista busca ayudante vs Ayudante se ofrece
  titulo: string;
  rubroPuesto: string;
  zona: string;
  descripcion: string;
  jornalEstimado?: string; // ej: '$35.000 / día' o '$180.000 / semana'
  duracionObra?: string; // ej: '2 semanas', 'Jornada puntual (2 días)', 'Obra completa'
  requisitos?: string; // ej: 'Calzado de seguridad, puntualidad'
  herramientasPropias?: string; // ej: 'Pala, cuchara, amoladora propia'
  disponibilidad?: string; // ej: 'Inmediata', 'Lunes a Viernes 8 a 17hs'
  publicadorNombre: string;
  publicadorRol: 'contratista' | 'mmo' | 'ayudante' | 'aprendiz' | 'particular';
  telefonoContacto: string;
  fechaCreacion?: any;
  userId?: string;
}

const PUESTOS_AYUDANTES = [
  'Todos los puestos',
  'Peón Práctico / Carga y Zanjeo',
  'Ayudante de Albañilería / Mezcla',
  'Ayudante de Pintor / Lijador y Masillado',
  'Ayudante de Electricista / Canaleteo',
  'Ayudante de Techista / Colocador de Chapas',
  'Aprendiz de Herrería y Soldadura',
  'Medio Oficial de Construcción',
  'Cuadrilla Completa de Mano de Obra'
];

export const BolsaEmpleoAyudantes: React.FC = () => {
  const { currentUser } = useAuth();
  const [tabView, setTabView] = useState<'busca_ayudante' | 'se_ofrece'>('busca_ayudante');
  const [items, setItems] = useState<EmpleoObraItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPuesto, setSelectedPuesto] = useState('Todos los puestos');
  const [selectedZona, setSelectedZona] = useState('Todas');

  // Modal Crear Publicación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formTipo, setFormTipo] = useState<'busca_ayudante' | 'se_ofrece'>('busca_ayudante');
  const [formTitulo, setFormTitulo] = useState('');
  const [formPuesto, setFormPuesto] = useState(PUESTOS_AYUDANTES[1] || 'Peón Práctico / Carga y Zanjeo');
  const [formZona, setFormZona] = useState(ZONAS[0] || 'Centro');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formJornal, setFormJornal] = useState('');
  const [formDuracion, setFormDuracion] = useState('');
  const [formRequisitos, setFormRequisitos] = useState('');
  const [formHerramientas, setFormHerramientas] = useState('');
  const [formDisponibilidad, setFormDisponibilidad] = useState('');
  const [formNombre, setFormNombre] = useState(currentUser?.nombre || '');
  const [formTelefono, setFormTelefono] = useState(currentUser?.profesionalInfo?.telefono || '');
  const [formRol, setFormRol] = useState<'contratista' | 'mmo' | 'ayudante' | 'aprendiz' | 'particular'>(
    currentUser?.rol === 'profesional' ? 'contratista' : 'ayudante'
  );
  const [errorMessage, setErrorMessage] = useState('');

  // Suscribirse exclusivamente a publicaciones reales en Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'bolsa_empleo_obra'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: EmpleoObraItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmpleoObraItem));
      setItems(fetched);
      setLoading(false);
    }, (error) => {
      console.warn('Bolsa de empleo Firestore read:', error);
      setItems([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenCreateModal = (tipo: 'busca_ayudante' | 'se_ofrece') => {
    setFormTipo(tipo);
    if (tipo === 'busca_ayudante') {
      setFormRol('contratista');
      setFormTitulo('Se busca ayudante para obra en ' + (currentUser?.zona || 'Bahía Blanca'));
    } else {
      setFormRol('ayudante');
      setFormTitulo('Ayudante de obra con ganas de trabajar disponible');
    }
    if (currentUser) {
      setFormNombre(currentUser.nombre || '');
      setFormTelefono(currentUser.profesionalInfo?.telefono || '');
      if (currentUser.zona) setFormZona(currentUser.zona);
    }
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formDescripcion.trim()) {
      setErrorMessage('Por favor completá el título y la descripción del aviso.');
      return;
    }
    if (!formTelefono.trim()) {
      setErrorMessage('Por favor indicá un número de teléfono o WhatsApp de contacto.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const newItemData: Omit<EmpleoObraItem, 'id'> = {
        tipoPublicacion: formTipo,
        titulo: formTitulo.trim(),
        rubroPuesto: formPuesto,
        zona: formZona,
        descripcion: formDescripcion.trim(),
        jornalEstimado: formJornal.trim() || 'A convenir',
        duracionObra: formDuracion.trim() || 'A convenir',
        requisitos: formRequisitos.trim(),
        herramientasPropias: formHerramientas.trim(),
        disponibilidad: formDisponibilidad.trim() || 'Inmediata',
        publicadorNombre: formNombre.trim() || (formTipo === 'busca_ayudante' ? 'Contratista de Bahía' : 'Ayudante Local'),
        publicadorRol: formRol,
        telefonoContacto: formTelefono.trim(),
        fechaCreacion: serverTimestamp(),
        userId: currentUser?.uid || 'anonimo'
      };

      await addDoc(collection(db, 'bolsa_empleo_obra'), newItemData);
      
      // Auto-switch to the created tab
      setTabView(formTipo);
      setShowCreateModal(false);
      setFormTitulo('');
      setFormDescripcion('');
      setFormJornal('');
      setFormRequisitos('');
      setFormHerramientas('');
    } catch (err: any) {
      console.error('Error creating empleo item:', err);
      setErrorMessage(err?.message || 'No se pudo publicar el aviso. Por favor verificá tu conexión e intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('¿Deseás dar de baja este aviso de la bolsa de empleo?')) return;
    try {
      await deleteDoc(doc(db, 'bolsa_empleo_obra', itemId));
    } catch {
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const getWhatsAppMessage = (item: EmpleoObraItem) => {
    const isContratistaSeeking = item.tipoPublicacion === 'busca_ayudante';
    const text = isContratistaSeeking
      ? `Hola ${item.publicadorNombre}! Vi tu publicación en la *Bolsa de Empleo y Ayudantes de Bahía Oficios* para el puesto de *${item.rubroPuesto}* en *${item.zona}*. Me interesa postularme como ayudante para la obra. ¿Sigue vacante?`
      : `Hola ${item.publicadorNombre}! Vi tu perfil en la *Bolsa de Empleo de Bahía Oficios* donde te ofrecés como *${item.rubroPuesto}* en *${item.zona}*. Tengo una obra en marcha y me gustaría consultarte tu disponibilidad.`;
    
    const phone = item.telefonoContacto.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('54') ? phone : '54' + phone;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (it.tipoPublicacion !== tabView) return false;
      if (selectedPuesto !== 'Todos los puestos' && it.rubroPuesto !== selectedPuesto) return false;
      if (selectedZona !== 'Todas' && it.zona !== selectedZona) return false;
      if (searchTerm.trim()) {
        const queryLower = searchTerm.toLowerCase();
        const matchesTitle = it.titulo.toLowerCase().includes(queryLower);
        const matchesDesc = it.descripcion.toLowerCase().includes(queryLower);
        const matchesPuesto = it.rubroPuesto.toLowerCase().includes(queryLower);
        const matchesZona = it.zona.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesDesc && !matchesPuesto && !matchesZona) return false;
      }
      return true;
    });
  }, [items, tabView, selectedPuesto, selectedZona, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
              <HardHat size={14} className="text-amber-400" />
              <span>Espacio Gremial Exclusivo para Obra</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Bolsa de Empleo y Ayudantes de Obra
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Punto de encuentro para que <strong>contratistas y maestros mayores de obra</strong> encuentren peones, ayudantes y aprendices locales en Bahía Blanca para obras y reformas de gran porte.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenCreateModal('busca_ayudante')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Briefcase size={16} />
              <span>Busco Ayudante / Peón</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateModal('se_ofrece')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <UserCheck size={16} />
              <span>Me Ofrezco como Ayudante</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Principales: Contratistas buscando vs Ayudantes disponibles */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTabView('busca_ayudante')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabView === 'busca_ayudante'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Briefcase size={16} />
            <span>Puestos Vacantes en Obras ({items.filter(i => i.tipoPublicacion === 'busca_ayudante').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabView('se_ofrece')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tabView === 'se_ofrece'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Users size={16} />
            <span>Ayudantes y Aprendices Disponibles ({items.filter(i => i.tipoPublicacion === 'se_ofrece').length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Trato directo y sin comisiones entre trabajadores y constructores
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tarea, herramientas, requisitos..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filtro Puesto */}
          <div>
            <select
              value={selectedPuesto}
              onChange={(e) => setSelectedPuesto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {PUESTOS_AYUDANTES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Filtro Zona */}
          <div>
            <select
              value={selectedZona}
              onChange={(e) => setSelectedZona(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Todas">Todas las zonas de Bahía Blanca</option>
              {ZONAS.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chips de Puestos Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {PUESTOS_AYUDANTES.slice(0, 6).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPuesto(p)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedPuesto === p
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Publicaciones */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <HardHat size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No hay publicaciones con estos filtros
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Sé el primero en publicar una vacante de ayudante o tu disponibilidad para trabajar en obras de Bahía Blanca.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => { setSelectedPuesto('Todos los puestos'); setSelectedZona('Todas'); setSearchTerm(''); }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Limpiar Filtros
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(tabView)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              Publicar Ahora (Gratis)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => {
            const isOwner = currentUser?.uid && item.userId === currentUser.uid;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top row: Puesto badge + Zona */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                      {item.rubroPuesto}
                    </span>

                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <MapPin size={12} className="text-indigo-500" />
                      <span>{item.zona}</span>
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.titulo}
                  </h3>

                  {/* Descripción */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {item.descripcion}
                  </p>

                  {/* Metadata de Obra */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-2 text-xs">
                    {item.jornalEstimado && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Jornal / Pago:</span>
                        <strong className="text-indigo-700 dark:text-indigo-300 font-black">
                          {item.jornalEstimado}
                        </strong>
                      </div>
                    )}

                    {item.duracionObra && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Plazo / Duración:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {item.duracionObra}
                        </span>
                      </div>
                    )}

                    {item.disponibilidad && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Disponibilidad:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.disponibilidad}
                        </span>
                      </div>
                    )}

                    {item.requisitos && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">Requisitos:</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.requisitos}
                        </span>
                      </div>
                    )}

                    {item.herramientasPropias && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 block font-medium">Herramientas que posee:</span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          {item.herramientasPropias}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Publicador */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="font-medium truncate">
                      Publicado por: <strong className="text-slate-700 dark:text-slate-200">{item.publicadorNombre}</strong>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                      {item.publicadorRol}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <a
                    href={getWhatsAppMessage(item)}
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
                      onClick={() => item.id && handleDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
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

      {/* MODAL CREAR PUBLICACIÓN EN BOLSA DE EMPLEO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  <HardHat size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {formTipo === 'busca_ayudante' 
                      ? 'Publicar Búsqueda de Ayudante de Obra' 
                      : 'Ofrecerme como Ayudante / Aprendiz'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bolsa de Empleo gratuita de Bahía Oficios
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Selector de Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setFormTipo('busca_ayudante'); setFormRol('contratista'); }}
                  className={`p-2.5 rounded-xl border-2 font-bold transition-all text-center ${
                    formTipo === 'busca_ayudante'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  🏗️ Busco Ayudante (Contratista / MMO)
                </button>

                <button
                  type="button"
                  onClick={() => { setFormTipo('se_ofrece'); setFormRol('ayudante'); }}
                  className={`p-2.5 rounded-xl border-2 font-bold transition-all text-center ${
                    formTipo === 'se_ofrece'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  👷 Me Ofrezco para Trabajar en Obra
                </button>
              </div>

              {/* Título */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Aviso:
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej: Se busca ayudante para revoques y mezcla en Villa Mitre"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Puesto y Zona */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Especialidad / Puesto:
                  </label>
                  <select
                    value={formPuesto}
                    onChange={(e) => setFormPuesto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    {PUESTOS_AYUDANTES.filter(p => p !== 'Todos los puestos').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Barrio / Zona de Bahía Blanca:
                  </label>
                  <select
                    value={formZona}
                    onChange={(e) => setFormZona(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    {ZONAS.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción detallada:
                </label>
                <textarea
                  rows={3}
                  required
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Detallá las tareas a realizar, tipo de obra, horario de inicio y condiciones..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Jornal y Plazo / Herramientas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jornal / Pago Estimado:
                  </label>
                  <input
                    type="text"
                    value={formJornal}
                    onChange={(e) => setFormJornal(e.target.value)}
                    placeholder="Ej: $35.000 / día (o A convenir)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Duración / Disponibilidad:
                  </label>
                  <input
                    type="text"
                    value={formDuracion}
                    onChange={(e) => setFormDuracion(e.target.value)}
                    placeholder="Ej: 2 semanas / Jornal puntual"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {formTipo === 'busca_ayudante' ? (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Requisitos solicitados (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formRequisitos}
                    onChange={(e) => setFormRequisitos(e.target.value)}
                    placeholder="Ej: Botines de seguridad, puntualidad, mayor de 18 años"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Herramientas propias con las que contás:
                  </label>
                  <input
                    type="text"
                    value={formHerramientas}
                    onChange={(e) => setFormHerramientas(e.target.value)}
                    placeholder="Ej: Pala, cuchara de albañil, maza, amoladora propia"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Nombre y WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tu Nombre / Constructora:
                  </label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Teléfono / WhatsApp de Contacto:
                  </label>
                  <input
                    type="tel"
                    required
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="Ej: 291 4123456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Botón Submit */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publicando aviso...' : 'Publicar Aviso Gratis en la Bolsa de Empleo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
