import { Category } from '../types';
import { PROFESSIONS } from '../constants';
import { db } from '../firebase';
import { doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';

export const api = {
  getCategories: async (): Promise<Category[]> => {
    return PROFESSIONS.map((p, index) => ({
      id: (index + 1).toString(),
      name: p.name,
      slug: p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    }));
  },
  
  trackSearch: async (rubro: string) => {
    if (!rubro) return;
    const rubroRef = doc(db, 'search_stats', rubro);
    try {
      const docSnap = await getDoc(rubroRef);
      if (docSnap.exists()) {
        await updateDoc(rubroRef, {
          searchCount: increment(1)
        });
      } else {
        await setDoc(rubroRef, {
          name: rubro,
          searchCount: 1
        });
      }
    } catch (error) {
      console.error("Error tracking search:", error);
    }
  }
};
