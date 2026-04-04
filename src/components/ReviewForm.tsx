import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, ImageIcon, X } from 'lucide-react';
import { uploadToFirebase } from '../services/firebaseStorageService';

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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const AVAILABLE_BADGES = [
    'Puntualidad extrema',
    'Precio justo',
    'Dejó todo limpio',
    'Muy amable',
    'Trabajo impecable'
  ];

  // Solo mostrar si el usuario es cliente
  if (!currentUser || currentUser.rol !== 'cliente') {
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      if (images.length + newFiles.length > 3) {
        setError('Puedes subir un máximo de 3 fotos.');
        return;
      }
      setImages([...images, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews([...imagePreviews, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor selecciona una puntuación.');
      return;
    }
    
    if (images.length === 0) {
      setError('Debes subir al menos una foto del trabajo realizado para que la reseña sea válida.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        const uploadPromises = images.map(file => uploadToFirebase(file, `reviews/${profesionalId}`));
        uploadedUrls = await Promise.all(uploadPromises);
      }

      await addDoc(collection(db, 'resenas'), {
        profesionalId,
        clienteId: currentUser.uid,
        clienteNombre: currentUser.nombre,
        rating,
        comentario: comment,
        fotos: uploadedUrls,
        badges: selectedBadges,
        fecha: serverTimestamp(),
      });

      // Update professional's rating
      const profRef = doc(db, 'usuarios', profesionalId);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        const profData = profSnap.data();
        const currentCount = profData.profesionalInfo?.reviewCount || 0;
        const currentAvg = profData.profesionalInfo?.ratingAvg || 0;
        
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + rating) / newCount;
        
        await updateDoc(profRef, {
          'profesionalInfo.ratingAvg': newAvg,
          'profesionalInfo.reviewCount': newCount
        });
      }

      setSuccess(true);
      setComment('');
      setRating(0);
      setImages([]);
      setImagePreviews([]);
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none mb-3"
            rows={3}
            placeholder="Escribe tu experiencia con este profesional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />

          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Destaca lo mejor del profesional (opcional):</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_BADGES.map(badge => (
                <button
                  key={badge}
                  type="button"
                  onClick={() => {
                    if (selectedBadges.includes(badge)) {
                      setSelectedBadges(selectedBadges.filter(b => b !== badge));
                    } else {
                      setSelectedBadges([...selectedBadges, badge]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedBadges.includes(badge)
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {badge}
                </button>
              ))}
            </div>
          </div>

          {imagePreviews.length > 0 && (
            <div className="flex gap-2 mt-2 mb-2 overflow-x-auto py-1">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img src={preview} alt={`Preview ${idx}`} className="h-16 w-16 object-cover rounded-md border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <label className="cursor-pointer flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <ImageIcon size={16} />
              <span>Añadir foto del trabajo (Obligatorio, Max 3)</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                className="hidden" 
                onChange={handleImageChange}
                disabled={images.length >= 3}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
            >
              {loading ? 'Enviando...' : 'Publicar Reseña'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
