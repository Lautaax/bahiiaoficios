import React, { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { JobPost, JobBudgetProposal, JobOfferRecord } from '../types';
import { isVipActive } from '../utils/vipUtils';
import { notificarClienteNuevaOferta } from '../utils/quoteNotificationService';
import { 
  Send, DollarSign, Clock, ShieldCheck, CheckCircle2, 
  AlertCircle, X, Crown, Wrench, Edit3, Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfessionalQuoteActionProps {
  job: JobPost;
  existingProposal?: JobBudgetProposal | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export const ProfessionalQuoteAction: React.FC<ProfessionalQuoteActionProps> = ({
  job,
  existingProposal,
  onSuccess,
  onCancel,
  isOpen = true
}) => {
  const { currentUser } = useAuth();

  const isEditing = Boolean(existingProposal);

  const [montoEstimado, setMontoEstimado] = useState(
    existingProposal ? String(existingProposal.montoEstimado) : ''
  );
  const [tiempoEstimado, setTiempoEstimado] = useState(
    existingProposal?.tiempoEstimado || 'En el día'
  );
  const [mensaje, setMensaje] = useState(
    existingProposal?.mensaje || ''
  );
  const [incluyeMateriales, setIncluyeMateriales] = useState(
    existingProposal?.incluyeMateriales || false
  );
  const [requiereVisitaPrevia, setRequiereVisitaPrevia] = useState(
    existingProposal?.requiereVisitaPrevia || false
  );
  const [telefonoContacto, setTelefonoContacto] = useState(
    existingProposal?.profesionalTelefono || currentUser?.profesionalInfo?.telefono || ''
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar si cambia existingProposal
  useEffect(() => {
    if (existingProposal) {
      setMontoEstimado(String(existingProposal.montoEstimado));
      setTiempoEstimado(existingProposal.tiempoEstimado || 'En el día');
      setMensaje(existingProposal.mensaje || '');
      setIncluyeMateriales(Boolean(existingProposal.incluyeMateriales));
      setRequiereVisitaPrevia(Boolean(existingProposal.requiereVisitaPrevia));
      setTelefonoContacto(existingProposal.profesionalTelefono || currentUser?.profesionalInfo?.telefono || '');
    }
  }, [existingProposal, currentUser]);

  if (!isOpen) return null;

  // Validación de rol profesional
  if (!currentUser || currentUser.rol !== 'profesional') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 text-center relative">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
          >
            <X size={20} />
          </button>
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench size={28} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Función para Profesionales
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Para presupuestar trabajos solicitados por vecinos de Bahía Blanca debés iniciar sesión con tu cuenta de profesional.
          </p>
          <div className="space-y-3">
            <Link
              to="/signup"
              className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md"
            >
              Crear Perfil Profesional
            </Link>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-2.5 px-4 rounded-xl text-sm"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job?.id) return;

    const numericAmount = Number(montoEstimado.replace(/[^0-9]/g, ''));
    if (!numericAmount || numericAmount <= 0) {
      setError('Por favor ingresá un monto estimado válido en pesos.');
      return;
    }

    if (!mensaje.trim()) {
      setError('Por favor redactá una propuesta o detalle de tu servicio.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isVip = isVipActive(currentUser.profesionalInfo);
      const offerDocId = `${job.id}_${currentUser.uid}`;

      const proposalItem: JobBudgetProposal = {
        id: existingProposal?.id || `prop_${currentUser.uid}_${Date.now()}`,
        profesionalId: currentUser.uid,
        profesionalNombre: currentUser.nombre,
        profesionalFoto: currentUser.fotoUrl || '',
        profesionalRubro: currentUser.profesionalInfo?.rubro || job.rubro,
        profesionalTelefono: telefonoContacto.trim() || currentUser.profesionalInfo?.telefono || '',
        profesionalIsVip: isVip,
        profesionalRating: currentUser.profesionalInfo?.ratingAvg || 5,
        profesionalSlug: currentUser.slug || currentUser.uid,
        montoEstimado: numericAmount,
        tiempoEstimado,
        mensaje: mensaje.trim(),
        incluyeMateriales,
        requiereVisitaPrevia,
        fecha: new Date().toISOString(),
        estado: existingProposal?.estado || 'pendiente'
      };

      // 1. Guardar en colección dedicada 'ofertasPresupuesto' vinculada al ID del trabajo y profesional
      const offerRecord: JobOfferRecord = {
        id: offerDocId,
        trabajoId: job.id,
        trabajoTitulo: job.titulo,
        trabajoRubro: job.rubro,
        trabajoZona: job.zona,
        clienteId: job.clienteId,
        clienteNombre: job.clienteNombre,
        clienteTelefono: job.clienteTelefono,
        profesionalId: currentUser.uid,
        profesionalNombre: currentUser.nombre,
        profesionalFoto: currentUser.fotoUrl || '',
        profesionalRubro: currentUser.profesionalInfo?.rubro || job.rubro,
        profesionalTelefono: telefonoContacto.trim() || currentUser.profesionalInfo?.telefono || '',
        profesionalIsVip: isVip,
        profesionalRating: currentUser.profesionalInfo?.ratingAvg || 5,
        montoEstimado: numericAmount,
        tiempoEstimado,
        mensaje: mensaje.trim(),
        incluyeMateriales,
        requiereVisitaPrevia,
        estado: (existingProposal?.estado as any) || 'pendiente',
        fechaEnvio: serverTimestamp(),
        fechaActualizacion: serverTimestamp()
      };

      await setDoc(doc(db, 'ofertasPresupuesto', offerDocId), offerRecord, { merge: true });

      // 2. Sincronizar el array de presupuestos dentro del documento de trabajosSolicitados
      const jobRef = doc(db, 'trabajosSolicitados', job.id);
      const currentJobSnap = await getDoc(jobRef);
      if (currentJobSnap.exists()) {
        const jobData = currentJobSnap.data() as JobPost;
        const currentProposals = jobData.presupuestos || [];
        
        // Reemplazar o agregar la propuesta de este profesional
        const filteredProposals = currentProposals.filter(p => p.profesionalId !== currentUser.uid);
        const updatedProposals = [...filteredProposals, proposalItem];

        await updateDoc(jobRef, {
          presupuestos: updatedProposals
        });
      }

      // 3. Notificar al cliente con el sistema de notificaciones integrado
      await notificarClienteNuevaOferta({
        trabajoId: job.id,
        trabajoTitulo: job.titulo,
        clienteId: job.clienteId,
        profesionalNombre: currentUser.nombre,
        monto: numericAmount,
        mensaje: mensaje.trim()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onSuccess) onSuccess();
      }, 1400);

    } catch (err: any) {
      console.error("Error al registrar oferta de presupuesto:", err);
      setError("No se pudo guardar la propuesta. Por favor verificá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isEditing ? '¡Presupuesto actualizado!' : '¡Presupuesto enviado con éxito!'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              El cliente recibió tu propuesta y podrá contactarte directamente o aceptarla desde su panel.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full mb-2">
                {isEditing ? <Edit3 size={13} /> : <Send size={13} />}
                {isEditing ? 'Modificar Oferta' : 'Propuesta de Presupuesto'}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'Editar Presupuesto Enviado' : `Cotizar trabajo para ${job.clienteNombre}`}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                  "{job.titulo}"
                </span>
                <span>•</span>
                <span>{job.zona}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 border border-red-200 dark:border-red-900/50">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Monto y Tiempo Estimado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Monto Estimado ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={montoEstimado}
                    onChange={(e) => setMontoEstimado(e.target.value)}
                    placeholder="Ej: 35000"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Tiempo Estimado *
                </label>
                <select
                  value={tiempoEstimado}
                  onChange={(e) => setTiempoEstimado(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="En el día">En el día</option>
                  <option value="24 a 48 hs">24 a 48 hs</option>
                  <option value="2 a 4 días">2 a 4 días</option>
                  <option value="1 semana">1 semana</option>
                  <option value="Más de 1 semana">Más de 1 semana</option>
                  <option value="A convenir tras visita">A convenir tras visita</option>
                </select>
              </div>
            </div>

            {/* Condiciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={incluyeMateriales}
                  onChange={(e) => setIncluyeMateriales(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Incluye materiales
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={requiereVisitaPrevia}
                  onChange={(e) => setRequiereVisitaPrevia(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Requiere visita previa
                </span>
              </label>
            </div>

            {/* Detalle y mensaje */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Propuesta Detallada y Descripción Técnica *
              </label>
              <textarea
                required
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Detallá qué incluye tu servicio: mano de obra calificada, garantía, herramientas especializadas, disponibilidad horaria..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* Teléfono de contacto */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Teléfono / WhatsApp de Contacto
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  placeholder="Ej: 2914123456"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Send size={16} />
                    {isEditing ? 'Guardar Cambios' : 'Enviar Presupuesto'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
