import React, { useState } from 'react';
import { 
  Zap, Briefcase, MapPin, Send, CheckCircle2, Clock, 
  Sparkles, ArrowRight, ShieldCheck, AlertCircle, Phone, User as UserIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { PROFESSIONS, ZONAS } from '../constants';
import { notificarProfesionalesNuevoTrabajo } from '../utils/quoteNotificationService';

const QUICK_RUBROS = [
  'Electricista', 
  'Plomero', 
  'Gasista', 
  'Pintor', 
  'Albañil', 
  'Aire Acondicionado', 
  'Techista', 
  'Cerrajero',
  'Flete'
];

export const HomeQuickJobPost: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [selectedRubro, setSelectedRubro] = useState<string>('Plomero');
  const [selectedZona, setSelectedZona] = useState<string>('Centro');
  const [descripcion, setDescripcion] = useState<string>('');
  const [urgencia, setUrgencia] = useState<'urgente' | 'esta_semana' | 'flexible'>('esta_semana');
  
  // Guest fields (if not logged in)
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedDesc = descripcion.trim();
    if (!trimmedDesc || trimmedDesc.length < 8) {
      setErrorMsg('Por favor describe brevemente qué trabajo necesitas realizar (mínimo 8 caracteres).');
      return;
    }

    const clientName = currentUser?.nombre?.trim() || guestName.trim();
    if (!clientName) {
      setErrorMsg('Por favor ingresa tu nombre para que los profesionales sepan a quién dirigirse.');
      return;
    }

    const clientPhone = (currentUser?.profesionalInfo?.telefono || guestPhone).trim();
    if (!currentUser && (!clientPhone || clientPhone.length < 6)) {
      setErrorMsg('Por favor ingresa un teléfono o WhatsApp de contacto para recibir presupuestos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generar un título automático conciso basado en el rubro y la descripción
      const autoTitle = `${selectedRubro} en ${selectedZona} - ${trimmedDesc.slice(0, 45)}${trimmedDesc.length > 45 ? '...' : ''}`;

      const jobData = {
        titulo: autoTitle,
        descripcion: trimmedDesc,
        rubro: selectedRubro,
        zona: selectedZona,
        urgencia,
        presupuestoAproximado: 'A convenir con el profesional',
        clienteId: currentUser?.uid || 'invitado',
        clienteNombre: clientName,
        clienteEmail: currentUser?.email || '',
        clienteTelefono: clientPhone,
        clienteFoto: currentUser?.fotoUrl || '',
        fechaCreacion: serverTimestamp(),
        estado: 'abierto',
        presupuestos: []
      };

      const docRef = await addDoc(collection(db, 'trabajosSolicitados'), jobData);

      // Notificar en tiempo real a los profesionales del rubro en Bahía Blanca
      try {
        await notificarProfesionalesNuevoTrabajo({
          trabajoId: docRef.id,
          rubro: selectedRubro,
          zona: selectedZona,
          titulo: autoTitle
        });
      } catch (notifyErr) {
        console.warn('Notification to professionals bypassed:', notifyErr);
      }

      setCreatedJobId(docRef.id);
    } catch (err: any) {
      console.error('Error al publicar trabajo rápido:', err);
      setErrorMsg('Ocurrió un error al enviar tu pedido. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedJobId(null);
    setDescripcion('');
    setGuestName('');
    setGuestPhone('');
    setErrorMsg(null);
  };

  return (
    <section 
      aria-label="Publicar trabajo solicitado rápido" 
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
    >
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 shadow-2xl border border-indigo-800/40">
        {/* Glow decorations */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {createdJobId ? (
          /* Estado de éxito */
          <div className="relative z-10 text-center py-6 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              ¡Pedido Publicado con Éxito!
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Tu solicitud ya está visible en Bahía Blanca
            </h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Notificamos a los profesionales de <strong>{selectedRubro}</strong> en la zona de <strong>{selectedZona}</strong>. Comenzarás a recibir propuestas y cotizaciones directas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/trabajos?jobId=${createdJobId}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <span>Ver Mi Pedido Publicado</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold px-5 py-3 rounded-xl transition-colors border border-slate-700"
              >
                Publicar otro trabajo
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de publicación rápida */
          <div className="relative z-10">
            {/* Header del widget */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 mb-2.5">
                  <Zap size={14} className="text-amber-400 fill-amber-400" />
                  <span>Publicación Rápida • 100% Gratis</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  ¿Necesitás un profesional hoy? Publicá tu pedido
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Describí en pocos pasos lo que necesitás y recibí presupuestos directos de trabajadores en Bahía Blanca.
                </p>
              </div>

              <Link
                to="/trabajos"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-colors self-start sm:self-center bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10"
              >
                <span>Ver todos los pedidos</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Categoría / Rubro */}
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-400" />
                  <span>1. Seleccioná el Rubro o Categoría</span>
                </label>
                
                {/* Rubros rápidos en chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_RUBROS.map((rubro) => (
                    <button
                      key={rubro}
                      type="button"
                      onClick={() => setSelectedRubro(rubro)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border ${
                        selectedRubro === rubro
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/50'
                          : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {rubro}
                    </button>
                  ))}
                </div>

                {/* Dropdown con todos los rubros adicionales */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">O seleccioná otro oficio:</span>
                  <select
                    value={selectedRubro}
                    onChange={(e) => setSelectedRubro(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PROFESSIONS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Descripción breve y Zona */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Descripción breve (col-span 2) */}
                <div className="lg:col-span-2">
                  <label 
                    htmlFor="quick-job-desc" 
                    className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>2. ¿Qué trabajo necesitás resolver?</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400 lowercase">
                      {descripcion.length}/180 caracteres
                    </span>
                  </label>
                  <textarea
                    id="quick-job-desc"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value.slice(0, 180))}
                    placeholder="Ej: Cambio de cañería en cocina que pierde agua bajo la mesada. Necesito que vengan con herramientas..."
                    rows={3}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                {/* Zona & Urgencia (col-span 1) */}
                <div className="space-y-4">
                  {/* Zona de Bahía Blanca */}
                  <div>
                    <label 
                      htmlFor="quick-job-zona" 
                      className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5"
                    >
                      <MapPin size={14} className="text-indigo-400" />
                      <span>3. Barrio / Zona</span>
                    </label>
                    <select
                      id="quick-job-zona"
                      value={selectedZona}
                      onChange={(e) => setSelectedZona(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {ZONAS.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  {/* Urgencia */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock size={14} className="text-indigo-400" />
                      <span>Urgencia</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUrgencia('urgente')}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          urgencia === 'urgente'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-xs'
                            : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        ⚡ Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgencia('esta_semana')}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          urgencia === 'esta_semana'
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                            : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        📅 Esta sem.
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgencia('flexible')}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          urgencia === 'flexible'
                            ? 'bg-slate-700 text-white border-slate-500 shadow-xs'
                            : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border-slate-700'
                        }`}
                      >
                        🕒 Flexible
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Datos de contacto */}
              {currentUser ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                      {currentUser.nombre?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        Publicando como: {currentUser.nombre}
                      </span>
                      <span className="text-slate-400 block">
                        {currentUser.email} • Recibirás notificaciones en tu cuenta
                      </span>
                    </div>
                  </div>
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80">
                  <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                    <span>Tus datos de contacto (para que los profesionales te presupuesten):</span>
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 underline font-normal">
                      ¿Ya tienes cuenta? Ingresar
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <UserIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Tu Nombre completo"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required={!currentUser}
                      />
                    </div>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="WhatsApp (ej: 291 4123456)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required={!currentUser}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje de error si aplica */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Botón de Enviar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>Sin comisiones intermediarias. Trato directo con el trabajador.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 text-slate-950 font-black px-7 py-3.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Publicando en Bahía Blanca...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Publicar Pedido en 1 Clic</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};
