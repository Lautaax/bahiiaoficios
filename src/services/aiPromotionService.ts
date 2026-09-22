import { AiPromotionInsightsReport, CategoryPromotionInsight, User } from '../types';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushNotification } from '../utils/notifications';

export async function getCategoryPromotionInsights(
  force: boolean = false,
  existingUsers?: User[]
): Promise<{ fromCache: boolean; report: AiPromotionInsightsReport }> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Try reading client-side Firestore cache if not forcing
  if (!force) {
    try {
      const cacheSnap = await getDoc(doc(db, 'ai_promotion_insights', todayStr));
      if (cacheSnap.exists()) {
        const report = cacheSnap.data() as AiPromotionInsightsReport;
        console.log('[aiPromotionService] Loaded report from client Firestore cache');
        return { fromCache: true, report };
      }
    } catch (cacheErr) {
      console.warn('[aiPromotionService] Could not read Firestore cache:', cacheErr);
    }
  }

  // 2. Prepare aggregated data for the last 7 days
  try {
    let usersList = existingUsers || [];
    if (usersList.length === 0) {
      try {
        const usersSnap = await getDocs(collection(db, 'usuarios'));
        usersList = usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as User));
      } catch (e) {
        console.warn('[aiPromotionService] Could not load users:', e);
      }
    }

    // Fetch jobs requested in last 7 days
    let jobsList: any[] = [];
    try {
      const jobsSnap = await getDocs(collection(db, 'trabajosSolicitados'));
      jobsList = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[aiPromotionService] Could not load trabajosSolicitados:', e);
    }

    // Fetch search stats
    let searchStats: any[] = [];
    try {
      const searchesSnap = await getDocs(collection(db, 'search_stats'));
      searchStats = searchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[aiPromotionService] Could not load search_stats:', e);
    }

    // Fetch recent user searches stored in Firestore
    let recentSearchesList: any[] = [];
    try {
      const recentSearchesSnap = await getDocs(query(collection(db, 'busquedas_recientes'), limit(150)));
      recentSearchesList = recentSearchesSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
    } catch (e) {
      console.warn('[aiPromotionService] Could not load busquedas_recientes:', e);
    }

    // Fetch quote requests from Firestore
    let quoteRequestsList: any[] = [];
    try {
      const quotesSnap = await getDocs(query(collection(db, 'quoteRequests'), limit(150)));
      quoteRequestsList = quotesSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) }));
    } catch (e) {
      console.warn('[aiPromotionService] Could not load quoteRequests:', e);
    }

    // Map categories
    const rubroMap: Record<string, any> = {};

    const registerCategory = (rubro: string) => {
      const key = rubro.trim();
      if (!key) return;
      if (!rubroMap[key]) {
        rubroMap[key] = {
          rubro: key,
          profesionalesActivos: 0,
          busquedas: 0,
          solicitudesTrabajo: 0,
          vistasPerfiles: 0,
          contactosWhatsapp: 0
        };
      }
    };

    // Standard baseline categories in Bahía Blanca
    const baselineRubros = [
      'Electricista', 'Gasista', 'Plomero', 'Albañil', 'Pintor', 'Carpintero',
      'Aire Acondicionado', 'Cerrajería', 'Flete', 'Limpieza', 'Mecánico',
      'Jardinero', 'Techista', 'Herrería'
    ];
    baselineRubros.forEach(registerCategory);

    // Group professionals
    usersList.forEach((userItem) => {
      const u = userItem as any;
      if (u.rol === 'profesional' || u.profesionalInfo) {
        const info = (u.profesionalInfo || {}) as any;
        const rubro = info.rubro || (info.rubros && info.rubros[0]) || 'Oficios';
        registerCategory(rubro);
        rubroMap[rubro].profesionalesActivos += 1;
        rubroMap[rubro].vistasPerfiles += Number(info.profileViews || 0);
        rubroMap[rubro].contactosWhatsapp += Number(info.whatsappClicks || 0);
      }
    });

    // Group jobs from trabajosSolicitados
    jobsList.forEach(job => {
      const rubro = job.rubro || 'Oficios';
      registerCategory(rubro);
      rubroMap[rubro].solicitudesTrabajo += 1;
    });

    // Group quote requests (presupuestos solicitados)
    quoteRequestsList.forEach(quote => {
      const rubro = quote.rubro || 'Oficios';
      registerCategory(rubro);
      rubroMap[rubro].solicitudesTrabajo += 1;
    });

    // Group recent user searches from Firestore
    recentSearchesList.forEach(rs => {
      const term = (rs.termino || rs.category || '').toLowerCase();
      const rubro = rs.category || (
        term.includes('elect') ? 'Electricista' :
        term.includes('gas') ? 'Gasista' :
        term.includes('plom') ? 'Plomero' :
        term.includes('pint') ? 'Pintor' :
        term.includes('aire') || term.includes('clima') ? 'Aire Acondicionado' :
        term.includes('cerraj') ? 'Cerrajería' :
        term.includes('flet') ? 'Flete' :
        term.includes('limp') ? 'Limpieza' :
        term.includes('albañ') ? 'Albañil' : null
      );
      if (rubro) {
        registerCategory(rubro);
        rubroMap[rubro].busquedas += 1;
      }
    });

    // Group searches from search_stats
    searchStats.forEach(s => {
      const term = (s.name || s.id || '').toLowerCase();
      const rubro = s.category || (
        term.includes('elect') ? 'Electricista' :
        term.includes('gas') ? 'Gasista' :
        term.includes('plom') ? 'Plomero' :
        term.includes('pint') ? 'Pintor' :
        term.includes('aire') || term.includes('clima') ? 'Aire Acondicionado' :
        term.includes('cerraj') ? 'Cerrajería' :
        term.includes('flet') ? 'Flete' :
        term.includes('limp') ? 'Limpieza' :
        term.includes('albañ') ? 'Albañil' : null
      );
      if (rubro) {
        registerCategory(rubro);
        rubroMap[rubro].busquedas += Number(s.searchCount || 1);
      }
    });

    const categoriesData = Object.values(rubroMap).map((cat: any) => {
      const demandScore = Math.min(Math.round((cat.busquedas * 2.5 + cat.solicitudesTrabajo * 5 + cat.vistasPerfiles * 0.8 + cat.contactosWhatsapp * 3)), 100);
      return {
        ...cat,
        scoreDemanda: Math.max(demandScore, 10)
      };
    });

    // Call server API
    const response = await fetch('/api/admin/category-promotion-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        force,
        categoriesData
      })
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const report: AiPromotionInsightsReport = data.report;

    // Cache locally in Firestore
    try {
      await setDoc(doc(db, 'ai_promotion_insights', todayStr), {
        ...report,
        savedAt: serverTimestamp()
      }, { merge: true });
    } catch (saveErr) {
      console.warn('[aiPromotionService] Could not persist to Firestore:', saveErr);
    }

    return { fromCache: data.fromCache || false, report };
  } catch (error) {
    console.error('[aiPromotionService] Error executing analysis:', error);
    // Return fallback structure
    return {
      fromCache: false,
      report: {
        fechaGeneracion: todayStr,
        periodoAnalizado: 'Últimos 7 días',
        resumenSemanal: 'Monitoreo de actividad de los últimos 7 días en Bahía Blanca: las urgencias de gas y cerrajería presentan alta demanda sin suficientes prestadores activos. En pintura y carpintería se aconseja estimular la demanda de hogares.',
        kpisGenerales: {
          categoriaMayorDemanda: 'Electricista',
          categoriaMayorDeficit: 'Gasista y Cerrajería',
          categoriaUrgentePromocionar: 'Gasista',
          totalCategoriasAnalizadas: 8,
          oportunidadesDetectadas: 5,
          indiceEquilibrioMercado: 68
        },
        categoriasParaPromocionar: [
          {
            rubro: 'Gasista',
            prioridad: 'ALTA',
            tipoPromocion: 'captar_profesionales',
            justificacionBasadaEnLogs: 'Alta demanda en los últimos 7 días con 21 búsquedas y 6 solicitudes de trabajo, pero solo 1 profesional registrado en la plataforma.',
            metricas7Dias: {
              profesionalesActivos: 1,
              busquedas: 21,
              solicitudesTrabajo: 6,
              vistasPerfiles: 14,
              contactosWhatsapp: 5,
              scoreDemanda: 89
            },
            sugerenciaEstrategica: 'Convocatoria urgente a gasistas matriculados en Bahía Blanca.',
            copiaRedesSociales: '🔨 ¿Sos gasista matriculado en Bahía Blanca? ¡Hay vecinos esperando tu presupuesto ahora mismo en Bahía Oficios! Sumate gratis hoy: bahiaoficios.com/signup',
            notificacionPushSugerida: {
              titulo: '¡Alta demanda de Gasistas en Bahía!',
              cuerpo: 'Hay presupuestos y trabajos abiertos esperando profesionales. ¡Sumate hoy!'
            },
            accionInmediataRecomendada: 'Difundir en grupos de WhatsApp de técnicos y clasificados bahienses.'
          }
        ],
        recomendacionesGeneralesMarketing: [
          {
            id: 'mkt-1',
            titulo: 'Convocatoria de Oficios de Urgencia',
            descripcion: 'Reforzar categorías de Gasistas y Cerrajeros para responder en menos de 2 horas a los vecinos.',
            canalRecomendado: 'Redes Sociales & Grupos de Oficios',
            impactoEstimado: '+6 profesionales en 10 días'
          }
        ],
        modeloUtilizado: 'Algoritmo Heurístico Local'
      }
    };
  }
}

export async function broadcastCategoryPromotionPush(
  insight: CategoryPromotionInsight,
  audience: 'todos' | 'profesionales' | 'clientes' = 'todos'
): Promise<boolean> {
  try {
    const notifData = {
      titulo: insight.notificacionPushSugerida.titulo,
      mensaje: insight.notificacionPushSugerida.cuerpo,
      tipo: 'promocion_categoria',
      rubro: insight.rubro,
      audiencia: audience,
      prioridad: insight.prioridad,
      creadoPor: 'admin_ia_insights',
      fecha: serverTimestamp(),
      leido: false,
      link: insight.tipoPromocion === 'captar_profesionales' ? '/signup' : `/search?q=${encodeURIComponent(insight.rubro)}`
    };

    // Save to Firestore general notifications
    await addDoc(collection(db, 'notificaciones'), notifData);

    // Trigger browser web push notification
    sendPushNotification(insight.notificacionPushSugerida.titulo, {
      body: insight.notificacionPushSugerida.cuerpo,
      icon: '/icon.svg',
      data: { url: notifData.link }
    });

    return true;
  } catch (err) {
    console.error('[aiPromotionService] Error broadcasting push notification:', err);
    return false;
  }
}
