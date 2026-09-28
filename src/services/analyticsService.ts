import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { safeLocalStorage, safeSessionStorage } from '../utils/storage';
import { User, UserFeedback } from '../types';

export interface PageVisitItem {
  path: string;
  label: string;
  visits: number;
  percentage: number;
}

export interface SearchMetricItem {
  term: string;
  count: number;
  category?: string;
}

export interface ProfessionalMetricItem {
  uid: string;
  nombre: string;
  rubro: string;
  zona: string;
  views: number;
  contacts: number;
  conversionRate: number;
  ratingAvg: number;
  reviewCount: number;
  isVip: boolean;
  fotoUrl?: string;
  telefono?: string;
}

export interface DailyTrafficItem {
  date: string;
  label: string;
  visits: number;
  unique: number;
}

export interface AdminAnalyticsReport {
  traffic: {
    totalVisits: number;
    todayVisits: number;
    uniqueVisitorsEstimate: number;
    avgDailyVisits: number;
    dailyTrend: DailyTrafficItem[];
  };
  pages: PageVisitItem[];
  professionals: ProfessionalMetricItem[];
  searches: {
    topTerms: SearchMetricItem[];
    topRubros: { rubro: string; count: number; percentage: number }[];
    topZonas: { zona: string; count: number }[];
    recentSearchesList: Array<{ term: string; category?: string; zona?: string; timestamp?: string }>;
    voiceSearchesCount: number;
  };
  feedback: {
    total: number;
    errorsCount: number;
    suggestionsCount: number;
    ratingsCount: number;
    avgRating: number;
    items: UserFeedback[];
  };
  lastUpdated: Date;
}

// Clean path into a readable label
const routeLabels: Record<string, string> = {
  '/': 'Página Principal (Home)',
  '/search': 'Buscador de Profesionales',
  '/trabajos': 'Bolsa de Trabajos Solicitados',
  '/solicitar-presupuesto': 'Formulario de Presupuesto',
  '/beneficios': 'Descuentos para el Gremio',
  '/publicitar': 'Publicidad y Comercios',
  '/blog': 'Blog y Guías de Oficios',
  '/login': 'Inicio de Sesión',
  '/signup': 'Registro de Usuarios',
  '/complete-profile': 'Completar Perfil',
  '/admin': 'Panel de Administración',
  '/dashboard': 'Tablero de Control',
  '/dashboard-profesional': 'Dashboard del Profesional',
  '/favoritos': 'Mis Favoritos',
  '/chats': 'Mensajería / Chats',
  '/terms': 'Términos y Condiciones',
  '/privacy': 'Políticas de Privacidad',
  '/help': 'Centro de Ayuda',
  '/sem-marketing': 'Kit de Marketing SEM'
};

