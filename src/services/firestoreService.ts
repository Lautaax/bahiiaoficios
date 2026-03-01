import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Firestore 
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

/**
 * SERVICIO DE FIRESTORE
 * 
 * Realiza la búsqueda de profesionales en Firestore.
 * Nota: Para búsquedas complejas en producción se recomienda usar Algolia o ElasticSearch.
 * Aquí realizamos un filtrado en cliente para simplificar la demo sin índices complejos.
 */

export const searchProfessionals = async (queryText: string, category: string) => {
  try {
    // 1. Obtener todos los usuarios con rol 'profesional'
    const q = query(
      collection(db, 'usuarios'),
      where('rol', '==', 'profesional')
    );
    
    const querySnapshot = await getDocs(q);
    let results: User[] = [];

    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, uid: doc.id, ...doc.data() } as unknown as User);
    });

    // 2. Filtrar por categoría (rubro) si existe
    if (category) {
      results = results.filter(p => 
        p.profesionalInfo?.rubro?.toLowerCase() === category.toLowerCase() ||
        p.profesionalInfo?.rubro?.toLowerCase().includes(category.toLowerCase())
      );
    }

    // 3. Filtrar por texto de búsqueda
    if (queryText) {
      const qText = queryText.toLowerCase();
      results = results.filter(p => 
        p.nombre?.toLowerCase().includes(qText) ||
        p.profesionalInfo?.rubro?.toLowerCase().includes(qText) ||
        p.profesionalInfo?.descripcion?.toLowerCase().includes(qText) ||
        p.zona?.toLowerCase().includes(qText)
      );
    }

    // 4. Ordenar por VIP y Rating
    return results.sort((a, b) => {
      // Primero VIP
      if (a.profesionalInfo?.isVip && !b.profesionalInfo?.isVip) return -1;
      if (!a.profesionalInfo?.isVip && b.profesionalInfo?.isVip) return 1;
      
      // Luego por Rating
      return (b.profesionalInfo?.ratingAvg || 0) - (a.profesionalInfo?.ratingAvg || 0);
    });
  } catch (error) {
    console.error("Error searching professionals:", error);
    return [];
  }
};


