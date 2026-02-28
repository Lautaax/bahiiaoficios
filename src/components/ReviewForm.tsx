import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Star } from 'lucide-react';

interface ReviewFormProps {
  profesionalId: string;
  profesionalNombre: string;
  onReviewSubmitted?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ profesionalId, profesionalNombre, onReviewSubmitted }) => {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Solo mostrar si el usuario es cliente
  if (!currentUser || currentUser.rol !== 'cliente') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor selecciona una puntuación.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'resenas'), {
        profesionalId,
        clienteId: currentUser.uid,
        clienteNombre: currentUser.nombre,
        rating,
        comentario: comment,
        fecha: serverTimestamp(),
      });

      setSuccess(true);
      setComment('');
      setRating(0);
      if (onReviewSubmitted) onReviewSubmitted();
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al enviar la reseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mt-4">
      <h4 className="font-semibold text-gray-900 mb-2">Calificar a {profesionalNombre}</h4>
      
      {success ? (
        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-2">
          ¡Gracias por tu opinión!
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star 
                  size={24} 
                  className={`${
                    star <= (hoverRating || rating) 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-gray-300'
                  }`} 
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-gray-500">
              {rating > 0 ? `${rating} estrellas` : 'Selecciona'}
            </span>
          </div>

          <textarea
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            rows={3}
            placeholder="Escribe tu experiencia con este profesional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
          >
            {loading ? 'Enviando...' : 'Publicar Reseña'}
          </button>
        </form>
      )}
    </div>
  );
};
