import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, arrayUnion } from 'firebase/firestore';
import { Eye, MessageSquare, Clock, ShieldCheck, AlertCircle, Send } from 'lucide-react';
import { VipButton } from './VipButton';
import { Link } from 'react-router-dom';

export const ProfessionalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [updating, setUpdating] = useState(false);

  if (!currentUser || currentUser.rol !== 'profesional') {
    return <div className="p-8 text-center text-gray-500">Acceso denegado.</div>;
  }

  const { profesionalInfo } = currentUser;
  const isAvailable = profesionalInfo?.disponibilidadInmediata || false;

  const toggleAvailability = async () => {
    setUpdating(true);
    try {
      const userRef = doc(db, 'usuarios', currentUser.uid);
      await updateDoc(userRef, {
        'profesionalInfo.disponibilidadInmediata': !isAvailable
      });
    } catch (error) {
      console.error("Error updating availability:", error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Control</h1>
          {profesionalInfo?.isVerified ? (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium border border-blue-200">
              <ShieldCheck size={16} />
              Perfil Verificado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium border border-amber-200">
              <AlertCircle size={16} />
              Pendiente de Verificación
            </span>
          )}
        </div>
        <Link 
          to="/profile" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          Gestionar Perfil
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Quick Status Toggle */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 md:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="text-indigo-500" />
              Estado Actual
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Indica si estás disponible para tomar trabajos urgentes o inmediatos.
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={updating}
            className={`
              relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
              ${isAvailable ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
              ${updating ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${isAvailable ? 'translate-x-6' : 'translate-x-0'}
              `}
            />
          </button>
          <span className={`font-medium ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
            {isAvailable ? 'Disponible Ahora' : 'Ocupado'}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Eye size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Visitas al Perfil</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {profesionalInfo?.profileViews || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Veces que clientes vieron tu perfil</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Clics en WhatsApp</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            {profesionalInfo?.whatsappClicks || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Veces que intentaron contactarte</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <VipButton />
        </div>
      </div>

      {/* Solicitudes de Presupuesto */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Solicitudes de Presupuesto en tu Zona</h2>
        <QuoteRequestsList />
      </div>
    </div>
  );
};

const QuoteRequestsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'quoteRequests'),
          where('profesionalesAsignados', 'array-contains', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side by fecha desc
        reqs.sort((a: any, b: any) => {
          const dateA = a.fecha?.toDate?.() || new Date(0);
          const dateB = b.fecha?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setRequests(reqs);
      } catch (error) {
        console.error("Error fetching quote requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [currentUser]);

  const handleRespond = async (requestId: string) => {
    if (!currentUser || !price || !message) return;
    try {
      const requestRef = doc(db, 'quoteRequests', requestId);
      await updateDoc(requestRef, {
        respuestas: arrayUnion({
          profesionalId: currentUser.uid,
          profesionalNombre: currentUser.nombre,
          precio: price,
          mensaje: message,
          fecha: new Date().toISOString()
        })
      });
      
      // Update local state
      setRequests(requests.map(req => {
        if (req.id === requestId) {
          return {
            ...req,
            respuestas: [...(req.respuestas || []), { profesionalId: currentUser.uid }]
          };
        }
        return req;
      }));
      
      setRespondingTo(null);
      setPrice('');
      setMessage('');
      alert("Respuesta enviada correctamente.");
    } catch (error) {
      console.error("Error responding to quote request:", error);
      alert("Hubo un error al enviar tu respuesta.");
    }
  };

  if (loading) return <div className="text-gray-500">Cargando solicitudes...</div>;
  if (requests.length === 0) return <div className="text-gray-500">No hay solicitudes nuevas en tu rubro.</div>;

  return (
    <div className="space-y-4">
      {requests.map(req => {
        const respuestasCount = req.respuestas?.length || 0;
        const hasResponded = req.respuestas?.some((r: any) => r.profesionalId === currentUser?.uid);
        const canRespond = respuestasCount < 3 && !hasResponded;

        return (
          <div key={req.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Solicitud de {req.clienteNombre}</h3>
                <p className="text-sm text-gray-500">{req.zona} • {new Date(req.fecha?.toDate()).toLocaleDateString()}</p>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-medium">
                {respuestasCount}/3 Respuestas
              </span>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">{req.descripcion}</p>
            
            {hasResponded ? (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium">
                Ya has respondido a esta solicitud.
              </div>
            ) : !canRespond ? (
              <div className="bg-gray-50 text-gray-500 p-3 rounded-lg text-sm font-medium">
                Esta solicitud ya alcanzó el límite de 3 respuestas.
              </div>
            ) : respondingTo === req.id ? (
              <div className="space-y-3 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Estimado ($)</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ej. 15000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensaje al cliente</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="Hola, puedo hacer este trabajo..."
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleRespond(req.id)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
                  >
                    <Send size={16} /> Enviar Presupuesto
                  </button>
                  <button 
                    onClick={() => setRespondingTo(null)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setRespondingTo(req.id)}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                Responder a esta solicitud
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
