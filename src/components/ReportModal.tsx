import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, X, CheckCircle, Send, ShieldAlert } from 'lucide-react';

interface ReportModalProps {
  professional: User;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Perfil falso o suplantación de identidad',
  'Datos de contacto falsos o fraudulentos',
  'Contenido o imágenes inapropiadas',
  'Servicio fraudulento / Estafa',
  'Comportamiento abusivo u ofensivo',
  'No ejerce la profesión declarada',
  'Otro motivo'
];

export const ReportModal: React.FC<ReportModalProps> = ({ professional, onClose }) => {
  const { currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Por favor describe brevemente el motivo del reporte.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Guardar reporte en colección 'reportes'
      await addDoc(collection(db, 'reportes'), {
        profesionalId: professional.uid,
        profesionalNombre: professional.nombre,
        profesionalRubro: professional.profesionalInfo?.rubro || 'Sin rubro',
        profesionalSlug: professional.slug || professional.uid,
        reporterUid: currentUser?.uid || null,
        reporterEmail: contactEmail.trim() || currentUser?.email || 'Anónimo',
        reporterNombre: currentUser?.nombre || 'Cliente',
        motivo: selectedReason,
        descripcion: description.trim(),
        estado: 'pendiente', // pendiente | revisado | descartado
        createdAt: serverTimestamp()
      });

      // 2. Registrar notificación para el panel administrativo
      try {
        await addDoc(collection(db, 'notificaciones'), {
          tipo: 'reporte_perfil',
          userId: 'admin',
          titulo: 'Nuevo reporte de perfil',
          mensaje: `Se ha reportado el perfil de "${professional.nombre}" por: ${selectedReason}.`,
          leida: false,
          fecha: serverTimestamp(),
          link: `/profesional/${professional.slug || professional.uid}`
        });
      } catch (notifErr) {
        console.warn('No se pudo enviar notificación de admin:', notifErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error al enviar el reporte:', err);
      setError('Ocurrió un error al enviar el reporte. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Reporte Enviado
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto mb-6">
              Gracias por ayudarnos a mantener una comunidad segura y confiable en Bahía Blanca. Nuestro equipo administrativo revisará este perfil a la brevedad.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  Reportar Perfil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {professional.nombre} • {professional.profesionalInfo?.rubro || 'Profesional'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              Usa este formulario si detectas que este perfil contiene información falsa, fotos ajenas, datos engañosos o viola las normas de la comunidad.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Motivo principal
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Descripción del problema
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica detalladamente qué sucede con este perfil..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email de contacto (opcional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="tu@email.com para dar seguimiento"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <Send size={15} />
                  {submitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
