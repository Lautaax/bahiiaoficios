import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { PROFESSIONS, ZONAS } from '../constants';
import { Send, CheckCircle, AlertCircle, User as UserIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const QuoteRequestForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const targetProfId = searchParams.get('profesionalId');
  
  const [formData, setFormData] = useState({
    rubro: '',
    zona: '',
    descripcion: '',
    telefono: ''
  });
  const [targetProfessional, setTargetProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProf, setLoadingProf] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTargetProf = async () => {
      if (!targetProfId) return;
      setLoadingProf(true);
      try {
        const profDoc = await getDoc(doc(db, 'usuarios', targetProfId));
        if (profDoc.exists()) {
          const data = profDoc.data();
          setTargetProfessional({ id: profDoc.id, ...data });
          setFormData(prev => ({
            ...prev,
            rubro: data.profesionalInfo?.rubro || '',
            zona: data.zona || ''
          }));
        }
      } catch (err) {
        console.error("Error fetching target professional:", err);
      } finally {
        setLoadingProf(false);
      }
    };
    fetchTargetProf();
  }, [targetProfId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Debes iniciar sesión para solicitar un presupuesto.');
      return;
    }

    if (!formData.rubro || !formData.zona || !formData.descripcion) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let assignedProfessionals: string[] = [];

      if (targetProfId) {
        assignedProfessionals = [targetProfId];
      } else {
        // Find professionals matching the criteria
        const profQuery = query(
          collection(db, 'usuarios'),
          where('rol', '==', 'profesional'),
          where('zona', '==', formData.zona)
        );
        
        const profSnapshot = await getDocs(profQuery);
        
        // Filter by rubro in memory and sort by rating
        let matchedProfessionals = profSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as any))
          .filter(prof => 
            prof.profesionalInfo?.rubro === formData.rubro || 
            (prof.profesionalInfo?.rubros && prof.profesionalInfo.rubros.includes(formData.rubro))
          )
          .sort((a, b) => (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0));

        // Take up to 10 professionals so the first 3 can respond
        const topProfessionals = matchedProfessionals.slice(0, 10);
        assignedProfessionals = topProfessionals.map(p => p.id);
      }

      if (assignedProfessionals.length === 0) {
        setError('No encontramos profesionales en ese rubro y zona por el momento. Intenta buscar manualmente o cambia la zona.');
        setLoading(false);
        return;
      }

      const quoteRef = await addDoc(collection(db, 'quoteRequests'), {
        clienteId: currentUser.uid,
        clienteNombre: currentUser.nombre,
        clienteEmail: currentUser.email,
        clienteTelefono: formData.telefono,
        rubro: formData.rubro,
        zona: formData.zona,
        descripcion: formData.descripcion,
        fecha: serverTimestamp(),
        estado: 'pendiente',
        profesionalesAsignados: assignedProfessionals,
        respuestas: [] // Array to track who responded
      });

      // Create notifications for the assigned professionals
      for (const profId of assignedProfessionals) {
        await addDoc(collection(db, 'notificaciones'), {
          userId: profId,
          tipo: 'nueva_solicitud',
          titulo: 'Nueva solicitud de presupuesto',
          mensaje: `Hay una nueva solicitud de presupuesto para ${formData.rubro} en tu zona (${formData.zona}).`,
          leida: false,
          fecha: serverTimestamp(),
          referenciaId: quoteRef.id
        });
      }

      setSuccess(true);
    } catch (err) {
      console.error("Error submitting quote request:", err);
      setError('Hubo un error al enviar tu solicitud. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-center mb-4">
          <CheckCircle size={64} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">¡Solicitud Enviada!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Hemos enviado tu solicitud a profesionales de tu zona. Te contactarán pronto con un presupuesto.
        </p>
        <Link to="/" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">Solicitar Presupuesto Múltiple</h2>
        <p className="text-indigo-100">Describe tu problema una vez y recibe hasta 3 presupuestos de profesionales calificados.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Qué servicio necesitas? *</label>
            <select
              name="rubro"
              value={formData.rubro}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecciona un rubro</option>
              {PROFESSIONS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿En qué zona? *</label>
            <select
              name="zona"
              value={formData.zona}
              onChange={handleChange}
              required
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecciona tu zona</option>
              {ZONAS.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono de contacto (opcional)</label>
          <input
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="Para que te contacten por WhatsApp"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Describe el problema o trabajo a realizar *</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Ej: Necesito instalar un aire acondicionado split de 3000 frigorías en un primer piso..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : (
            <>
              <Send size={20} />
              Enviar Solicitud
            </>
          )}
        </button>
      </form>
    </div>
  );
};
