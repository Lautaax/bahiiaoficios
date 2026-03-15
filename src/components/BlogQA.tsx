import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Answer {
  profesionalId: string;
  profesionalNombre: string;
  texto: string;
  fecha: any;
}

interface Question {
  id: string;
  clienteId: string;
  clienteNombre: string;
  texto: string;
  fecha: any;
  respuestas: Answer[];
}

export const BlogQA: React.FC = () => {
  const { currentUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = async () => {
    try {
      const q = query(collection(db, 'blogQuestions'), orderBy('fecha', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuestions(fetched);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newQuestion.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'blogQuestions'), {
        clienteId: currentUser.uid,
        clienteNombre: currentUser.nombre,
        texto: newQuestion.trim(),
        fecha: serverTimestamp(),
        respuestas: []
      });
      setNewQuestion('');
      fetchQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (questionId: string) => {
    if (!currentUser || currentUser.rol !== 'profesional') return;
    const text = replyText[questionId];
    if (!text || !text.trim()) return;

    try {
      const qRef = doc(db, 'blogQuestions', questionId);
      await updateDoc(qRef, {
        respuestas: arrayUnion({
          profesionalId: currentUser.uid,
          profesionalNombre: currentUser.nombre,
          texto: text.trim(),
          fecha: new Date() // using client date for simplicity in arrayUnion
        })
      });
      setReplyText({ ...replyText, [questionId]: '' });
      fetchQuestions();
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  return (
    <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="text-indigo-600 dark:text-indigo-400" size={32} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preguntas a la Comunidad</h2>
      </div>

      {currentUser ? (
        <form onSubmit={handleAskQuestion} className="mb-10">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ¿Tienes alguna duda sobre oficios o reparaciones?
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ej: ¿Qué tipo de pintura recomiendan para exteriores húmedos?"
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={submitting || !newQuestion.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Preguntar</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-10 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
          <p className="text-gray-600 dark:text-gray-300">
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Inicia sesión</Link> para hacer una pregunta a la comunidad.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando preguntas...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No hay preguntas todavía. ¡Sé el primero en preguntar!</div>
        ) : (
          questions.map(q => (
            <div key={q.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-5 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full text-indigo-600 dark:text-indigo-400">
                  <UserIcon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{q.clienteNombre}</h3>
                  <p className="text-gray-800 dark:text-gray-200 mt-1 text-lg">{q.texto}</p>
                </div>
              </div>

              {/* Respuestas */}
              {q.respuestas && q.respuestas.length > 0 && (
                <div className="ml-12 mt-4 space-y-3">
                  {q.respuestas.map((r, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/profesional/${r.profesionalId}`} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                          {r.profesionalNombre}
                        </Link>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full">Profesional</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{r.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulario de respuesta para profesionales */}
              {currentUser?.rol === 'profesional' && (
                <div className="ml-12 mt-4 flex gap-2">
                  <input
                    type="text"
                    value={replyText[q.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
                    placeholder="Escribe tu respuesta como profesional..."
                    className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleReply(q.id)}
                    disabled={!replyText[q.id]?.trim()}
                    className="bg-gray-900 dark:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                  >
                    Responder
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