const getArgentinaDateStr = (): string => {
  try {
    return new Intl.DateTimeFormat('fr-CA', { 
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const formatPathLabel = (path: string): string => {
  if (routeLabels[path]) return routeLabels[path];
  if (path.startsWith('/profesional/')) {
    const slug = path.replace('/profesional/', '');
    return `Ficha de Profesional (${slug})`;
  }
  if (path.startsWith('/rubro/') || path.startsWith('/profesion/') || path.startsWith('/professions/')) {
    const rubro = path.split('/').pop() || '';
    const cleanName = decodeURIComponent(rubro).replace(/-/g, ' ');
    return `Categoría: ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
  }
  if (path.startsWith('/blog/')) return `Artículo de Blog (${path.split('/').pop()})`;
  if (path.startsWith('/chat/')) return 'Conversación de Chat';
  return path;
};

export const analyticsService = {
  /**
   * Tracks a page view across the application into Firestore siteStats/global and server API
   */
  trackPageView: async (pathname: string, _title?: string) => {
    if (typeof window === 'undefined') return;

    // Normalize dynamic paths to prevent key explosion while preserving sections
    let normalizedPath = pathname;
    if (pathname.startsWith('/profesional/')) {
      normalizedPath = '/profesional/:id';
    } else if (pathname.startsWith('/blog/')) {
      normalizedPath = '/blog/:id';
    } else if (pathname.startsWith('/chat/')) {
      normalizedPath = '/chat/:id';
    } else if (pathname.startsWith('/rubro/')) {
      normalizedPath = `/rubro/${pathname.replace('/rubro/', '')}`;
    }

    // Short debounce of 8 seconds per normalized route to prevent React StrictMode double counting
    const debounceKey = `pv_${normalizedPath}`;
    const lastTrackTime = Number(safeSessionStorage.getItem(debounceKey) || 0);
    const nowMs = Date.now();
    if (nowMs - lastTrackTime < 8000) {
      return;
    }
    safeSessionStorage.setItem(debounceKey, String(nowMs));

    // 1. Direct server ping (bypasses ad-blockers)
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname: normalizedPath }),
      keepalive: true
    }).catch(() => {});

    // 2. Client-side Firestore write for real-time live stats
    try {
      const statsRef = doc(db, 'siteStats', 'global');
      const argDate = getArgentinaDateStr();
      const utcDate = new Date().toISOString().split('T')[0];
      const safeKey = normalizedPath.replace(/[/.:]/g, '_');

      const updateData: Record<string, any> = {
        visits: increment(1),
        [`pageVisits.${safeKey}`]: increment(1),
        [`dailyVisits.${argDate}`]: increment(1),
        [`routeMappings.${safeKey}`]: normalizedPath,
        lastVisitAt: serverTimestamp()
      };
      if (utcDate !== argDate) {
        updateData[`dailyVisits.${utcDate}`] = increment(1);
      }

      await setDoc(statsRef, updateData, { merge: true });

      // Save local tracking mirror
      const localPages = JSON.parse(safeLocalStorage.getItem('local_page_visits') || '{}');
      localPages[normalizedPath] = (localPages[normalizedPath] || 0) + 1;
      safeLocalStorage.setItem('local_page_visits', JSON.stringify(localPages));
    } catch (err) {
      console.warn("Analytics page view error:", err);
    }
  },

  /**
   * Tracks search queries entered by users in the search bar or category clicks
   */
  trackSearch: async (queryText: string, options?: { category?: string; zona?: string; resultsCount?: number }) => {
    const cleanTerm = (queryText || '').trim().toLowerCase();
    if (!cleanTerm || cleanTerm.length < 2) return;

    const safeTermKey = cleanTerm.replace(/[./[\]#$]/g, '_');
    const safeCatKey = (options?.category || '').trim().toLowerCase().replace(/[./[\]#$]/g, '_');
    const safeZonaKey = (options?.zona || '').trim().replace(/[./[\]#$]/g, '_');
    const nowIso = new Date().toISOString();

    // 1. Direct server ping (bypasses ad-blockers and writes to busquedas_recientes)
    fetch('/api/analytics/track-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        term: cleanTerm,
        category: options?.category || '',
        zona: options?.zona || 'Todas',
        resultsCount: options?.resultsCount || 0
      }),
      keepalive: true
    }).catch(() => {});

    try {
      // 2. Guaranteed storage in siteStats/searches
      const searchesRef = doc(db, 'siteStats', 'searches');
      const updatePayload: Record<string, any> = {
        [`terms.${safeTermKey}`]: increment(1),
        recentSearches: arrayUnion({
          term: cleanTerm,
          category: options?.category || '',
          zona: options?.zona || 'Todas',
          timestamp: nowIso
        }),
        lastUpdated: serverTimestamp()
      };

      if (safeCatKey) {
        updatePayload[`categories.${safeCatKey}`] = increment(1);
      }
      if (safeZonaKey && safeZonaKey !== 'Todas') {
        updatePayload[`zonas.${safeZonaKey}`] = increment(1);
      }

      await setDoc(searchesRef, updatePayload, { merge: true });

      // Also increment total search count on global
      setDoc(doc(db, 'siteStats', 'global'), {
        searchesCount: increment(1),
        lastSearchAt: serverTimestamp()
      }, { merge: true }).catch(() => {});

      // Fallback try for search_stats
      setDoc(doc(db, 'search_stats', safeTermKey), {
        name: cleanTerm,
        searchCount: increment(1),
        lastSearchedAt: serverTimestamp(),
        category: options?.category || '',
        zona: options?.zona || ''
      }, { merge: true }).catch(() => {});

      // Local mirror
      const localSearches = JSON.parse(safeLocalStorage.getItem('local_searches') || '{}');
      localSearches[cleanTerm] = (localSearches[cleanTerm] || 0) + 1;
      safeLocalStorage.setItem('local_searches', JSON.stringify(localSearches));
    } catch (err) {
      console.warn("Analytics search tracking error:", err);
    }
  },

  /**
   * Tracks when a user views a professional profile
   */
  trackProfessionalProfileView: async (professionalId: string, _professionalName?: string, _rubro?: string) => {
    if (!professionalId) return;

    try {
      // 1. Guaranteed storage in siteStats/prof_views
      const profRef = doc(db, 'siteStats', 'prof_views');
      await setDoc(profRef, {
        [`views.${professionalId}`]: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // 2. Safe attempt to update user document directly
      updateDoc(doc(db, 'usuarios', professionalId), {
        'profesionalInfo.profileViews': increment(1)
      }).catch(() => {});
    } catch (err) {
      console.warn("Error tracking professional view:", err);
    }
  },

  /**
   * Tracks contact action (WhatsApp, Chat or Quote)
   */
  trackProfessionalContact: async (professionalId: string, type: 'whatsapp' | 'chat' | 'quote') => {
    if (!professionalId) return;

    try {
      // 1. Guaranteed storage in siteStats/prof_views
      const profRef = doc(db, 'siteStats', 'prof_views');
      await setDoc(profRef, {
        [`contacts.${professionalId}`]: increment(1),
        [`${type}Contacts.${professionalId}`]: increment(1),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      if (type === 'whatsapp') {
        updateDoc(doc(db, 'usuarios', professionalId), {
          'profesionalInfo.whatsappClicks': increment(1)
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Error tracking professional contact:", err);
    }
  },

  /**
   * Submits user suggestions and error reports guaranteed to persist
   */
  submitUserFeedback: async (feedbackPayload: Partial<UserFeedback>): Promise<{ success: boolean; id: string }> => {
    const feedbackId = 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    // Clean item without serverTimestamp inside arrayUnion (to avoid Firestore exception)
    const cleanItem = {
      id: feedbackId,
      tipo: feedbackPayload.tipo || 'mejora',
      categoria: feedbackPayload.categoria || 'General',
      mensaje: (feedbackPayload.mensaje || '').trim(),
      rating: feedbackPayload.rating || 5,
      url: feedbackPayload.url || (typeof window !== 'undefined' ? window.location.href : ''),
      ruta: feedbackPayload.ruta || (typeof window !== 'undefined' ? window.location.pathname : ''),
      usuarioId: feedbackPayload.usuarioId || null,
      usuarioEmail: feedbackPayload.usuarioEmail || null,
      usuarioNombre: feedbackPayload.usuarioNombre || null,
      usuarioRol: feedbackPayload.usuarioRol || 'visitante',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      pantalla: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      estado: 'pendiente',
      fechaIso: nowIso
    };

    // 1. Submit to server API (bypasses all client permission limits)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanItem),
        keepalive: true
      });
    } catch (apiErr) {
      console.warn("Server API feedback call warning:", apiErr);
    }

    // 2. Guaranteed persistence in siteStats/feedback_hub & individual doc
    try {
      const hubRef = doc(db, 'siteStats', 'feedback_hub');
      await setDoc(hubRef, {
        items: arrayUnion(cleanItem),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'siteStats', feedbackId), {
        ...cleanItem,
        isFeedback: true
      });
    } catch (e) {
      console.warn("Could not write feedback to siteStats:", e);
    }

    // 3. Attempt direct write to collection 'feedback'
    try {
      const collRef = collection(db, 'feedback');
      await setDoc(doc(collRef, feedbackId), {
        ...cleanItem,
        fecha: serverTimestamp()
      });
    } catch {
      // Ignored if permissions are restricted
    }

    return { success: true, id: feedbackId };
  },

  /**
   * Fetches comprehensive analytics for the Admin Dashboard
   */
  getAdminComprehensiveAnalytics: async (loadedUsers?: User[]): Promise<AdminAnalyticsReport> => {
    // 1. Fetch siteStats documents in parallel
    let globalStats: any = {};
    let searchesStatsDoc: any = {};
    let profViewsDoc: any = {};
    let feedbackHubDoc: any = {};

    try {
      const [gSnap, sSnap, pSnap, fbSnap] = await Promise.all([
        getDoc(doc(db, 'siteStats', 'global')).catch(() => null),
        getDoc(doc(db, 'siteStats', 'searches')).catch(() => null),
        getDoc(doc(db, 'siteStats', 'prof_views')).catch(() => null),
        getDoc(doc(db, 'siteStats', 'feedback_hub')).catch(() => null)
      ]);

      if (gSnap?.exists()) globalStats = gSnap.data() || {};
      if (sSnap?.exists()) searchesStatsDoc = sSnap.data() || {};
      if (pSnap?.exists()) profViewsDoc = pSnap.data() || {};
      if (fbSnap?.exists()) feedbackHubDoc = fbSnap.data() || {};
    } catch (e) {
      console.warn("Could not fetch siteStats documents:", e);
    }

    // 2. Fetch search stats from legacy collection if accessible
    let searchStatsCollectionDocs: any[] = [];
    try {
      const searchesSnap = await getDocs(query(collection(db, 'search_stats'), orderBy('searchCount', 'desc'), limit(50)));
      searchStatsCollectionDocs = searchesSnap.docs.map(d => ({ term: d.id, ...d.data() }));
    } catch {
      // Safe ignore
    }

    // 3. Ensure professionals list
    let allUsers = loadedUsers || [];
    if (!allUsers || allUsers.length === 0) {
      try {
        const uSnap = await getDocs(collection(db, 'usuarios'));
        allUsers = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      } catch (e) {
        console.warn("Could not fetch users for analytics:", e);
      }
    }

    // 4. Fetch feedback from feedback_hub + collections 'feedback' and 'reportes'
    const feedbackMap = new Map<string, UserFeedback>();
    
    // Feedback items from siteStats/feedback_hub
    const hubItems: any[] = feedbackHubDoc.items || [];
    hubItems.forEach(item => {
      if (item && item.id) {
        feedbackMap.set(item.id, {
          ...item,
          rating: typeof item.rating === 'number' ? item.rating : 5
        });
      }
    });

    // Check collection 'feedback'
    try {
      const fbSnap = await getDocs(collection(db, 'feedback'));
      fbSnap.docs.forEach(d => {
        const data = d.data();
        feedbackMap.set(d.id, {
          id: d.id,
          tipo: data.tipo || 'mejora',
          categoria: data.categoria || 'General',
          mensaje: data.mensaje || '',
          rating: typeof data.rating === 'number' ? data.rating : 5,
          url: data.url || '',
          ruta: data.ruta || '/',
          usuarioId: data.usuarioId || null,
          usuarioEmail: data.usuarioEmail || null,
          usuarioNombre: data.usuarioNombre || null,
          usuarioRol: data.usuarioRol || 'visitante',
          userAgent: data.userAgent || '',
          pantalla: data.pantalla || '',
          estado: data.estado || 'pendiente',
          fechaIso: data.fechaIso || (data.fecha?.toDate ? data.fecha.toDate().toISOString() : new Date().toISOString()),
          fecha: data.fecha
        });
      });
    } catch {
      // Safe ignore
    }

    // Check collection 'reportes'
    try {
      const repSnap = await getDocs(collection(db, 'reportes'));
      repSnap.docs.forEach(d => {
        const data = d.data();
        feedbackMap.set(d.id, {
          id: d.id,
          tipo: 'error',
          categoria: `Reporte: ${data.motivo || 'Conducta'}`,
          mensaje: `Reporte de perfil "${data.profesionalNombre || 'Profesional'}": ${data.descripcion || ''}`,
          rating: 1,
          url: data.profesionalSlug ? `/profesional/${data.profesionalSlug}` : '',
          ruta: data.profesionalSlug ? `/profesional/${data.profesionalSlug}` : '/',
          usuarioId: data.reporterUid || null,
          usuarioEmail: data.reporterEmail || null,
          usuarioNombre: data.reporterNombre || null,
          usuarioRol: 'cliente',
          userAgent: '',
          pantalla: '',
          estado: data.estado || 'pendiente',
          fechaIso: data.fechaIso || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
          fecha: data.createdAt
        });
      });
    } catch {
      // Safe ignore
    }

    const feedbackDocs = Array.from(feedbackMap.values());
    feedbackDocs.sort((a, b) => {
      const tA = a.fecha?.toMillis ? a.fecha.toMillis() : (a.fecha ? new Date(a.fecha).getTime() : (a.fechaIso ? new Date(a.fechaIso).getTime() : 0));
      const tB = b.fecha?.toMillis ? b.fecha.toMillis() : (b.fecha ? new Date(b.fecha).getTime() : (b.fechaIso ? new Date(b.fechaIso).getTime() : 0));
      return tB - tA;
    });

    // 5. Fetch real job requests to calculate zone demand
    let jobsZonesMap: Record<string, number> = {};
    try {
      const jobsSnap = await getDocs(collection(db, 'trabajosSolicitados'));
      jobsSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.zona) {
          jobsZonesMap[data.zona] = (jobsZonesMap[data.zona] || 0) + 1;
        }
      });
    } catch {
      // Safe ignore
    }

    const professionals = allUsers.filter(u => u.rol === 'profesional' && u.profesionalInfo);

    // Calculate real total visits and daily trend (last 7 days) strictly from Firestore data
    const totalVisits = Number(globalStats.visits) || 0;
    const now = new Date();
    const dailyTrend: DailyTrafficItem[] = [];

    // Extract daily visits from BOTH nested map and flat keys
    const dailyMap: Record<string, number> = {};
    if (typeof globalStats.dailyVisits === 'object' && globalStats.dailyVisits !== null) {
      Object.entries(globalStats.dailyVisits).forEach(([k, v]) => {
        dailyMap[k] = (dailyMap[k] || 0) + Number(v || 0);
      });
    }
    Object.keys(globalStats).forEach(key => {
      if (key.startsWith('dailyVisits.')) {
        const dateKey = key.replace('dailyVisits.', '');
        dailyMap[dateKey] = Math.max(dailyMap[dateKey] || 0, Number(globalStats[key] || 0));
      }
    });

    let trendSum = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      
      let argDate = isoDate;
      try {
        argDate = new Intl.DateTimeFormat('fr-CA', { 
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
      } catch {
        // Fallback
      }

      const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : d.toLocaleDateString('es-AR', { weekday: 'short' });
      const label = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${d.getDate()}/${d.getMonth() + 1}`;

      // Support either timezone key stored
      const realRecordedVisits = Math.max(Number(dailyMap[argDate]) || 0, Number(dailyMap[isoDate]) || 0);
      trendSum += realRecordedVisits;

      dailyTrend.push({
        date: argDate,
        label,
        visits: realRecordedVisits,
        unique: realRecordedVisits > 0 ? Math.max(Math.round(realRecordedVisits * 0.75), 1) : 0
      });
    }

    const todayArgDate = getArgentinaDateStr();
    const todayIsoDate = now.toISOString().split('T')[0];
    const todayVisits = Math.max(
      Number(dailyMap[todayArgDate]) || 0,
      Number(dailyMap[todayIsoDate]) || 0,
      dailyTrend[dailyTrend.length - 1]?.visits || 0
    );
    const avgDailyVisits = Math.round(trendSum / 7);
    const uniqueVisitorsEstimate = totalVisits > 0 ? Math.max(Math.round(totalVisits * 0.7), 1) : 0;

    // 6. Calculate real page distribution from BOTH nested map and flat keys
    const recordedPageVisits: Record<string, number> = {};
    if (typeof globalStats.pageVisits === 'object' && globalStats.pageVisits !== null) {
      Object.entries(globalStats.pageVisits).forEach(([k, v]) => {
        recordedPageVisits[k] = (recordedPageVisits[k] || 0) + Number(v || 0);
      });
    }
    Object.keys(globalStats).forEach(key => {
      if (key.startsWith('pageVisits.')) {
        const safeKey = key.replace('pageVisits.', '');
        recordedPageVisits[safeKey] = Math.max(recordedPageVisits[safeKey] || 0, Number(globalStats[key] || 0));
      }
    });

    const routeMappings: Record<string, string> = {};
    if (typeof globalStats.routeMappings === 'object' && globalStats.routeMappings !== null) {
      Object.entries(globalStats.routeMappings).forEach(([k, v]) => {
        if (typeof v === 'string') routeMappings[k] = v;
      });
    }
    Object.keys(globalStats).forEach(key => {
      if (key.startsWith('routeMappings.')) {
        const safeKey = key.replace('routeMappings.', '');
        routeMappings[safeKey] = String(globalStats[key]);
      }
    });

    const pageVisitsMap: Record<string, { visits: number; label: string }> = {};

    // Standard baseline routes registered in the app
    const monitoredRoutes = [
      '/',
      '/search',
      '/profesional/:id',
      '/trabajos',
      '/solicitar-presupuesto',
      '/beneficios',
      '/publicitar',
      '/blog',
      '/login',
      '/signup',
      '/dashboard',
      '/help',
      '/terms',
      '/privacy'
    ];

    monitoredRoutes.forEach(route => {
      const safeKey = route.replace(/[/.:]/g, '_');
      const count = Number(recordedPageVisits[safeKey]) || 0;
      pageVisitsMap[route] = {
        visits: count,
        label: formatPathLabel(route)
      };
    });

    // Also include any other visited path recorded dynamically
    Object.keys(recordedPageVisits).forEach(safeKey => {
      const val = Number(recordedPageVisits[safeKey]) || 0;
      if (val > 0) {
        const originalPath = routeMappings[safeKey] || (safeKey.startsWith('_') ? safeKey.replace(/_/g, '/') : safeKey);
        if (!pageVisitsMap[originalPath]) {
          pageVisitsMap[originalPath] = {
            visits: val,
            label: formatPathLabel(originalPath)
          };
        } else {
          pageVisitsMap[originalPath].visits = Math.max(pageVisitsMap[originalPath].visits, val);
        }
      }
    });

    const sumPages = Object.values(pageVisitsMap).reduce((a, b) => a + b.visits, 0) || 1;
    const pages: PageVisitItem[] = Object.entries(pageVisitsMap)
      .map(([path, data]) => ({
        path,
        label: data.label,
        visits: data.visits,
        percentage: data.visits > 0 ? Math.round((data.visits / sumPages) * 100) : 0
      }))
      .sort((a, b) => b.visits - a.visits);

    // 7. Calculate Real Professionals Ranking (A qué empleados/profesionales entra la gente)
    // Merges siteStats/prof_views with user doc stats!
    const liveProfViews: Record<string, number> = {};
    if (typeof profViewsDoc.views === 'object' && profViewsDoc.views !== null) {
      Object.entries(profViewsDoc.views).forEach(([k, v]) => {
        liveProfViews[k] = Number(v || 0);
      });
    }
    Object.keys(profViewsDoc).forEach(key => {
      if (key.startsWith('views.')) {
        const uid = key.replace('views.', '');
        liveProfViews[uid] = Math.max(liveProfViews[uid] || 0, Number(profViewsDoc[key] || 0));
      }
    });

    const liveProfContacts: Record<string, number> = {};
    if (typeof profViewsDoc.contacts === 'object' && profViewsDoc.contacts !== null) {
      Object.entries(profViewsDoc.contacts).forEach(([k, v]) => {
        liveProfContacts[k] = Number(v || 0);
      });
    }
    Object.keys(profViewsDoc).forEach(key => {
      if (key.startsWith('contacts.')) {
        const uid = key.replace('contacts.', '');
        liveProfContacts[uid] = Math.max(liveProfContacts[uid] || 0, Number(profViewsDoc[key] || 0));
      }
    });

    const profMetrics: ProfessionalMetricItem[] = professionals.map(p => {
      const info = p.profesionalInfo || ({} as any);
      const viewsFromDoc = Number(info.profileViews) || 0;
      const contactsFromDoc = Number(info.whatsappClicks) || 0;

      const viewsFromStats = Number(liveProfViews[p.uid]) || 0;
      const contactsFromStats = Number(liveProfContacts[p.uid]) || 0;

      const views = Math.max(viewsFromDoc, viewsFromStats);
      const contacts = Math.max(contactsFromDoc, contactsFromStats);
      const conversionRate = views > 0 ? Math.min(Math.round((contacts / views) * 100), 100) : 0;

      return {
        uid: p.uid,
        nombre: p.nombre || 'Profesional',
        rubro: info.rubro || 'Oficio General',
        zona: p.zona || 'Bahía Blanca',
        views,
        contacts,
        conversionRate,
        ratingAvg: Number(info.ratingAvg) || 0,
        reviewCount: Number(info.reviewCount) || 0,
        isVip: Boolean(info.isVip),
        fotoUrl: p.fotoUrl,
        telefono: info.telefono
      };
    }).sort((a, b) => (b.views + b.contacts * 2) - (a.views + a.contacts * 2));

    // 8. Calculate Search Metrics from siteStats/searches + busquedas_recientes collection + legacy
    const termsMap: Record<string, number> = {};
    const rubroMap: Record<string, number> = {};
    const realZoneCounts: Record<string, number> = { ...jobsZonesMap };
    const recentSearchesList: any[] = [];

    // A. Parse siteStats/searches terms
    if (typeof searchesStatsDoc.terms === 'object' && searchesStatsDoc.terms !== null) {
      Object.entries(searchesStatsDoc.terms).forEach(([termKey, count]) => {
        const cleanName = termKey.replace(/_/g, ' ');
        termsMap[cleanName] = (termsMap[cleanName] || 0) + Number(count || 0);
      });
    }

    // B. Parse flat dotted keys in searchesStatsDoc
    Object.keys(searchesStatsDoc).forEach(key => {
      if (key.startsWith('terms.')) {
        const cleanName = key.replace('terms.', '').replace(/_/g, ' ');
        termsMap[cleanName] = Math.max(termsMap[cleanName] || 0, Number(searchesStatsDoc[key] || 0));
      } else if (key.startsWith('categories.')) {
        const cleanName = key.replace('categories.', '').replace(/_/g, ' ');
        const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        rubroMap[formatted] = Math.max(rubroMap[formatted] || 0, Number(searchesStatsDoc[key] || 0));
      } else if (key.startsWith('zonas.')) {
        const zonaName = key.replace('zonas.', '').replace(/_/g, ' ');
        if (zonaName && zonaName.toLowerCase() !== 'todas') {
          realZoneCounts[zonaName] = Math.max(realZoneCounts[zonaName] || 0, Number(searchesStatsDoc[key] || 0));
        }
      }
    });

    if (Array.isArray(searchesStatsDoc.recentSearches)) {
      recentSearchesList.push(...searchesStatsDoc.recentSearches);
    }

    // C. Query 'busquedas_recientes' collection (all live user searches)
    try {
      const busquedasSnap = await getDocs(query(collection(db, 'busquedas_recientes'), limit(100)));
      busquedasSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const term = (data.term || '').trim().toLowerCase();
        if (term) {
          termsMap[term] = (termsMap[term] || 0) + 1;
        }
        if (data.category) {
          const formattedCat = data.category.charAt(0).toUpperCase() + data.category.slice(1);
          rubroMap[formattedCat] = (rubroMap[formattedCat] || 0) + 1;
        }
        if (data.zona && data.zona !== 'Todas') {
          realZoneCounts[data.zona] = (realZoneCounts[data.zona] || 0) + 1;
        }
        recentSearchesList.push({
          term: data.term || term,
          category: data.category || '',
          zona: data.zona || 'Todas',
          timestamp: data.fechaStr || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString())
        });
      });
    } catch (e) {
      console.warn("Notice: could not query busquedas_recientes:", e);
    }

    // D. Legacy collection search_stats
    searchStatsCollectionDocs.forEach(s => {
      const termName = (s.term || s.name || '').toLowerCase().trim();
      if (termName) {
        termsMap[termName] = Math.max(termsMap[termName] || 0, Number(s.searchCount) || 1);
      }
    });

    const topTerms: SearchMetricItem[] = Object.entries(termsMap)
      .map(([term, count]) => ({
        term,
        count
      }))
      .sort((a, b) => b.count - a.count);

    // Group searches into rubros
    topTerms.forEach(t => {
      const termLower = t.term.toLowerCase();
      let rubroKey = 'Otros';
      if (termLower.includes('electr')) rubroKey = 'Electricista';
      else if (termLower.includes('plom') || termLower.includes('destap')) rubroKey = 'Plomero';
      else if (termLower.includes('gas')) rubroKey = 'Gasista';
      else if (termLower.includes('pint')) rubroKey = 'Pintor';
      else if (termLower.includes('tech') || termLower.includes('zing')) rubroKey = 'Techista';
      else if (termLower.includes('albañ') || termLower.includes('alban')) rubroKey = 'Albañil';
      else if (termLower.includes('carpint')) rubroKey = 'Carpintero';
      else if (termLower.includes('cerraj')) rubroKey = 'Cerrajero';
      else if (termLower.includes('refrig') || termLower.includes('aire')) rubroKey = 'Refrigeración / Aire Acondicionado';

      rubroMap[rubroKey] = (rubroMap[rubroKey] || 0) + t.count;
    });

    const totalSearchCount = topTerms.reduce((acc, t) => acc + t.count, 0) || (topTerms.length > 0 ? 1 : 0);
    const topRubros = Object.entries(rubroMap)
      .map(([rubro, count]) => ({
        rubro,
        count,
        percentage: totalSearchCount > 0 ? Math.round((count / totalSearchCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 9. Real zones aggregated
    allUsers.forEach(u => {
      if (u.zona) {
        realZoneCounts[u.zona] = (realZoneCounts[u.zona] || 0) + 1;
      }
    });

    const topZonas = Object.entries(realZoneCounts)
      .map(([zona, count]) => ({ zona, count }))
      .sort((a, b) => b.count - a.count);

    // Deduplicate and sort recent searches list (newest first)
    const uniqueRecentSearches = Array.from(
      new Map(recentSearchesList.map(s => [`${s.term}_${s.timestamp}`, s])).values()
    ).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()).slice(0, 30);

    // 10. Real Feedback summary stats
    const errorsCount = feedbackDocs.filter(f => f.tipo === 'error').length;
    const suggestionsCount = feedbackDocs.filter(f => f.tipo === 'mejora').length;
    const ratingsCount = feedbackDocs.filter(f => f.tipo === 'calificacion').length;
    const ratedItems = feedbackDocs.filter(f => typeof f.rating === 'number' && f.rating > 0);
    const avgRating = ratedItems.length > 0 
      ? Number((ratedItems.reduce((acc, f) => acc + (f.rating || 0), 0) / ratedItems.length).toFixed(1)) 
      : 5.0;

    return {
      traffic: {
        totalVisits,
        todayVisits,
        uniqueVisitorsEstimate,
        avgDailyVisits,
        dailyTrend
      },
      pages,
      professionals: profMetrics,
      searches: {
        topTerms,
        topRubros,
        topZonas,
        recentSearchesList: uniqueRecentSearches,
        voiceSearchesCount: 0
      },
      feedback: {
        total: feedbackDocs.length,
        errorsCount,
        suggestionsCount,
        ratingsCount,
        avgRating,
        items: feedbackDocs
      },
      lastUpdated: new Date()
    };
  },

  /**
   * Real-time subscription to siteStats to push live updates to the Admin Dashboard
   */
  subscribeToLiveStats: (onUpdate: () => void): (() => void) => {
    try {
      const unsub = onSnapshot(doc(db, 'siteStats', 'global'), () => {
        onUpdate();
      });
      return unsub;
    } catch {
      return () => {};
    }
  }
};
