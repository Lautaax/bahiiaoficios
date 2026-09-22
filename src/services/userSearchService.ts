import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { User, RecentSearchRecord } from '../types';
import { safeLocalStorage } from '../utils/storage';
import { getProfessionalBadges } from '../utils/badgeUtils';

const LOCAL_STORAGE_KEY = 'bahia_recent_searches_cache';

export interface SaveSearchOptions {
  category?: string;
  zona?: string;
  resultsCount?: number;
  userEmail?: string | null;
}

export const userSearchService = {
  /**
   * Saves a user search to Firestore (collection 'busquedas_recientes')
   * and syncs with the user's profile and local cache.
   */
  saveRecentSearch: async (
    userId: string | null | undefined, 
    term: string, 
    options?: SaveSearchOptions
  ): Promise<void> => {
    const cleanTerm = term.trim();
    if (!cleanTerm && !options?.category) return;

    const effectiveTerm = cleanTerm || options?.category || '';
    const nowIso = new Date().toISOString();

    const searchItem: RecentSearchRecord = {
      userId: userId || 'invitado',
      userEmail: options?.userEmail || null,
      term: effectiveTerm,
      category: options?.category || '',
      zona: options?.zona || 'Todas',
      resultsCount: options?.resultsCount || 0,
      timestamp: serverTimestamp(),
      fechaStr: nowIso
    };

    // 1. Immediately cache in localStorage for instant responsiveness
    try {
      const cached = JSON.parse(safeLocalStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const filtered = cached.filter((s: any) => 
        s.term.toLowerCase() !== effectiveTerm.toLowerCase() || 
        (s.zona || '') !== (options?.zona || '')
      );
      const updatedCache = [
        {
          term: effectiveTerm,
          category: options?.category || '',
          zona: options?.zona || 'Todas',
          timestamp: nowIso
        },
        ...filtered
      ].slice(0, 8);
      safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCache));
    } catch (e) {
      console.warn("Could not cache recent search in localStorage:", e);
    }

    // 2. Persist to Firestore collection 'busquedas_recientes' for AI analysis & historical logs
    try {
      await addDoc(collection(db, 'busquedas_recientes'), searchItem);
    } catch (firestoreErr) {
      console.warn("Could not write to busquedas_recientes collection:", firestoreErr);
    }

    // 3. If user is authenticated, also sync to their user profile doc in Firestore
    if (userId && userId !== 'invitado') {
      try {
        const userRef = doc(db, 'usuarios', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const existingSearches = userData.busquedasRecientes || [];
          
          const filtered = existingSearches.filter((s: any) => 
            s.term?.toLowerCase() !== effectiveTerm.toLowerCase()
          );

          const newRecent = [
            {
              term: effectiveTerm,
              category: options?.category || '',
              zona: options?.zona || 'Todas',
              timestamp: nowIso
            },
            ...filtered
          ].slice(0, 10);

          await updateDoc(userRef, {
            busquedasRecientes: newRecent
          });
        }
      } catch (userErr) {
        console.warn("Could not update busquedasRecientes in user doc:", userErr);
      }
    }
  },

  /**
   * Fetches recent searches from Firestore and falls back to local cache
   */
  getUserRecentSearches: async (userId?: string | null): Promise<Array<{ term: string; category?: string; zona?: string; timestamp?: string }>> => {
    let searches: Array<{ term: string; category?: string; zona?: string; timestamp?: string }> = [];

    // First try user profile doc if logged in
    if (userId && userId !== 'invitado') {
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', userId));
        if (userDoc.exists() && userDoc.data().busquedasRecientes?.length > 0) {
          searches = userDoc.data().busquedasRecientes;
          return searches;
        }
      } catch (err) {
        console.warn("Could not fetch searches from user doc:", err);
      }

      // Try busquedas_recientes collection by userId
      try {
        const q = query(
          collection(db, 'busquedas_recientes'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          searches = snap.docs.map(d => {
            const data = d.data();
            return {
              term: data.term,
              category: data.category,
              zona: data.zona,
              timestamp: data.fechaStr
            };
          });
          return searches;
        }
      } catch (snapErr) {
        // Fall through to local cache
      }
    }

    // Fallback: Local storage cache
    try {
      const local = JSON.parse(safeLocalStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      if (Array.isArray(local) && local.length > 0) {
        return local;
      }
    } catch {
      // ignore
    }

    return searches;
  },

  /**
   * Generates personalized suggestions of professionals based on the user's recent searches
   */
  getPersonalizedSuggestions: (
    allProfessionals: User[], 
    recentSearches: Array<{ term: string; category?: string; zona?: string }>
  ): {
    suggestedPros: User[];
    activeTerms: Array<{ term: string; category?: string; zona?: string }>;
    primaryCategory: string | null;
  } => {
    if (!allProfessionals || allProfessionals.length === 0 || !recentSearches || recentSearches.length === 0) {
      return { suggestedPros: [], activeTerms: [], primaryCategory: null };
    }

    // Extract categories and zones from searches
    const searchedRubros = new Set<string>();
    const searchedZonas = new Set<string>();
    const searchTerms: string[] = [];

    recentSearches.forEach(s => {
      if (s.category) searchedRubros.add(s.category.toLowerCase());
      if (s.term) searchTerms.push(s.term.toLowerCase());
      if (s.zona && s.zona !== 'Todas') searchedZonas.add(s.zona.toLowerCase());
    });

    // Score professionals based on relevance to searches
    const scored = allProfessionals.map(pro => {
      let score = 0;
      const rubro = pro.profesionalInfo?.rubro?.toLowerCase() || '';
      const rubrosList = (pro.profesionalInfo?.rubros || []).map(r => r.toLowerCase());
      const zona = pro.zona?.toLowerCase() || '';
      const desc = pro.profesionalInfo?.descripcion?.toLowerCase() || '';

      // Direct category match (highest weight)
      searchedRubros.forEach(sr => {
        if (rubro === sr || rubrosList.includes(sr)) score += 30;
        else if (rubro.includes(sr) || desc.includes(sr)) score += 15;
      });

      // Search terms match
      searchTerms.forEach(term => {
        if (rubro.includes(term) || rubrosList.some(r => r.includes(term))) score += 20;
        else if (desc.includes(term) || pro.nombre?.toLowerCase().includes(term)) score += 10;
      });

      // Zona match
      searchedZonas.forEach(sz => {
        if (zona.includes(sz)) score += 10;
      });

      // Bonus for badges (Respuesta Rápida, Muy Valorado)
      const badges = getProfessionalBadges(pro);
      if (badges.some(b => b.id === 'respuesta_rapida')) score += 8;
      if (badges.some(b => b.id === 'muy_valorado')) score += 8;
      if (badges.some(b => b.id === 'matriculado_verificado')) score += 5;

      // Rating bonus
      score += (pro.profesionalInfo?.ratingAvg || 0) * 2;

      return { pro, score };
    });

    // Filter to those with a relevant score (> 15) and sort descending
    const filtered = scored
      .filter(item => item.score > 15)
      .sort((a, b) => b.score - a.score)
      .map(item => item.pro);

    // Primary category is the most frequent category searched
    let primaryCategory: string | null = null;
    const firstWithCat = recentSearches.find(s => s.category || s.term);
    if (firstWithCat) {
      primaryCategory = firstWithCat.category || firstWithCat.term;
    }

    return {
      suggestedPros: filtered.slice(0, 8),
      activeTerms: recentSearches.slice(0, 4),
      primaryCategory
    };
  },

  /**
   * Clears recent searches locally and optionally in Firestore
   */
  clearRecentSearches: async (userId?: string | null): Promise<void> => {
    safeLocalStorage.removeItem(LOCAL_STORAGE_KEY);
    if (userId && userId !== 'invitado') {
      try {
        await updateDoc(doc(db, 'usuarios', userId), {
          busquedasRecientes: []
        });
      } catch (e) {
        console.warn("Could not clear searches in Firestore:", e);
      }
    }
  }
};
